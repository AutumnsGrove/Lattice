---
title: "Plant Developer Guide"
description: "How the Plant onboarding app works, from OAuth callback to tenant provisioning"
category: guides
guideCategory: infrastructure
lastUpdated: "2026-03-12"
aliases: []
tags:
  - plant
  - onboarding
  - stripe
  - loam
  - tenant-provisioning
---

# Plant Developer Guide

Plant is Grove's onboarding app. It takes a new user from "I just clicked Sign Up" to "my blog is live at `username.grove.place`" in a handful of steps. It runs as its own SvelteKit app at `plant.grove.place`, backed by the shared D1 database, Cloudflare KV for rate limiting, and Stripe for payments.

This guide covers the actual implementation: the state machine that drives step progression, how Loam validates usernames, how Stripe sessions get created and confirmed, what happens with comped invites, and what to check when things break.

## How Plant Works

Plant is a linear onboarding flow with seven stages. Each stage has its own route, and the layout server determines which stage a user belongs to on every request. If you land on the wrong page for your current state, you get redirected to the right one.

The full journey:

1. **Auth** (`/auth/callback`) -- OAuth via GroveAuth, creates `user_onboarding` record
2. **Passkey Setup** (`/auth/setup-passkey`) -- Optional WebAuthn registration for new users
3. **Profile** (`/profile`) -- Display name, username, color, interests
4. **Email Verification** (`/verify-email`) -- 6-digit code sent via Zephyr
5. **Plans** (`/plans`) -- Tier selection (Seedling through Evergreen, plus free Wanderer)
6. **Checkout** (`/checkout`) -- Stripe Checkout redirect (skipped for Wanderer/comped)
7. **Success** (`/success`) -- Polls for tenant creation, then links to the new blog

The session lives in two cookies: `onboarding_id` (7-day TTL) and `access_token` (1-hour TTL). The layout server uses `onboarding_id` to load the `user_onboarding` row and compute the current step.

## Onboarding State Machine

The state machine lives in `apps/plant/src/routes/+layout.server.ts`. It reads the `user_onboarding` row and returns a `step` field based on which milestones are complete:

```typescript
let step = "profile";
if (!result.profile_completed_at) {
  step = "profile";
} else if (!result.email_verified) {
  step = "verify-email";
} else if (!result.plan_selected) {
  step = "plans";
} else if (!result.payment_completed_at && result.plan_selected !== "wanderer") {
  step = "checkout";
} else if (!result.tenant_id) {
  step = "success";
} else if (!result.tour_completed_at && !result.tour_skipped) {
  step = "tour";
} else {
  step = "success";
}
```

Each page's `+page.server.ts` also guards itself. The profile page redirects to `/plans` if the profile is already done. The plans page redirects to `/profile` if it isn't. The checkout page redirects to `/success` for the free Wanderer tier. This means the state machine runs twice on every navigation: once in the layout, once in the page loader. Both must agree, or you get redirect loops.

The Wanderer (free tier) path is worth noting. When `plan_selected === "wanderer"`, the checkout step is skipped entirely. The `shouldSkipCheckout()` helper in `$lib/server/onboarding-helper.ts` handles this check. The user goes straight from plan selection to the success page.

### Key Database Columns

The `user_onboarding` table tracks progression through these timestamp columns:

| Column | Set When |
|--------|----------|
| `auth_completed_at` | OAuth callback succeeds |
| `profile_completed_at` | Profile form submitted |
| `email_verified` | 6-digit code verified or OAuth provider confirmed email |
| `plan_selected` | Plan form submitted |
| `payment_completed_at` | Stripe webhook fires or comped invite claimed |
| `tenant_id` | `createTenant()` completes |
| `tour_completed_at` / `tour_skipped` | Tour finished or skipped |

## Auth and Identity Resolution

The OAuth callback at `/auth/callback` does more than create a session. It resolves the user's identity across three fallback strategies:

1. Look up `user_onboarding` by `groveauth_id` (primary)
2. Fall back to email lookup if the GroveAuth ID changed (happens after Better Auth migrations)
3. Check the `users` and `tenants` tables for pre-Plant users who already have blogs

If a pre-Plant user is found with an active tenant, the callback redirects them straight to `https://{subdomain}.grove.place/arbor` instead of starting onboarding.

For new users, the callback creates the `user_onboarding` row and redirects to `/auth/setup-passkey`. If the OAuth provider already verified the email (like Google does), the record is created with `email_verified = 1` and `email_verified_via = 'oauth'`, which lets the user skip the verification step later.

## Username Validation (Loam)

Username checking happens at `GET /api/check-username?username=...`. Loam is the name for this validation system. It runs seven checks in fail-fast order:

1. **Length** -- 3 to 30 characters
2. **Pattern** -- `/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/` (starts with letter, no consecutive hyphens, no trailing hyphen)
3. **Offensive filter** -- `containsOffensiveContent()` from the private blocklist. Returns a generic "not available" with no suggestions to avoid revealing what was blocked.
4. **Domain blocklist** -- `isUsernameBlocked()` checks system names, Grove services, trademarks, impersonation terms, and fraud patterns. Returns a category-specific message with suggestions.
5. **Database reserved** -- Checks the `reserved_usernames` table for entries not covered by the hardcoded list
6. **Existing tenant** -- Checks `tenants.subdomain`
7. **In-progress signup** -- Checks `user_onboarding.username` for records less than 1 hour old that don't have a tenant yet

When a username is taken or reserved, the API generates up to three suggestions by appending suffixes like `-writes`, `-blog`, or the current year. Suggestions are validated against the same blocklist before being returned.

### Rate Limiting

Username checks are rate-limited to 30 requests per 60-second window, keyed by client IP. The rate limiter uses KV with sliding window counters:

```
Key:   rate:username-check:{clientIp}
Value: { count: number, resetAt: unixTimestamp }
TTL:   windowSeconds + 60s buffer
```

If KV is unavailable (local dev or outage), the limiter fails open. Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) are included on every response.

### Server-Side Double Check

The profile form action in `/profile/+page.server.ts` re-validates the username server-side before saving. It checks `reserved_usernames` and `tenants.subdomain` again, independent of the client-side check. This prevents race conditions where two people check the same username simultaneously.

## Email Verification

After profile completion, Plant sends a 6-digit verification code via Zephyr (the email service). The verification system lives in `$lib/server/email-verification.ts`.

The flow:
1. Page load at `/verify-email` checks for an existing unexpired code
2. If none exists and rate limits allow, a new code is created and emailed automatically
3. The user submits the code to `POST /api/verify-email`
4. The `verifyCode()` function checks the `email_verifications` table, marks it verified, and updates `user_onboarding.email_verified`

Codes expire (configurable). Failed attempts are tracked per code, with a max-attempts limit that returns a 429 status.

Users who sign in through an OAuth provider that already verified their email (Google, GitHub) skip this step entirely. The callback sets `email_verified = 1` and `email_verified_via = 'oauth'` at account creation time.

## Payment Flow

### Stripe Checkout

When the user hits the checkout page and clicks pay, the client-side code POSTs to `/checkout` (the `+server.ts` endpoint). That endpoint:

1. Loads the onboarding record to get plan, billing cycle, and email
2. Checks for a comped invite first (redirects to `/comped` if found)
3. Looks up the Stripe price ID from the hardcoded `STRIPE_PRICES` map in `$lib/server/stripe.ts`
4. Creates a Stripe Checkout Session via the REST API (no Stripe SDK, just `fetch`)
5. Stores the `stripe_checkout_session_id` on the onboarding record
6. Returns the Stripe-hosted checkout URL for the client to redirect to

The checkout session includes metadata (`onboarding_id`, `username`, `plan`, `billing_cycle`) that the webhook handler uses to match the payment back to the right user. This metadata is set on both the session and the subscription so it survives beyond checkout.

```typescript
const session = await createCheckoutSession({
  stripeSecretKey,
  priceId,
  customerEmail: onboarding.email,
  onboardingId: onboarding.id,
  username: onboarding.username,
  plan,
  billingCycle,
  successUrl: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancelUrl: `${baseUrl}/plans`,
});
```

Stripe Tax is enabled (`automatic_tax[enabled]: true`), billing address collection is required, and promotion codes are allowed.

### Webhook Processing

The webhook handler at `/api/webhooks/stripe` processes six event types:

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Creates tenant, links Stripe IDs to onboarding |
| `customer.subscription.created` | Logged only (tenant creation happens in checkout handler) |
| `customer.subscription.updated` | Updates `platform_billing` status and period |
| `customer.subscription.deleted` | Sets billing status to `cancelled` |
| `invoice.paid` | Sets status to `active`, sends receipt email on first payment |
| `invoice.payment_failed` | Sets status to `past_due`, sends failure notification |

Signature verification uses HMAC-SHA256 with constant-time comparison (`secureCompare()`). The handler supports Stripe's secret rotation by checking all `v1` signatures in the header.

Every webhook event is stored in the `webhook_events` table with a 120-day expiry. Duplicate events are detected by `provider_event_id` and skipped if already processed. Failed events get their error recorded and `retry_count` incremented.

The webhook payloads are sanitized before storage using `sanitizeStripeWebhookPayload()` to remove PII (GDPR/PCI DSS compliance).

### Tenant Creation (from webhook)

When `checkout.session.completed` fires with `payment_status === "paid"`:

1. Extracts `onboarding_id` from session metadata
2. Checks for an existing tenant (idempotent)
3. Calls `createTenant()` which inserts into `tenants`, `platform_billing`, `site_settings`, and creates default home/about pages
4. Updates `user_onboarding` with `tenant_id` and `payment_completed_at`

The `createTenant()` function in `$lib/server/tenant.ts` does six things in sequence:
- Inserts the tenant row (with username as subdomain, default theme, accent color)
- Creates a `platform_billing` record
- Seeds four `site_settings` entries (title, description, accent color, font)
- Links the onboarding record via `tenant_id`
- Creates a default home page with welcome content
- Creates a default about page

## Comped Invites

Comped (free) invites bypass Stripe entirely. They're stored in the `comped_invites` table with an email, tier, invite type (`comped` or `beta`), custom message, and invite token.

The flow has two entry points:

**Invite link entry** (`/invited?token=...`): The invited page looks up the invite by token, pre-fills the sign-in form with the invitee's email, and starts the normal auth flow.

**Auto-detection during plan selection**: The plans page's `+page.server.ts` checks `comped_invites` by email. If a match is found, it auto-sets the plan from the invite tier and redirects to `/comped`.

The `/comped` page shows the invite details and a "Claim" button. The claim action:
1. Creates the tenant using the invite's tier (not the selected plan)
2. Sets `payment_completed_at` on the onboarding record
3. Marks the invite as used with `used_at` and `used_by_tenant_id`
4. Writes an audit log entry to `comped_invites_audit`

There's also a JSON API at `POST /api/claim-comped` that does the same thing, used by client-side flows. Both endpoints are idempotent: if a tenant already exists, they return success without creating a duplicate.

## Tenant Provisioning Polling

After payment (or claiming a comped invite), the user lands on `/success`. The success page polls `GET /success/check` to detect when the tenant is ready:

```json
// Not ready yet (payment received, tenant being created)
{ "ready": false, "creating": true }

// Ready
{ "ready": true, "subdomain": "autumn" }

// Payment not yet confirmed (webhook hasn't fired)
{ "ready": false, "creating": false }
```

The check endpoint joins `user_onboarding` with `tenants` to see if `tenant_id` is set and the tenant row exists. The client polls this until `ready: true`, then shows a link to `https://{subdomain}.grove.place/arbor`.

## Error System

Plant uses structured error codes in the `PLANT-XXX` format, defined in `$lib/errors.ts`. The ranges are:

| Range | Category |
|-------|----------|
| 001-019 | Service and binding errors (DB, Auth, Stripe, KV) |
| 020-039 | Session and auth errors |
| 040-059 | Database and onboarding errors |
| 060-079 | Webhook errors |
| 080-099 | Internal/catch-all |

Each error has a `userMessage` (safe to display) and an `adminMessage` (for logs, often includes fix instructions). The `logPlantError()` function wraps the shared `logGroveError()` helper, and `buildPlantErrorUrl()` creates redirect URLs with `error` and `error_code` query params.

## Why Things Break

**Redirect loops between pages.** Both the layout and page loaders compute the current step. If their logic disagrees (e.g., one checks `emailVerified` and the other checks `email_verified`), you get infinite redirects. Always check both files when modifying step progression.

**Webhook never fires after payment.** The tenant isn't created until the `checkout.session.completed` webhook arrives. If the webhook secret is wrong, the signature check fails silently (returns 401 to Stripe). Check `STRIPE_WEBHOOK_SECRET` in Cloudflare Dashboard. Look at the `webhook_events` table for stored events with `processed = 0`.

**User stuck on success page (polling forever).** The `createTenant()` call might have failed inside the webhook handler. Check the `webhook_events` table for the relevant event and its `error` column. Common causes: duplicate subdomain in `tenants`, missing columns after a migration.

**Username shows available but profile save fails.** The client-side check and server-side check are independent queries. Between the check and the save, someone else could have claimed the username. The profile action re-validates and returns a 400 if the username is now taken.

**Comped user sent to Stripe.** The comped invite check in the plans page loader only fires if the DB binding is available and the email matches. Case sensitivity matters: the lookup uses `.toLowerCase()`. If the invite email has different casing than the OAuth email, the match fails.

**Email verification code not arriving.** Check that `ZEPHYR_API_KEY` is set. The verify-email page auto-sends a code on load, but only if no unexpired code exists and rate limits allow. Rate limit state lives in KV.

**Pre-Plant user gets stuck in onboarding.** The auth callback checks `users` and `tenants` tables for existing users without `user_onboarding` records. If those lookups fail (table doesn't exist, query error), the user falls through to new-user creation. The callback logs warnings for these fallback failures.

## Key Files

| File | Purpose |
|------|---------|
| `apps/plant/src/routes/+layout.server.ts` | State machine, step computation |
| `apps/plant/src/routes/auth/callback/+server.ts` | OAuth callback, identity resolution |
| `apps/plant/src/routes/profile/+page.server.ts` | Profile form with server-side username validation |
| `apps/plant/src/routes/verify-email/+page.server.ts` | Email verification page, auto-sends code |
| `apps/plant/src/routes/api/check-username/+server.ts` | Loam username validation API |
| `apps/plant/src/routes/api/verify-email/+server.ts` | Code verification endpoint |
| `apps/plant/src/routes/plans/+page.server.ts` | Plan selection, comped invite detection |
| `apps/plant/src/routes/checkout/+server.ts` | Stripe session creation |
| `apps/plant/src/routes/api/webhooks/stripe/+server.ts` | Webhook handler, tenant creation |
| `apps/plant/src/routes/comped/+page.server.ts` | Comped invite claim flow |
| `apps/plant/src/routes/success/check/+server.ts` | Tenant readiness polling |
| `apps/plant/src/lib/server/stripe.ts` | Price IDs, checkout, webhook verification |
| `apps/plant/src/lib/server/tenant.ts` | `createTenant()` and `getTenantForOnboarding()` |
| `apps/plant/src/lib/server/onboarding-helper.ts` | `shouldSkipCheckout()` for free tier |
| `apps/plant/src/lib/errors.ts` | PLANT-XXX error codes |
| `apps/plant/src/lib/server/email-verification.ts` | Code generation, verification, rate limits |

## Quick Checklist

When working on Plant, verify these things:

- [ ] State machine in layout and page loaders agree on step progression
- [ ] Username validation runs both client-side (API check) and server-side (form action)
- [ ] Stripe price IDs in `$lib/server/stripe.ts` match Stripe Dashboard
- [ ] Environment variables are set: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ZEPHYR_API_KEY`
- [ ] Cloudflare bindings configured: `DB` (D1), `KV` (rate limiting), `AUTH` (GroveAuth service binding)
- [ ] Webhook idempotency: `checkout.session.completed` checks for existing tenant before creating
- [ ] Comped invite lookup uses `.toLowerCase()` on email
- [ ] The `createTenant()` function seeds default pages and settings
- [ ] Free tier (Wanderer) skips checkout via `shouldSkipCheckout()`
- [ ] Error codes follow the PLANT-XXX format with correct ranges
