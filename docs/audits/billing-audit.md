---
aliases: [billing-audit, payment-audit, billing-hub-audit]
date created: Thursday, March 13th 2026
date modified: Thursday, March 13th 2026
tags:
  - billing
  - stripe
  - payments
  - audit
  - migration
type: audit
linked-issues:
  - "#1465"
  - "#1357"
linked-specs:
  - docs/specs/billing-hub-spec.md
---

# BillingHub Pre-Migration Audit

> *Before you move the roots, you need to know where every tendril runs.*

This document is the formal pre-migration inventory for the BillingHub project. It catalogs every file, secret, database table, and dependency chain that touches payment processing across the Grove monorepo. This is the map the migration team follows — nothing moves without being accounted for here first.

**Spec:** `docs/specs/billing-hub-spec.md`
**Tracking Issue:** #1465
**Related:** #1357 (payment management non-functional)
**Date:** March 13, 2026

---

## Executive Summary

### What Exists Today

Payment processing code is scattered across four locations in the monorepo: **Plant** (onboarding checkout and webhook handling), **Engine** (billing API endpoint, shop webhooks, and the payments SDK), **Upgrades Graft** (cultivation and billing portal sessions), and **Arbor** (account page UI). Each location independently initializes Stripe, manages its own secrets, and implements its own error handling. Two separate webhook handlers process overlapping event types. Two independent sanitizer implementations strip PII from webhook payloads.

### Why It's Broken

- **Four places to debug** when a payment fails — no single point of truth
- **Stripe secrets duplicated** across Plant and Engine (and referenced in comments for a third)
- **Two webhook handlers** (`apps/plant/` and `libs/engine/`) process subscription events with slightly different logic
- **Two webhook sanitizer implementations** — a generic LemonSqueezy-era one and a Stripe-specific one, both in `webhook-sanitizer.ts`
- **Price IDs hardcoded** in Plant's `stripe.ts` (8 IDs: 4 tiers x 2 billing cycles)
- **Upgrades graft config** reads `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` from env vars it never uses for API calls
- **`STRIPE_PUBLISHABLE_KEY`** referenced in Engine wrangler.toml comments but never used in code

### What BillingHub Fixes

Two new Cloudflare Workers — `apps/billing/` (SvelteKit UI at `billing.grove.place`) and `services/billing-api/` (Hono backend) — centralize all payment operations. Every app redirects to the billing hub for payment actions. One Stripe secret key, one webhook endpoint, one codebase to debug. The pattern mirrors the login hub (`login.grove.place` + `groveauth`).

**Estimated reduction:** ~3,800 lines removed from existing codebase, replaced by ~1,200 consolidated lines in the billing hub.

---

## File Inventory

### Core Payment Provider SDK

These files form the abstract payment provider system. They move wholesale into `services/billing-api/`.

| File | Lines | Purpose | Classification |
|------|-------|---------|----------------|
| `libs/engine/src/lib/payments/index.ts` | 76 | Provider factory (`createPaymentProvider`), re-exports | MOVE |
| `libs/engine/src/lib/payments/types.ts` | 583 | Abstract interfaces: `PaymentProvider`, `CheckoutSession`, `Subscription`, `ConnectAccount`, etc. | MOVE |
| `libs/engine/src/lib/payments/stripe/index.ts` | 39 | Stripe provider entry point and type re-exports | MOVE |
| `libs/engine/src/lib/payments/stripe/client.ts` | 479 | Edge-compatible Stripe API client (fetch-based, HMAC webhook verification, constant-time comparison) | MOVE |
| `libs/engine/src/lib/payments/stripe/provider.ts` | 702 | `StripeProvider` implementing full `PaymentProvider` interface (checkout, subscriptions, Connect, webhooks) | MOVE |
| **Subtotal** | **1,879** | | |

### Plant (Onboarding)

Plant handles new user signup and initial payment. Most code moves to billing-api; Plant becomes a pure onboarding UI.

| File | Lines | Purpose | Classification |
|------|-------|---------|----------------|
| `apps/plant/src/lib/server/stripe.ts` | 497 | Direct Stripe API calls: checkout session creation, webhook verification, billing portal, subscription status mapping. Hardcodes 8 Stripe price IDs. | MOVE |
| `apps/plant/src/routes/checkout/+server.ts` | 134 | Checkout flow: looks up onboarding record, checks comped invites, creates Stripe checkout session | SIMPLIFY |
| `apps/plant/src/routes/api/webhooks/stripe/+server.ts` | 548 | Full webhook handler: signature verification, idempotency, tenant creation on `checkout.session.completed`, subscription updates, invoice paid/failed emails via Zephyr | MOVE |
| `apps/plant/src/routes/api/health/payments/+server.ts` | ~30 | Stripe connectivity health check | MOVE |
| `apps/plant/src/lib/server/tenant.ts` | ~80 | Tenant provisioning (`createTenant`, `getTenantForOnboarding`) | STAYS (Plant-specific, but `createTenant` logic also moves to billing-api) |
| `apps/plant/src/lib/errors.ts` | — | Plant error codes including `STRIPE_PRICE_NOT_CONFIGURED`, `STRIPE_CHECKOUT_FAILED`, etc. | STAYS |
| `apps/plant/scripts/test-stripe.ts` | ~50 | Manual test script for Stripe integration | DELETE |
| `apps/plant/wrangler.toml` | 75 | Declares `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` as secrets | UPDATE |
| **Subtotal** | **~1,414** | | |

### Engine Billing & Webhooks

The engine's billing endpoint is the largest single file (781 lines) and handles checkout, cancellation, resume, and billing portal — all of which move to billing-api.

| File | Lines | Purpose | Classification |
|------|-------|---------|----------------|
| `libs/engine/src/routes/api/billing/+server.ts` | 781 | Platform billing: GET (status), POST (checkout), PATCH (cancel/resume), PUT (billing portal). Includes full HTML cancellation email template. | MOVE |
| `libs/engine/src/routes/api/shop/webhooks/+server.ts` | 192 | Second webhook handler for subscription events. Uses `createPaymentProvider` and `sanitizeWebhookPayload`. Overlaps with Plant's webhook handler. | DELETE |
| `libs/engine/src/lib/server/billing.ts` | 218 | Feature gating helpers: `getTenantSubscription`, `checkFeatureAccess`, `requireActiveSubscription`, `isCompedAccount`, `logBillingAudit` | STAYS |
| `libs/engine/src/lib/server/billing.test.ts` | ~150 | Tests for billing helpers | STAYS |
| `libs/engine/wrangler.toml` | 275 | References Stripe secrets in comments (lines 228-252): `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_ENABLED`, `PLATFORM_FEE_PERCENT`, price ID env vars | UPDATE |
| **Subtotal** | **~1,616** | | |

### Upgrades Graft

The cultivation/tending flow currently creates Stripe sessions directly. After migration, these become simple URL redirects.

| File | Lines | Purpose | Classification |
|------|-------|---------|----------------|
| `libs/engine/src/lib/grafts/upgrades/config.ts` | 112 | Reads `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and 8 `STRIPE_PLANT_*` env vars from environment | SIMPLIFY |
| `libs/engine/src/lib/grafts/upgrades/server/api/cultivate.ts` | 262 | Creates Stripe Checkout Session for tier upgrades via `createPaymentProvider`. CSRF validation, rate limiting, comped account checks, audit logging. | SIMPLIFY |
| `libs/engine/src/lib/grafts/upgrades/server/api/tend.ts` | 159 | Creates Stripe Billing Portal session via `createPaymentProvider`. CSRF validation, rate limiting, audit logging. | SIMPLIFY |
| `libs/engine/src/lib/grafts/upgrades/server/api/growth.ts` | 139 | Reads billing status directly from D1. No Stripe API calls. | STAYS (or calls billing-api for status) |
| `libs/engine/src/lib/grafts/upgrades/types.ts` | 148 | Type definitions: `CultivateRequest`, `TendRequest`, `GrowthStatus`, `UpgradesConfig`, etc. | STAYS |
| `libs/engine/src/lib/grafts/upgrades/upgrades.test.ts` | ~300 | Tests for upgrades graft | UPDATE |
| **Subtotal** | **~1,120** | | |

### Arbor Account Page

UI components that display billing status. Buttons will redirect to billing.grove.place instead of making direct API calls.

| File | Lines | Purpose | Classification |
|------|-------|---------|----------------|
| `libs/engine/src/routes/arbor/account/+page.server.ts` | ~200 | Account page load (billing data fetch) | UPDATE |
| `libs/engine/src/routes/arbor/account/+page.svelte` | ~300 | Account page UI | UPDATE |
| `libs/engine/src/routes/arbor/account/PaymentMethodCard.svelte` | ~80 | Payment method display | STAYS |
| `libs/engine/src/routes/arbor/account/SubscriptionCard.svelte` | ~100 | Subscription status display | STAYS |
| `libs/engine/src/routes/arbor/account/ChangePlanCard.svelte` | ~120 | Plan upgrade UI — buttons become redirects to `billing.grove.place` | UPDATE |
| `libs/engine/src/routes/arbor/account/utils.ts` | ~80 | Account page utilities | STAYS |
| **Subtotal** | **~880** | | |

### Webhook Utilities

| File | Lines | Purpose | Classification |
|------|-------|---------|----------------|
| `libs/engine/src/lib/utils/webhook-sanitizer.ts` | 472 | GDPR/PCI payload sanitizer. Contains *both* a LemonSqueezy-era generic sanitizer (`sanitizeWebhookPayload`) and a Stripe-specific sanitizer (`sanitizeStripeWebhookPayload`). Also: `detectPiiFields`, `calculateWebhookExpiry`. | MOVE |
| `libs/engine/src/lib/utils/webhook-sanitizer.test.ts` | ~100 | Tests for sanitizer | MOVE |
| **Subtotal** | **~572** | | |

### Warden (Admin) — Stays Separate

Warden has its own Stripe secret for read-only admin queries. This is a separate security boundary and is not part of the BillingHub migration.

| File | Lines | Purpose | Classification |
|------|-------|---------|----------------|
| `workers/warden/src/services/stripe.ts` | ~130 | Read-only Stripe queries for admin dashboard | STAYS |
| `libs/engine/src/lib/warden/services/stripe.ts` | ~90 | Type-safe Warden client for Stripe admin service | STAYS |
| `workers/warden/wrangler.toml` | 46 | Declares own `STRIPE_SECRET_KEY` (line 13, global fallback for admin) | STAYS |

### Webhook Cleanup Worker — Stays

| File | Lines | Purpose | Classification |
|------|-------|---------|----------------|
| `workers/webhook-cleanup/src/index.ts` | ~150 | Cron job: deletes expired `webhook_events` rows | STAYS |

### Tests That Need Updating

| File | Lines | Purpose | Classification |
|------|-------|---------|----------------|
| `libs/engine/tests/integration/webhooks/webhooks.test.ts` | ~200 | Integration tests for webhook processing | UPDATE |
| `libs/engine/src/lib/grafts/upgrades/upgrades.test.ts` | ~300 | Tests for upgrades graft — mock billing-api instead of Stripe | UPDATE |

---

## Dependency Graph

### Who imports `libs/engine/src/lib/payments/`

The payments SDK is imported by six consumers. All of these either move to billing-api or get simplified.

```
libs/engine/src/lib/payments/
    ├── libs/engine/src/routes/api/billing/+server.ts        → MOVE (to billing-api)
    ├── libs/engine/src/routes/api/shop/webhooks/+server.ts  → DELETE
    ├── libs/engine/src/lib/grafts/upgrades/server/api/cultivate.ts → SIMPLIFY (no more Stripe import)
    ├── libs/engine/src/lib/grafts/upgrades/server/api/tend.ts      → SIMPLIFY (no more Stripe import)
    ├── libs/engine/tests/integration/webhooks/webhooks.test.ts     → UPDATE
    └── libs/engine/src/lib/grafts/upgrades/upgrades.test.ts        → UPDATE
```

### Who imports `apps/plant/src/lib/server/stripe.ts`

Plant's Stripe module is imported by two internal routes. Both move or simplify.

```
apps/plant/src/lib/server/stripe.ts
    ├── apps/plant/src/routes/checkout/+server.ts              → SIMPLIFY (becomes redirect)
    └── apps/plant/src/routes/api/webhooks/stripe/+server.ts   → MOVE (to billing-api)
```

### Who imports `libs/engine/src/lib/server/billing.ts`

The billing helpers are used for feature gating, not payment processing. They stay.

```
libs/engine/src/lib/server/billing.ts
    ├── libs/engine/src/routes/api/billing/+server.ts          → MOVE (imports logBillingAudit, isCompedAccount)
    ├── libs/engine/src/lib/grafts/upgrades/server/api/cultivate.ts → imports logBillingAudit, isCompedAccount
    ├── libs/engine/src/lib/grafts/upgrades/server/api/tend.ts      → imports logBillingAudit
    ├── libs/engine/src/lib/grafts/upgrades/server/api/growth.ts    → imports isCompedAccount
    └── libs/engine/tests/integration/webhooks/webhooks.test.ts     → UPDATE
```

### Who imports `libs/engine/src/lib/utils/webhook-sanitizer.ts`

```
libs/engine/src/lib/utils/webhook-sanitizer.ts
    ├── libs/engine/src/routes/api/shop/webhooks/+server.ts   → DELETE
    └── apps/plant/src/routes/api/webhooks/stripe/+server.ts  → MOVE (imports via @autumnsgrove/lattice/utils)
```

---

## Secrets Inventory

| Secret | Plant wrangler.toml | Engine wrangler.toml | Warden wrangler.toml | Target After Migration |
|--------|:---:|:---:|:---:|---|
| `STRIPE_SECRET_KEY` | Declared (line 71) | Comment only (line 231) | Declared (line 13) | **billing-api only** (+ Warden keeps its own for admin) |
| `STRIPE_WEBHOOK_SECRET` | Declared (line 72) | Comment only (line 237) | — | **billing UI + billing-api** (belt-and-suspenders verification) |
| `STRIPE_PUBLISHABLE_KEY` | — | Comment only (line 234) | — | **DELETE** (never used in code) |
| `STRIPE_CONNECT_ENABLED` | — | Comment only (line 240) | — | **DELETE** (not in scope for BillingHub) |
| `PLATFORM_FEE_PERCENT` | — | Comment only (line 242) | — | **DELETE** (not in scope for BillingHub) |
| `STRIPE_PRICE_*` (8 vars) | — | Comment only (lines 248-252) | — | **DELETE** (price IDs are hardcoded in Plant stripe.ts, will be in billing-api config) |
| `STRIPE_PLANT_*` (8 vars) | — | Read in grafts config.ts | — | **DELETE** (replaced by `buildCheckoutUrl()`) |

### Hidden Secret Consumers

The upgrades graft config (`config.ts`, line 20-21) reads `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` from the environment and stores them in the `UpgradesConfig` object. However, these values are only used by `cultivate.ts` and `tend.ts` through the `createPaymentProvider()` factory — they do not use the config object's copies. After simplification, neither the config nor the env vars are needed.

---

## Database Access Map

| Table | Read By | Write By | Notes |
|-------|---------|----------|-------|
| `platform_billing` | Arbor account page, `billing.ts` helpers, Growth endpoint, Engine billing GET, Cultivate, Tend | Plant `createTenant()`, Plant webhook handler, Engine billing POST/PATCH, Shop webhooks handler | Primary billing state table |
| `webhook_events` | Plant webhook handler (idempotency check), Shop webhooks handler (idempotency check) | Plant webhook handler (INSERT + UPDATE), Shop webhooks handler (INSERT + UPDATE) | Idempotency + audit trail. 120-day retention. |
| `comped_invites` | Plant checkout endpoint (comped invite check) | — (admin-managed) | Checked before Stripe checkout to skip payment |
| `audit_log` | — | `logBillingAudit()` in billing.ts, cultivate.ts, tend.ts, Engine billing PATCH | Category: `"billing"` |
| `tenants` | Billing.ts helpers, Engine billing PUT (subdomain lookup), Growth endpoint (implicit via `getVerifiedTenantId`) | Plant `createTenant()` webhook handler | Joined with `platform_billing` for subdomain lookups |
| `user_onboarding` | Plant checkout, Plant webhook handler | Plant webhook handler (updates Stripe IDs) | Pre-tenant signup state |

### Post-Migration Changes

- **billing-api** becomes the sole writer to `platform_billing` and `webhook_events`
- **billing-api** reads `comped_invites` for the comped check
- **billing-api** writes to `audit_log` via `logBillingAudit()`
- `billing.ts` helpers (`getTenantSubscription`, `checkFeatureAccess`, `isCompedAccount`) continue reading `platform_billing` and `tenants` for feature gating — this is not payment processing

---

## Surprises and Risks

### Surprises Found

1. **Two webhook sanitizer implementations in one file.** `webhook-sanitizer.ts` contains both a generic LemonSqueezy-era sanitizer (`sanitizeWebhookPayload` — expects `{ meta, data }` structure) and a Stripe-specific sanitizer (`sanitizeStripeWebhookPayload` — expects `{ id, type, data: { object } }` structure). The shop webhooks handler uses the generic one (which returns `null` for Stripe payloads and falls back to a minimal stub with `_sanitization_failed: true`). The Plant webhook handler correctly uses the Stripe-specific one.

2. **Stripe price IDs hardcoded in Plant.** `apps/plant/src/lib/server/stripe.ts` lines 39-60 contain 8 live Stripe price IDs (4 tiers x 2 billing cycles). These are not secrets (safe to commit per Stripe), but they need to move to billing-api config.

3. **Upgrades graft config reads secrets it never needs.** `config.ts` constructs an `UpgradesConfig` with `stripeSecretKey` and `stripeWebhookSecret`, but `cultivate.ts` and `tend.ts` read `STRIPE_SECRET_KEY` directly from `platform.env` when calling `createPaymentProvider()`. The config fields are dead weight.

4. **Plant has a `stripe: ^17.7.0` npm dependency.** This is the official Stripe Node.js SDK, but Plant uses a custom fetch-based client instead. The dependency should be removed during migration.

5. **`STRIPE_PUBLISHABLE_KEY` is ghost documentation.** Referenced in Engine wrangler.toml comments (line 234) but never appears in any source code. Pure artifact.

6. **Engine billing endpoint (781 lines) contains an inline HTML email template** (~70 lines of HTML + ~25 lines of plain text) for cancellation confirmation. This template needs to move to billing-api alongside the cancellation logic.

7. **Shop webhooks handler uses generic sanitizer that fails on Stripe payloads.** It calls `sanitizeWebhookPayload()` which expects LemonSqueezy `{ meta, data }` format. For Stripe events, this returns `null`, triggering the fallback path that stores a minimal stub with `_sanitization_failed: true`. This means webhook payloads stored through this handler are not properly sanitized.

8. **Plant webhook handler has a more robust implementation** than Engine's shop webhooks handler — it supports secret rotation (multiple v1 signatures), pads strings for timing-safe comparison, and uses `safeParseJson`. The Engine payments client's `secureCompare` does a simple length check and early-returns `false`, which is technically a timing leak (reveals length mismatch).

### Migration Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Dual webhook endpoint during transition** | Stripe may deliver events to both old and new endpoints | Configure Stripe to send to billing.grove.place first, verify processing, then remove old endpoints |
| **Tenant creation race condition** | If both Plant webhook handler and billing-api process `checkout.session.completed` | Idempotency check via `webhook_events` table prevents double-creation |
| **Comped account edge cases** | Comped users arriving at billing.grove.place directly | billing-api checks comped status; UI shows friendly "your account is gifted" message |
| **`logBillingAudit()` stays in engine** | billing-api needs audit logging but the helper lives in `libs/engine/src/lib/server/billing.ts` | Either duplicate the function in billing-api or extract to a shared package |
| **Feature gating depends on D1 reads** | `billing.ts` helpers read `platform_billing` directly — if billing-api becomes the canonical writer, reads must still work | No schema change. D1 reads from any worker bound to the same database are consistent. |
| **Plant `createTenant()` has domain-specific logic** | Username reservation, subdomain setup, initial D1 records — tightly coupled to onboarding flow | Move the billing-relevant parts (platform_billing INSERT, provider ID storage) to billing-api; keep onboarding-specific parts in Plant or share via a service binding call |

---

## Recommended Migration Order

The dependency chains dictate a bottom-up migration: build the new foundation first, then redirect traffic, then clean up.

### Phase 1: Build the Hub (No Existing Code Changes)

| Step | What | Why First |
|------|------|-----------|
| 1 | Create `services/billing-api/` Hono worker | Foundation. No dependencies on existing code. |
| 2 | Copy `libs/engine/src/lib/payments/` into billing-api | StripeClient and StripeProvider are the core. Copy, don't move yet — old code still runs. |
| 3 | Copy `libs/engine/src/lib/utils/webhook-sanitizer.ts` into billing-api | Webhook processing needs the Stripe sanitizer. |
| 4 | Implement billing-api endpoints: `/checkout`, `/portal`, `/cancel`, `/resume`, `/status`, `/webhook` | Consolidate logic from Engine billing endpoint (781 lines), Plant stripe.ts (497 lines), and Plant webhook handler (548 lines). |
| 5 | Migrate Plant's `createTenant()` billing logic into billing-api `/webhook` handler | Tenant creation on `checkout.session.completed` must work from billing-api. |
| 6 | Create `apps/billing/` SvelteKit UI worker | Public-facing routes: `/`, `/portal`, `/cancel`, `/resume`, `/callback`, `/api/webhooks/stripe`, `/api/health`. |
| 7 | Create `libs/engine/src/lib/config/billing.ts` | `buildCheckoutUrl()`, `buildPortalUrl()`, `buildCancelUrl()`, `buildResumeUrl()` — the SSOT for all billing URLs. |
| 8 | Deploy both workers, configure Stripe webhook to `billing.grove.place/api/webhooks/stripe` | New endpoint receives webhooks in parallel with old endpoints. Idempotency prevents double-processing. |

### Phase 2: Redirect Everything (Swap Over)

| Step | What | Depends On |
|------|------|------------|
| 9 | Simplify `cultivate.ts` — replace `createPaymentProvider()` with `buildCheckoutUrl()` | Phase 1 complete, billing hub deployed |
| 10 | Simplify `tend.ts` — replace `createPaymentProvider()` with `buildPortalUrl()` | Phase 1 complete |
| 11 | Update `growth.ts` — optionally call billing-api `/status` via service binding | Phase 1 complete |
| 12 | Update Plant `checkout/+server.ts` — replace direct Stripe calls with `buildCheckoutUrl()` redirect | Phase 1 complete |
| 13 | Update Arbor account page — cancel/resume/manage buttons redirect to billing.grove.place | Phase 1 complete |
| 14 | Simplify `config.ts` — remove `stripeSecretKey`, `stripeWebhookSecret`, `plantingUrls` | After steps 9-10 |
| 15 | Remove `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` from Plant wrangler.toml secrets | After steps 12, verify Plant no longer uses them |
| 16 | Remove Stripe comments from Engine wrangler.toml | After steps 9-11 |
| 17 | Remove old Stripe webhook endpoints from Stripe Dashboard | After verifying billing.grove.place processes all events |

### Phase 3: Cleanup (Delete Dead Code)

| Step | What | Depends On |
|------|------|------------|
| 18 | Delete `libs/engine/src/routes/api/billing/+server.ts` (781 lines) | Phase 2 complete |
| 19 | Delete `libs/engine/src/routes/api/shop/webhooks/+server.ts` (192 lines) | Phase 2 complete |
| 20 | Delete `apps/plant/src/lib/server/stripe.ts` (497 lines) | Phase 2 complete |
| 21 | Delete `apps/plant/src/routes/api/webhooks/stripe/+server.ts` (548 lines) | Phase 2 complete |
| 22 | Delete `apps/plant/src/routes/api/health/payments/` | Phase 2 complete |
| 23 | Delete `apps/plant/scripts/test-stripe.ts` | Phase 2 complete |
| 24 | Delete `libs/engine/src/lib/payments/` (1,879 lines) | Phase 2 complete, billing-api has its own copy |
| 25 | Remove `stripe: ^17.7.0` from Plant's package.json | After step 20 |
| 26 | Update `upgrades.test.ts` — mock billing-api instead of Stripe | After steps 9-11 |
| 27 | Update `webhooks.test.ts` — point at billing-api | After step 19 |
| 28 | Close #1357, close #1465 | All phases complete |

### Why This Order

The critical constraint is the **dependency chain from the payments SDK**. Six files import from `libs/engine/src/lib/payments/` — all six must be redirected or deleted before the SDK can be removed. By building the hub first (Phase 1) without touching existing code, we maintain a working system throughout. Phase 2 swaps each consumer one at a time, with each step independently testable. Phase 3 only removes code that is provably unreachable.

The Plant webhook handler is the most complex piece to migrate (548 lines, handles tenant creation, subscription updates, and transactional emails). It should move to billing-api early in Phase 1 and be thoroughly tested before Phase 2 redirects traffic to it.

---

*Every tendril accounted for. The roots are ready to move.*
