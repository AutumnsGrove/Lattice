---
aliases: [BillingHub, billing-hub, grove-billing]
date created: Thursday, March 12th 2026
date modified: Thursday, March 12th 2026
tags:
  - billing
  - stripe
  - payments
  - infrastructure
type: tech-spec
---

```
              ╭─────────────────────────╮
             ╱                           ╲
            ╱    ┌───┐ ┌───┐ ┌───┐       ╲
           │     │ $ │ │ $ │ │ $ │         │
           │     └─┬─┘ └─┬─┘ └─┬─┘         │
           │       │     │     │             │
           │       ▼     ▼     ▼             │
           │     ╭───────────────╮           │
           │     │   ░░░░░░░░   │           │
           │     │   ░ root ░   │           │
           │     │   ░░░░░░░░   │           │
            ╲    ╰───────────────╯          ╱
             ╲                             ╱
              ╰─────────────────────────╰

       every branch drinks from the same water
```

# BillingHub: Centralized Payment Infrastructure

> *Every branch drinks from the same water.*

BillingHub is the single point of contact for all payment operations across Grove. Two workers, one purpose: accept money, manage subscriptions, and keep everything in one place where it can be debugged, audited, and trusted.

**Public Name:** BillingHub
**Internal Name:** GroveBilling
**Domain:** `billing.grove.place`
**Service Binding:** `BILLING`
**Last Updated:** March 2026

In an aspen grove, water and nutrients flow through a shared root system. Every trunk, no matter how far from the center, drinks from the same underground network. BillingHub is that root system for payments. Today, Stripe calls scatter across Plant, Engine, Arbor, and the upgrades graft. Four places to debug, four places for things to break. BillingHub consolidates everything into a single root, so every payment flows through one path.

---

## Overview

### What This Is

BillingHub replaces all scattered payment code with two Cloudflare Workers that follow the exact architecture of the login hub (`login.grove.place` + `groveauth`). A SvelteKit UI worker at `billing.grove.place` handles the public-facing checkout and billing portal pages. A Hono API worker (`grove-billing-api`) handles all Stripe business logic via service binding, never exposed to the public internet. Any app that needs payment functionality redirects to `billing.grove.place` and gets redirected back when done.

### Goals

- One Stripe secret key, one webhook endpoint, one place to debug
- Every app (Plant, Arbor, any future property) redirects to `billing.grove.place` for payment actions
- Graft UI components (GardenModal, GrowthCard) stay embedded in engine, only action buttons redirect
- Follow the login hub pattern: SvelteKit UI worker + Hono backend worker + `buildCheckoutUrl()` helper
- Close #1357 (payment management non-functional) by building it correctly from the start

### Non-Goals (Out of Scope)

- Tenant shop payments (Stripe Connect for selling products). Platform billing only.
- Building a custom payment form. Stripe Checkout and Billing Portal handle the sensitive UI.
- Replacing Warden's read-only Stripe queries. Admin tooling stays separate.

---

## Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│  Any Grove App (Plant, Arbor, Meadow, etc.)                         │
│                                                                      │
│  "Upgrade" button → redirect to billing.grove.place?action=checkout  │
│  "Manage Payment" → redirect to billing.grove.place?action=portal    │
│                                                                      │
│  Uses: buildCheckoutUrl(), buildPortalUrl() from engine config       │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ browser redirect
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│  billing.grove.place (SvelteKit Worker)                              │
│  apps/billing/                                                       │
│  Worker name: grove-billing                                          │
│                                                                      │
│  Routes:                                                             │
│    /                    → Checkout flow (tier selection + redirect)   │
│    /portal              → Billing portal (redirect to Stripe)        │
│    /cancel              → Cancellation confirmation page             │
│    /resume              → Resume confirmation page                   │
│    /callback            → Post-payment redirect handler              │
│    /api/webhooks/stripe → Webhook proxy to billing-api               │
│    /api/health          → Stripe connectivity check                  │
│                                                                      │
│  Bindings:                                                           │
│    BILLING_API = grove-billing-api (service binding)                  │
│    AUTH = groveauth (session validation)                              │
│                                                                      │
│  Secrets: STRIPE_WEBHOOK_SECRET (webhook verification only)           │
│  D1: none (least privilege, like login hub)                          │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ service binding (internal)
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│  grove-billing-api (Hono Worker)                                     │
│  services/billing-api/                                               │
│  Worker name: grove-billing-api                                      │
│                                                                      │
│  Internal endpoints (service binding only):                          │
│    POST /checkout         → Create Stripe Checkout Session           │
│    POST /portal           → Create Stripe Billing Portal Session     │
│    POST /cancel           → Cancel subscription (at period end)      │
│    POST /resume           → Resume cancelled subscription            │
│    GET  /status/:tenantId → Billing status for a tenant              │
│    POST /webhook          → Process verified Stripe webhook payload  │
│                                                                      │
│  Bindings:                                                           │
│    DB = grove-engine-db (D1, platform_billing table)                 │
│    CACHE_KV (rate limiting)                                          │
│    ZEPHYR = grove-zephyr (payment emails)                            │
│                                                                      │
│  Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET                   │
│                                                                      │
│  Placement: smart (co-locate with D1)                                │
└──────────────────────────────────────────────────────────────────────┘
```

### How It Compares to the Login Hub

| Aspect | Login Hub | BillingHub |
|--------|-----------|------------|
| UI Worker | `apps/login/` (SvelteKit Pages) | `apps/billing/` (SvelteKit Worker) |
| Backend Worker | `services/heartwood/` (Hono) | `services/billing-api/` (Hono) |
| Domain | `login.grove.place` | `billing.grove.place` |
| Service binding name | `AUTH` | `BILLING_API` |
| URL builder | `buildLoginUrl(redirect)` | `buildCheckoutUrl(params)`, `buildPortalUrl(redirect)` |
| Config SSOT | `libs/engine/src/lib/config/auth.ts` | `libs/engine/src/lib/config/billing.ts` |
| Secret keys | Google OAuth, JWT keys in Heartwood | Stripe secret in billing-api, webhook secret in both (belt and suspenders) |
| D1 in UI worker | None (least privilege) | None (least privilege) |
| Cookie for redirect | `grove_auth_redirect` | `grove_billing_redirect` |

### Payment Flow: New Signup (Plant)

```
Wanderer picks "Seedling" in Plant
    │
    ▼
Plant calls buildCheckoutUrl({
  tenantId: null,        ← new signup, no tenant yet
  onboardingId: "abc",
  tier: "seedling",
  cycle: "monthly",
  redirect: "https://plant.grove.place/success"
})
    │
    ▼
Browser → billing.grove.place?onboarding=abc&tier=seedling&cycle=monthly
    │
    ▼
billing.grove.place stores redirect in grove_billing_redirect cookie
    │
    ▼
billing.grove.place → BILLING_API /checkout (service binding)
    │
    ▼
billing-api creates Stripe Checkout Session
    │ metadata: { onboardingId, tier, cycle, type: "new_signup" }
    │ success_url: billing.grove.place/callback?session_id={id}
    │ cancel_url: billing.grove.place/callback?cancelled=true
    │
    ▼
Browser redirected to Stripe Checkout (hosted page)
    │
    ▼ (user pays)
    │
    ├─── Stripe fires webhook ──→ billing.grove.place/api/webhooks/stripe
    │                                    │
    │                                    ▼ (proxied via service binding)
    │                              billing-api /webhook
    │                                    │
    │                                    ▼
    │                              Creates tenant (for new signups)
    │                              Updates platform_billing
    │                              Sends receipt email via Zephyr
    │
    ▼
Browser → billing.grove.place/callback?session_id=cs_xxx
    │
    ▼
billing.grove.place reads grove_billing_redirect cookie
    │
    ▼
Browser → plant.grove.place/success (original redirect)
```

### Payment Flow: Existing Tenant Upgrade (Arbor)

```
Wanderer clicks "Cultivate" in GardenModal (Arbor)
    │
    ▼
Graft calls buildCheckoutUrl({
  tenantId: "tenant-123",
  tier: "oak",
  cycle: "yearly",
  redirect: "https://mysite.grove.place/arbor/account"
})
    │
    ▼
Browser → billing.grove.place?tenant=tenant-123&tier=oak&cycle=yearly
    │
    ▼
billing.grove.place validates session (AUTH service binding)
billing.grove.place stores redirect in cookie
    │
    ▼
billing.grove.place → BILLING_API /checkout (with tenantId + tier)
    │
    ▼
billing-api looks up provider_customer_id from platform_billing
billing-api creates Stripe Checkout Session (subscription mode, proration)
    │
    ▼
Browser → Stripe Checkout → callback → redirect back to Arbor
```

### Payment Flow: Manage Billing (Arbor)

```
Wanderer clicks "Tend Garden" in Arbor account page
    │
    ▼
buildPortalUrl("https://mysite.grove.place/arbor/account")
    │
    ▼
Browser → billing.grove.place/portal?redirect=...
    │
    ▼
billing.grove.place validates session
billing.grove.place → BILLING_API /portal (tenantId from session)
    │
    ▼
billing-api creates Stripe Billing Portal session
    │ return_url: billing.grove.place/callback
    │
    ▼
Browser → Stripe Billing Portal (hosted page)
    │ (user updates card, cancels, etc.)
    │
    ▼
Browser → billing.grove.place/callback → redirect back to Arbor
```

### Payment Flow: Cancel Subscription (Arbor)

```
Wanderer clicks "Cancel" in Arbor SubscriptionCard
    │
    ▼
buildCancelUrl("https://mysite.grove.place/arbor/account")
    │
    ▼
Browser → billing.grove.place/cancel?redirect=...
    │
    ▼
billing.grove.place validates session
billing.grove.place fetches current billing status from BILLING_API
    │
    ▼
billing.grove.place renders confirmation page:
    "Your Seedling plan will remain active until April 12, 2026.
     After that, your grove becomes private. Nothing is deleted."
    │
    [ Keep My Plan ]   [ Cancel Subscription ]
    │                          │
    ▼                          ▼
redirect back             billing.grove.place → BILLING_API /cancel
                               │
                               ▼
                          billing-api cancels via Stripe API
                          updates platform_billing
                          sends cancellation email via Zephyr
                               │
                               ▼
                          redirect back to Arbor with ?cancelled=true
```

Resume follows the same pattern at `/resume` with a confirmation step.

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| UI Worker | SvelteKit + `@sveltejs/adapter-cloudflare` | Same stack as all Grove apps. Worker deployment (not Pages) per user preference. |
| API Worker | Hono | Same as Heartwood. Lightweight, typed, edge-native. |
| Payment Provider | Stripe (raw fetch, no SDK) | Edge-compatible. Existing `StripeClient` and `StripeProvider` from `libs/engine/src/lib/payments/`. |
| Database | D1 (`grove-engine-db`) | Existing `platform_billing` and `webhook_events` tables. |
| Rate Limiting | Threshold SDK (KV-backed) | Existing pattern from billing and graft endpoints. |
| Emails | Zephyr (service binding) | Payment receipt, failure, and cancellation emails. |
| Session Validation | Heartwood (AUTH service binding) | Same cross-subdomain auth as every Grove app. |

---

## API Reference (billing-api, Internal Only)

All endpoints are called via service binding from `billing.grove.place`. They are never exposed to the public internet.

### POST /checkout

Create a Stripe Checkout Session for new signups or upgrades.

**Request:**
```json
{
  "tenantId": "tenant-123",
  "onboardingId": "onb-456",
  "tier": "seedling",
  "billingCycle": "monthly",
  "customerEmail": "robin@grove.place",
  "successUrl": "https://billing.grove.place/callback",
  "cancelUrl": "https://billing.grove.place/callback?cancelled=true"
}
```

One of `tenantId` or `onboardingId` is required. If `tenantId` is present, the API looks up the existing Stripe customer. If `onboardingId` is present, it creates a new customer.

**Response:**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_xxx",
  "sessionId": "cs_xxx"
}
```

**Errors:**

| Code | Status | Meaning |
|------|--------|---------|
| `BILLING-001` | 400 | Invalid tier or billing cycle |
| `BILLING-002` | 404 | Tenant not found |
| `BILLING-003` | 409 | Already at or above target tier |
| `BILLING-004` | 409 | Comped account (cannot checkout) |
| `BILLING-005` | 500 | Stripe API error |
| `BILLING-006` | 429 | Rate limited |

### POST /portal

Create a Stripe Billing Portal session for payment method management.

**Request:**
```json
{
  "tenantId": "tenant-123",
  "returnUrl": "https://billing.grove.place/callback"
}
```

**Response:**
```json
{
  "portalUrl": "https://billing.stripe.com/p/session/xxx"
}
```

**Errors:**

| Code | Status | Meaning |
|------|--------|---------|
| `BILLING-002` | 404 | Tenant not found |
| `BILLING-004` | 409 | Comped account (no portal needed) |
| `BILLING-005` | 500 | Stripe API error |
| `BILLING-007` | 404 | No Stripe customer on record |

### POST /cancel

Cancel a subscription at period end (or immediately).

**Request:**
```json
{
  "tenantId": "tenant-123",
  "immediately": false
}
```

**Response:**
```json
{
  "success": true,
  "periodEnd": "2026-04-12T00:00:00Z"
}
```

### POST /resume

Resume a subscription that was cancelled but hasn't reached period end.

**Request:**
```json
{
  "tenantId": "tenant-123"
}
```

**Response:**
```json
{
  "success": true
}
```

### GET /status/:tenantId

Get billing status for a tenant. Used by the upgrades graft's growth endpoint and the Arbor account page.

**Response:**
```json
{
  "plan": "seedling",
  "status": "active",
  "flourishState": "active",
  "currentPeriodEnd": 1712966400,
  "cancelAtPeriodEnd": false,
  "isComped": false,
  "paymentMethod": {
    "brand": "visa",
    "last4": "4242"
  }
}
```

### POST /webhook

Process a verified Stripe webhook payload. Called by the UI worker after signature verification.

**Request:** Raw Stripe event JSON (already verified by UI worker).

**Handled Events:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create tenant (new signups, using migrated `createTenant()` logic) or update plan (upgrades). Update `platform_billing`. |
| `customer.subscription.updated` | Sync status, period dates, cancellation flag to `platform_billing`. |
| `customer.subscription.deleted` | Set status to `cancelled` in `platform_billing`. |
| `invoice.paid` | Set status to `active`. Send receipt email (first payment only). |
| `invoice.payment_failed` | Set status to `past_due`. Send payment failure email. |

Idempotency is enforced via the existing `webhook_events` table. Payloads are sanitized for GDPR/PCI before storage. 120-day retention with scheduled cleanup.

---

## Engine Config (SSOT)

### `libs/engine/src/lib/config/billing.ts`

This file mirrors `libs/engine/src/lib/config/auth.ts`. It is the single source of truth for all billing URLs across the monorepo.

```typescript
/**
 * Billing URL Configuration — Single Source of Truth
 *
 * ALL billing URLs across the monorepo MUST import from here.
 * No package should define its own BILLING_URL or STRIPE config.
 *
 * The canonical billing entry point is billing.grove.place, which proxies
 * all requests to grove-billing-api via Cloudflare service binding.
 */

export const BILLING_HUB_URL =
  import.meta.env.VITE_BILLING_URL ?? "https://billing.grove.place";

/** Build a path on the billing hub. */
export function billingPath(path: string): string {
  return `${BILLING_HUB_URL}${path}`;
}

/**
 * Build a URL to the billing hub for checkout.
 * Redirects the user to billing.grove.place to complete payment.
 */
export function buildCheckoutUrl(params: {
  tenantId?: string;
  onboardingId?: string;
  tier: string;
  billingCycle: "monthly" | "yearly";
  redirect: string;
}): string {
  const url = new URL(BILLING_HUB_URL);
  url.searchParams.set("action", "checkout");
  if (params.tenantId) url.searchParams.set("tenant", params.tenantId);
  if (params.onboardingId) url.searchParams.set("onboarding", params.onboardingId);
  url.searchParams.set("tier", params.tier);
  url.searchParams.set("cycle", params.billingCycle);
  url.searchParams.set("redirect", params.redirect);
  return url.toString();
}

/**
 * Build a URL to the billing hub for the billing portal.
 * Opens Stripe's hosted portal for payment method and plan management.
 */
export function buildPortalUrl(redirect: string): string {
  const url = new URL(`${BILLING_HUB_URL}/portal`);
  url.searchParams.set("redirect", redirect);
  return url.toString();
}

/**
 * Build a URL to the billing hub for cancellation.
 * Shows a confirmation page before cancelling.
 */
export function buildCancelUrl(redirect: string): string {
  const url = new URL(`${BILLING_HUB_URL}/cancel`);
  url.searchParams.set("redirect", redirect);
  return url.toString();
}

/**
 * Build a URL to the billing hub for resuming a cancelled subscription.
 * Shows a confirmation page before resuming.
 */
export function buildResumeUrl(redirect: string): string {
  const url = new URL(`${BILLING_HUB_URL}/resume`);
  url.searchParams.set("redirect", redirect);
  return url.toString();
}
```

### Upgrades Graft Simplification

The graft's server handlers shrink from "talk to Stripe directly" to "build a redirect URL":

```typescript
// libs/engine/src/lib/grafts/upgrades/server/api/cultivate.ts (after)
import { buildCheckoutUrl } from "$lib/config/billing";

// ... auth checks, validation ...

const checkoutUrl = buildCheckoutUrl({
  tenantId: verifiedTenantId,
  tier: body.targetStage,
  billingCycle: body.billingCycle ?? "monthly",
  redirect: `${appUrl}/arbor/account?cultivated=true`,
});

return json({ plantingUrl: checkoutUrl });
```

```typescript
// libs/engine/src/lib/grafts/upgrades/server/api/tend.ts (after)
import { buildPortalUrl } from "$lib/config/billing";

// ... auth checks ...

const portalUrl = buildPortalUrl(returnTo);

return json({ shedUrl: portalUrl });
```

```typescript
// libs/engine/src/lib/grafts/upgrades/server/api/growth.ts (after)
// This one still needs billing data. It calls billing-api via service binding.

const response = await platform.env.BILLING.fetch(
  `https://billing.grove.place/status/${verifiedTenantId}`
);
const status = await response.json();

return json(mapToGrowthStatus(status));
```

---

## Wrangler Configuration

### UI Worker (`apps/billing/wrangler.toml`)

```toml
name = "grove-billing"
main = ".svelte-kit/cloudflare/server/index.js"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]

# Billing API Service Binding (internal, all Stripe logic lives here)
[[services]]
binding = "BILLING_API"
service = "grove-billing-api"

# Auth Service Binding (session validation)
[[services]]
binding = "AUTH"
service = "groveauth"

# Custom domain
[[routes]]
pattern = "billing.grove.place"
custom_domain = true

# Secrets (configured via wrangler secret put):
# - STRIPE_WEBHOOK_SECRET (webhook signature verification, belt-and-suspenders with billing-api)
# D1: none (least privilege)
```

### API Worker (`services/billing-api/wrangler.toml`)

```toml
name = "grove-billing-api"
main = "src/index.ts"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "production"
BILLING_HUB_URL = "https://billing.grove.place"

# D1 Database (platform_billing, webhook_events, tenants)
[[d1_databases]]
binding = "DB"
database_name = "grove-engine-db"
database_id = "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68"

# KV for rate limiting
[[kv_namespaces]]
binding = "CACHE_KV"
id = "existing-cache-kv-id"

# Zephyr email gateway
[[services]]
binding = "ZEPHYR"
service = "grove-zephyr"

# Smart placement (co-locate with D1)
[placement]
mode = "smart"

# Cron: daily webhook cleanup (expired events)
[triggers]
crons = ["0 2 * * *"]

# Secrets (set via wrangler secret put):
# - STRIPE_SECRET_KEY
# - STRIPE_WEBHOOK_SECRET
```

### Grove Router Addition

```typescript
// services/grove-router/src/index.ts — add to SUBDOMAIN_ROUTES
billing: "grove-billing.workers.dev",  // or use service binding when available
```

---

## Security Considerations

### Secret Key Isolation

Only `grove-billing-api` holds `STRIPE_SECRET_KEY`. The UI worker, the engine, Plant, and every other service have zero access to Stripe credentials. This is the same principle as Heartwood holding the JWT keys.

### Webhook Verification (Belt and Suspenders)

Both workers verify the Stripe webhook signature independently.

1. The UI worker receives the webhook at `/api/webhooks/stripe`, verifies the signature using its own copy of `STRIPE_WEBHOOK_SECRET`, and rejects invalid payloads with a 401 before they reach billing-api.
2. The UI worker forwards the **raw body** and the `stripe-signature` header to billing-api via service binding.
3. billing-api re-verifies the signature using its own copy of `STRIPE_WEBHOOK_SECRET` before processing.

This means `STRIPE_WEBHOOK_SECRET` exists in both workers. This is the one Stripe secret shared across the boundary. The rationale: payment webhooks are the most security-critical path in the system. If the UI worker's verification has a bug, billing-api catches it. The crypto cost (two HMAC-SHA256 computations) is negligible compared to the D1 writes that follow.

### Session Validation

The UI worker validates sessions via the AUTH service binding before making any billing-api calls. No anonymous access to billing operations. The validated user's `tenantId` is passed to billing-api, which re-verifies tenant ownership against D1.

### Redirect Validation

The `redirect` parameter is validated against an allowlist of `*.grove.place` origins, matching the login hub's `grove_auth_redirect` cookie pattern. Open redirect protection.

### Rate Limiting

All billing-api endpoints are rate limited via the Threshold SDK (KV-backed), keyed by tenant ID. Limits:

| Endpoint | Limit | Window |
|----------|-------|--------|
| /checkout | 10 | 1 hour |
| /portal | 20 | 1 hour |
| /cancel | 5 | 1 hour |
| /resume | 5 | 1 hour |
| /status | 100 | 1 hour |
| /webhook | 1000 | 1 hour |

### Audit Logging

All mutation operations (checkout, cancel, resume) write to the `billing_audit_log` via `logBillingAudit()`. The existing audit infrastructure from the engine billing endpoint carries over.

### PCI Compliance

No card numbers or full payment details ever touch Grove infrastructure. Stripe Checkout and Billing Portal are hosted by Stripe. BillingHub only stores: last 4 digits, card brand, Stripe customer/subscription IDs, and billing period dates.

---

## Migration Plan

### Phase 1: Build the Hub (New Code)

Build the two workers from scratch. No existing code needs to change yet.

- [ ] Create `apps/billing/` SvelteKit project with `@sveltejs/adapter-cloudflare`
- [ ] Create `services/billing-api/` Hono worker
- [ ] Move `libs/engine/src/lib/payments/` (StripeClient, StripeProvider) into billing-api
- [ ] Implement billing-api endpoints: `/checkout`, `/portal`, `/cancel`, `/resume`, `/status`, `/webhook`
- [ ] Implement UI worker routes: `/`, `/portal`, `/cancel`, `/resume`, `/callback`, `/api/webhooks/stripe`, `/api/health`
- [ ] Migrate Plant's `createTenant()` logic into billing-api (username reservation, subdomain setup, platform_billing record)
- [ ] Consolidate Plant's webhook handler logic (tenant creation, email sending) into billing-api
- [ ] Create `libs/engine/src/lib/config/billing.ts` with `buildCheckoutUrl()` and `buildPortalUrl()`
- [ ] Add `billing` entry to grove-router `SUBDOMAIN_ROUTES`
- [ ] Deploy both workers to Cloudflare
- [ ] Configure Stripe webhook endpoint to `billing.grove.place/api/webhooks/stripe`
- [ ] Write tests for all billing-api endpoints

### Phase 2: Redirect Everything (Swap Over)

Point all existing payment touchpoints to BillingHub.

- [ ] Update Plant checkout to use `buildCheckoutUrl()` redirect instead of direct Stripe calls
- [ ] Update Arbor SubscriptionCard: cancel/resume buttons use `buildCancelUrl()` / `buildResumeUrl()` redirects
- [ ] Update Arbor PaymentMethodCard: "Manage" button uses `buildPortalUrl()` redirect
- [ ] Update Arbor ChangePlanCard: upgrade buttons use `buildCheckoutUrl()` redirect
- [ ] Add comped account check in upgrades graft before building checkout URL (defense in depth)
- [ ] Simplify upgrades graft: `cultivate.ts` → redirect, `tend.ts` → redirect, `growth.ts` → service binding
- [ ] Remove `STRIPE_SECRET_KEY` from Plant and Engine wrangler configs
- [ ] Remove `/api/billing` endpoint from engine (781 lines)
- [ ] Remove `/api/shop/webhooks` endpoint from engine
- [ ] Remove Plant's `src/lib/server/stripe.ts` and `/api/webhooks/stripe/` route
- [ ] Remove Plant's payment health check endpoint
- [ ] Update Stripe Dashboard: single webhook endpoint at `billing.grove.place`
- [ ] Verify all flows end-to-end: new signup, upgrade, portal, cancel, resume, webhook processing

### Phase 3: Cleanup and Verification

- [ ] Remove stale Stripe environment variables from Plant and Engine
- [ ] Delete `libs/engine/src/lib/payments/` (moved to billing-api)
- [ ] Remove Plant's email templates for payment receipt/failure (moved to billing-api)
- [ ] Close #1357 (payment management non-functional)
- [ ] Close #1177 (Amber Stripe integration, if applicable)
- [ ] Update existing specs that reference the old payment endpoints
- [ ] Security audit (Hawk report) on the new billing hub
- [ ] Begin E2E payment test suite (#935)

---

## What Gets Deleted

A clear accounting of code that goes away:

| File | Lines | Reason |
|------|-------|--------|
| `apps/plant/src/lib/server/stripe.ts` | ~200 | Replaced by billing-api's StripeClient |
| `apps/plant/src/routes/api/webhooks/stripe/+server.ts` | ~548 | Replaced by billing-api /webhook |
| `apps/plant/src/routes/checkout/+server.ts` | ~80 | Replaced by `buildCheckoutUrl()` redirect |
| `apps/plant/src/routes/api/health/payments/+server.ts` | ~30 | Replaced by billing.grove.place/api/health |
| `libs/engine/src/routes/api/billing/+server.ts` | 781 | Replaced by billing-api endpoints |
| `libs/engine/src/routes/api/billing/billing.test.ts` | ~200 | Replaced by billing-api tests |
| `libs/engine/src/routes/api/shop/webhooks/+server.ts` | 192 | Duplicate webhook handler, deleted |
| `libs/engine/src/lib/payments/` (5 files) | ~1800 | Moved into billing-api |

**Total removed from existing codebase:** ~3,800 lines
**New code in billing hub:** ~1,200 lines (estimated, consolidated and deduplicated)

---

## What Stays

| Component | Location | Why It Stays |
|-----------|----------|-------------|
| `platform_billing` table | D1 migrations 007, 013, 101 | Plan CHECK updated to match canonical tier names (`wanderer` replaces `free`). billing-api reads/writes it. |
| `webhook_events` table | D1 migration 007 | Idempotency and audit trail. billing-api uses it. |
| `billing_audit_log` table | D1 migration 101 | New. Billing-api logs all mutations here. Survives tenant deletion (no FK) for compliance. |
| `$lib/server/billing.ts` | Engine | Feature gating (`checkFeatureAccess`, `isCompedAccount`). Not payment processing. |
| `$lib/config/tiers.ts` | Engine | Tier definitions are display/feature config, not Stripe config. |
| Upgrades graft components | Engine grafts | GardenModal, GrowthCard, etc. UI stays embedded. |
| Arbor account page | Engine routes | SubscriptionCard, PaymentMethodCard, ChangePlanCard. Buttons redirect to hub. |
| Warden Stripe service | Workers | Read-only admin queries, separate security boundary. |
| Pricing graft | Engine grafts | Display-only, no Stripe interaction. |

---

## Requirements

| ID | Pattern | Requirement | Priority |
|----|---------|-------------|----------|
| REQ-001 | Ubiquitous | The billing-api worker shall hold the only copy of `STRIPE_SECRET_KEY` in the monorepo. | Must Have |
| REQ-002 | Event-Driven | When a Wanderer clicks "Upgrade" or "Subscribe" in any Grove app, the app shall redirect to `billing.grove.place`. | Must Have |
| REQ-003 | Event-Driven | When Stripe fires a webhook, the UI worker shall verify the signature and proxy to billing-api. | Must Have |
| REQ-004 | Event-Driven | When a new signup completes checkout, billing-api shall create the tenant via D1. | Must Have |
| REQ-005 | Event-Driven | When a payment fails, billing-api shall update `platform_billing` status and send a failure email via Zephyr. | Must Have |
| REQ-006 | Unwanted | If the `redirect` parameter is not a `*.grove.place` origin, the UI worker shall reject it with a 400 error. | Must Have |
| REQ-007 | Unwanted | If the billing-api is unreachable, the UI worker shall display a friendly error page, not a raw 502. | Should Have |
| REQ-008 | State-Driven | While a subscription is in `past_due` status, the billing portal shall be accessible for payment method updates. | Must Have |
| REQ-009 | Optional | Where `VITE_BILLING_URL` is set, the engine config shall use it instead of `billing.grove.place` (local dev). | Should Have |
| REQ-010 | Ubiquitous | The billing-api shall log all mutation operations to the audit trail. | Must Have |

---

## Design Decisions (Resolved)

### 1. Webhook Verification: Belt and Suspenders

Both workers verify independently. The UI worker checks the Stripe signature first (rejecting bad payloads early), then forwards the raw body + `stripe-signature` header to billing-api, which re-verifies before processing. `STRIPE_WEBHOOK_SECRET` exists in both workers. The crypto cost is negligible compared to the D1 writes that follow.

### 2. Tenant Creation: Moves into billing-api

Plant's `createTenant()` logic migrates into billing-api. When `checkout.session.completed` fires for a new signup, billing-api creates the tenant directly via its D1 binding. Plant becomes a pure onboarding UI. The tenant creation code (username reservation, subdomain setup, initial `platform_billing` record) lives alongside the webhook handler that triggers it.

### 3. Comped Accounts: Defense in Depth

Both layers check. The upgrades graft calls `isCompedAccount()` before building a checkout URL. If the user is comped, the graft shows a "your account is complimentary" message inline, with no redirect. As a fallback, `billing.grove.place` also checks comped status when a user arrives and shows a friendly page explaining their account is gifted. This handles direct navigation and edge cases where the graft check is stale.

### 4. Cancel/Resume: Full Redirect

All billing actions go through `billing.grove.place`, including cancel and resume. The Arbor account page's cancel/resume buttons redirect to `billing.grove.place/cancel` and `billing.grove.place/resume`, which render confirmation pages before acting. This maintains the "one path, one place to debug" principle. The engine does not need a `BILLING` service binding. Every billing mutation flows through the hub.

The UX tradeoff (page navigation for a quick toggle) is acceptable because:
- Cancel/resume are rare, high-stakes actions that benefit from a confirmation step
- One codepath means one place to audit, test, and fix
- A service binding shortcut can be added later if the redirect feels too heavy

---

## Phase 1 Implementation Notes

*Completed March 2026. All Phase 1 Migration Plan items are done.*

### What Was Built

Two workers, 52 files total, 171 passing tests:

- **`services/billing-api/`** (23 files) — Hono worker with all 7 endpoints from the spec, StripeClient, webhook processing with idempotency, GDPR sanitization, 120-day retention, tenant creation on checkout completion, payment emails via Zephyr, KV-backed rate limiting, error catalog BILLING-001 through BILLING-007, and audit logging on all mutations.
- **`apps/billing/`** (29 files) — SvelteKit worker with all 7 routes from the spec, session validation via AUTH binding, belt-and-suspenders webhook verification, `grove_billing_redirect` cookie, redirect allowlist validation, and friendly error pages.
- **`libs/engine/src/lib/config/billing.ts`** — SSOT config with `BILLING_HUB_URL`, `buildCheckoutUrl()`, `buildPortalUrl()`, `buildCancelUrl()`, `buildResumeUrl()`.
- **`services/grove-router/`** — `billing` subdomain route added.

### Architectural Decisions

- **Self-contained worker, no lattice dependency.** billing-api carries its own StripeClient (simplified from engine's payments SDK — no Connect methods). This avoids pulling engine as a dependency and keeps the worker lean on cold start.
- **Inline Svelte components in apps/billing.** The billing UI uses self-contained components rather than importing from vineyard or engine barrels. This sidesteps the barrel cascade hydration issue documented in CLAUDE.md and keeps the billing app independently deployable.
- **Upsert pattern for upgrades.** The checkout-completed handler uses `INSERT ... ON CONFLICT DO UPDATE` for platform_billing records, collapsing a SELECT + conditional INSERT/UPDATE into a single D1 round-trip.
- **Parallel DB operations in invoice handlers.** The UPDATE (status change) and SELECT (tenant lookup for emails) run via `Promise.all` since the SELECT doesn't depend on the UPDATE completing.

### Security Hardening

Found and fixed during review:

- **Open redirect in checkout successUrl** (critical) — `redirect` parameter now validated against `*.grove.place` allowlist before use.
- **Timing attack in webhook signature comparison** (critical) — `secureCompare()` pads both strings to equal length and XORs every byte, preventing early-return length leaks.
- **Future timestamp rejection** — Webhook verification rejects signatures with timestamps more than 60 seconds in the future (clock skew tolerance).
- **UUID validation** on all mutation route parameters.
- **HTML escaping** in Zephyr email templates to prevent injection.
- **Input not echoed** in error responses (prevents reflection attacks).
- **Request body size limits** (64KB) on all POST endpoints.
- **Minimal root endpoint** — returns only `{ ok: true }`, no service topology information.
- **Safe error logging** — error messages truncated to 200 chars, never stores full error objects (which may contain PII from Stripe payloads).

### Test Coverage

171 tests across 6 suites, all passing:

- Validation utilities (tier mapping, status mapping, UUID checks)
- GDPR payload sanitizer (field stripping, retention calculation)
- Error catalog and response formatting
- StripeClient (webhook signature verification, secret rotation, replay rejection)
- Redirect validation (allowlist enforcement, subdomain patterns)
- URL builder functions (all param combinations)

### Performance Optimizations

- Batched D1 inserts for `site_settings` during tenant creation (4 round-trips collapsed to 1).
- Upsert pattern in webhook upgrade path (2 round-trips collapsed to 1).
- Merged DB queries in cancel/resume routes (2 collapsed to 1 each).
- Parallel UPDATE + SELECT in `invoice.paid` and `invoice.payment_failed` handlers.
- Efficient HMAC hex encoding (Uint8Array reduce, no intermediate arrays).

### Pre-Deployment Checklist

Before deploying to production:

1. `pnpm install` from monorepo root (registers new workspace packages).
2. `wrangler secret put STRIPE_SECRET_KEY` for `grove-billing-api`.
3. `wrangler secret put STRIPE_WEBHOOK_SECRET` for both `grove-billing-api` and `grove-billing`.
4. Configure Stripe Dashboard webhook endpoint: `https://billing.grove.place/api/webhooks/stripe`.
5. Deploy grove-router with the new `billing` subdomain route.
6. Deploy both workers: `wrangler deploy` in `services/billing-api/` and `apps/billing/`.
7. Verify `/api/health` returns Stripe connectivity confirmation.

### Phase 2 Readiness

All Phase 1 infrastructure is in place. Phase 2 (Redirect Everything) can begin immediately. The URL builders in `libs/engine/src/lib/config/billing.ts` are ready for import by Plant, Arbor, and the upgrades graft. Five contract field-name mismatches between API responses and UI consumers were identified and fixed during Phase 1, so the API surface is stable.

---

*The water finds its way. Through root and soil, one path, one source, every tree drinks.*
