---
aliases: []
date created: Saturday, February 21st 2026
date modified: Saturday, February 21st 2026
tags:
  - plant
  - onboarding
  - billing
  - auth
type: tech-spec
---

```
          🌱         🌱
         /|\        /|\
        / | \      / | \
       /  |  \    /  |  \
      ·   |   ·  ·   |   ·
          |          |
     ─────┴──────────┴─────
    ╱                       ╲
   ╱    welcome, wanderer    ╲
  ╱   your grove is waiting   ╲
 ╱─────────────────────────────╲
 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
 ·····························
```

> _The front door to the grove. Come in, take root, grow._

# Plant: Grove Onboarding

> _The front door to the grove. Come in, take root, grow._

Plant is Grove's onboarding application. It guides new Wanderers from their first sign-in through profile creation, plan selection, payment, and tenant provisioning. By the end of the flow, a new blog exists at `username.grove.place` and a welcome email sequence has begun.

**Public Name:** Plant
**Internal Name:** grove-plant
**Domain:** `grove.place/` (served via grove-router)
**Location:** `apps/plant/` in the Lattice monorepo
**Last Updated:** February 2026

Plant is a seedling pushing through soil. It is the first thing a Wanderer touches. The soil is Lattice's shared infrastructure (Engine, Heartwood, Zephyr). Plant does not carry its own weight. It reaches upward and lets the roots do the work.

---

## Overview

### What This Is

Plant is a SvelteKit app deployed as Cloudflare Pages. It handles the onboarding funnel: authenticate via Heartwood, build a profile, verify email, pick a plan, pay via Stripe, and provision a tenant. Plant is a thin frontend over Engine's shared D1 database and Heartwood's auth service.

### Goals

- Guide Wanderers through onboarding with warmth and clarity
- Collect profile, plan, and payment information in a linear flow
- Provision tenants automatically on completion
- Kick off the welcome email sequence via Zephyr
- Support invited (beta) and comped (free premium) flows alongside the standard path

### Non-Goals (Out of Scope)

- Marketing pages (handled by Landing at `apps/landing/`)
- Admin panel and tenant management (handled by Arbor in `apps/landing/`)
- Blog editing, post management, or content features (handled by Engine)
- Support and feedback (handled by the Porch, see `docs/specs/porch-spec.md`)
- File storage and media management (handled by Amber, see `docs/specs/amber-spec.md`)

---

## Architecture

### System Context

```
Wanderer's Browser
      │
      ▼
grove-router (wildcard *.grove.place)
      │
      ├── grove.place/* ──────────────────→ Plant (apps/plant/)
      ├── login.grove.place/* ────────────→ Heartwood (services/heartwood/)
      ├── username.grove.place/* ─────────→ Engine (libs/engine/)
      └── porch.grove.place/* ────────────→ Porch
```

### Service Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Plant (grove-plant)                         │
│                         CF Pages · SvelteKit                        │
│                                                                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐         │
│  │  Profile  │  │  Plans    │  │ Checkout  │  │  Success  │         │
│  │  +page    │  │  +page    │  │  +page    │  │  +page    │         │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘         │
│        │               │               │            │               │
│        └───────────────┴───────────────┴────────────┘               │
│                                │                                    │
└────────────────────────────────┼────────────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
     ┌────────────────┐ ┌───────────────┐ ┌────────────────┐
     │   Heartwood    │ │   Engine D1   │ │    Zephyr      │
     │  (AUTH binding)│ │  (DB binding) │ │(ZEPHYR binding)│
     │                │ │               │ │                │
     │ Google OAuth   │ │ user_onboard  │ │ Welcome seq    │
     │ Magic links    │ │ tenants       │ │ Day 1,7,14,30  │
     │ Passkeys       │ │ billing       │ │ Beta invites   │
     │ 2FA (TOTP)     │ │ site_settings │ │                │
     └────────────────┘ └───────────────┘ └────────────────┘
              │
              ▼
     ┌────────────────┐
     │   KV Namespace │
     │                │
     │ Rate limiting  │
     │ (email verify) │
     └────────────────┘
```

### Tech Stack

| Component      | Technology                     | Why                                              |
| -------------- | ------------------------------ | ------------------------------------------------ |
| Framework      | SvelteKit 2.0+                 | Lattice standard, SSR + client hydration         |
| Deployment     | Cloudflare Pages               | Edge-deployed, integrates with D1/KV/R2 bindings |
| Database       | D1 (shared `grove-engine-db`)  | Single source of truth across all Grove services |
| Auth           | Heartwood (Better Auth 1.4.18) | Google OAuth, magic links, passkeys, 2FA         |
| Payments       | Stripe (hosted checkout)       | PCI compliant, auto tax, promo codes             |
| Email          | Zephyr gateway (Resend)        | React email templates, scheduled delivery        |
| Bot Protection | Shade (Cloudflare Turnstile)   | Bot mitigation on auth and verification flows    |
| Rate Limiting  | KV Namespace                   | Throttle email verification and API abuse        |
| Styling        | Tailwind CSS (Lattice preset)  | Shared design tokens, Grove color palette        |
| Font           | Lexend                         | Grove's standard typeface                        |
| Components     | `@autumnsgrove/lattice/ui`     | GlassCard, Logo, Footer, ThemeToggle, Icons      |
| Errors         | Signpost (PLANT_ERRORS)        | Structured error codes with catalog              |

### Bindings (wrangler.toml)

| Binding  | Type    | Target            | Purpose                          |
| -------- | ------- | ----------------- | -------------------------------- |
| `DB`     | D1      | `grove-engine-db` | Shared database for all services |
| `AUTH`   | Service | `groveauth`       | Heartwood session validation     |
| `ZEPHYR` | Service | `grove-zephyr`    | Email gateway                    |
| `KV`     | KV      | (namespace)       | Rate limiting                    |

### Secrets (Cloudflare Dashboard)

- `GROVEAUTH_URL` — Heartwood URL (`https://login.grove.place`)
- `GROVEAUTH_CLIENT_ID` — OAuth client ID (`grove-plant`)
- `GROVEAUTH_CLIENT_SECRET` — OAuth client secret
- `STRIPE_SECRET_KEY` — Stripe API key
- `STRIPE_PUBLISHABLE_KEY` — Stripe public key
- `STRIPE_WEBHOOK_SECRET` — Webhook signature verification
- `RESEND_API_KEY` — Email delivery
- `TURNSTILE_SECRET_KEY` — Shade bot protection

---

## Authentication

Plant does not handle auth directly. All authentication flows through Heartwood (`services/heartwood/`), Grove's auth service built on Better Auth 1.4.18.

### Auth Methods

| Method       | Status | Flow                                                                 |
| ------------ | ------ | -------------------------------------------------------------------- |
| Google OAuth | Live   | Primary. Redirect to Heartwood, OAuth2 + PKCE, callback with session |
| Magic Links  | Live   | Secondary. 10-minute expiry, delivered via Zephyr                    |
| Passkeys     | Live   | WebAuthn registration and authentication                             |
| 2FA (TOTP)   | Live   | Time-based one-time passwords                                        |

### Session Model

Heartwood issues dual session tokens:

1. `better-auth.session_token` — Better Auth's session cookie
2. `grove_session` — SessionDO bridge token for cross-service validation

Plant validates sessions by calling `AUTH.fetch("/session/validate")` via service binding. The layout server load (`+layout.server.ts`) checks for `onboarding_id` and `access_token` cookies to determine onboarding state.

### Auth Flow

```
Wanderer clicks "Sign in with Google"
    │
    ▼
Redirect to login.grove.place/oauth/google
    │
    ▼
Google OAuth consent screen
    │
    ▼
Callback to login.grove.place/auth/callback
    │
    ▼
Heartwood creates session, sets cookies
    │
    ▼
Redirect back to grove.place
    │
    ▼
Plant creates user_onboarding row, sets onboarding_id cookie
    │
    ▼
Onboarding begins at /profile
```

There are no passwords anywhere in Grove. The system is completely passwordless.

---

## Onboarding Flow

The core of Plant. A 6-step linear flow tracked by the `user_onboarding` table. Each step gates the next. The layout server determines the current step on every page load and redirects accordingly.

### Flow Diagram

```
  ┌─────────┐    ┌─────────┐    ┌──────────┐    ┌─────────┐    ┌──────────┐    ┌─────────┐
  │  Auth   │───▶│ Profile │───▶│  Verify  │───▶│  Plans  │───▶│ Checkout │───▶│ Success │
  │         │    │         │    │  Email   │    │         │    │          │    │  /Tour  │
  └─────────┘    └─────────┘    └──────────┘    └─────────┘    └──────────┘    └─────────┘
  Sign in via    Display name   Magic link      Wanderer or    Stripe hosted   createTenant()
  Heartwood      Username       verification    Seedling       checkout        Welcome emails
  (Google/       Favorite                       (2 of 5        (skipped for    Blog live at
   magic link)   color                          tiers live)    free plan)      user.grove.place
```

### Step Details

**Step 1: Auth** (`/` → redirects to Heartwood)

The Wanderer signs in via Google OAuth or magic link. On successful auth, Heartwood redirects back. Plant creates a `user_onboarding` row with `groveauth_id` and `email`, sets the `onboarding_id` cookie, and redirects to `/profile`.

**Step 2: Profile** (`/profile`)

- Display name (required)
- Username (required, becomes subdomain, checked against `reserved_usernames`)
- Favorite color (optional, used for personalization)

Username availability checked via `GET /api/check-username`. Saved via `POST /api/save-profile`. Sets `profile_completed_at` timestamp.

**Step 3: Verify Email** (`/verify-email`)

Magic link sent to the Wanderer's email via Zephyr. 10-minute expiry. Verification checked via `POST /api/verify-email`. Rate limited via KV to prevent abuse. Resend available via `POST /api/verify-email/resend`.

Sets `email_verified = true`, `email_verified_at`, and `email_verified_via` (magic-link or oauth).

**Step 4: Plans** (`/plans`)

Two plans currently available:

- **Wanderer** (free) — 25 posts, 100 MB storage
- **Seedling** ($8/mo, $81.60/yr) — 100 posts, 1 GB storage

Three more tiers are defined but not yet live (see Tiers section below).

Saved via `POST /api/select-plan`. Sets `plan_selected` and `plan_billing_cycle`.

**Step 5: Checkout** (`/checkout`)

Skipped entirely for the free (Wanderer) plan. For paid plans, creates a Stripe Checkout Session via `createCheckoutSession()` and redirects to Stripe's hosted checkout. On success, Stripe sends a webhook. Sets `payment_completed_at`.

**Step 6: Success / Tour** (`/success`, `/tour`)

Calls `createTenant()` to provision the blog. This:

1. Inserts into `tenants` (subdomain = username, plan, active)
2. Inserts into `platform_billing` (subscription status, period dates)
3. Inserts into `site_settings` (4 default settings: site_title, site_description, theme, accent_color)
4. Creates default home page and about page
5. Links `user_onboarding.tenant_id`

Then schedules the welcome email sequence via `scheduleWelcomeSequence()`.

The Wanderer can take a tour or skip to their new blog at `username.grove.place`.

### Alternate Flows

**Invited Flow** (`/invited`)

Beta invite codes. Wanderer enters a code, validates against the database, and proceeds through onboarding with the invited plan pre-selected.

**Comped Flow** (`/comped`)

Free premium access. Wanderer claims a comped slot via `POST /api/claim-comped`. Skips checkout, gets a paid tier for free.

### State Machine

The `user_onboarding` table tracks progress with timestamps:

```sql
profile_completed_at   → NULL until profile saved
email_verified         → 0 until verified
email_verified_at      → NULL until verified
plan_selected          → NULL until plan chosen
payment_completed_at   → NULL until paid (or plan is free)
tenant_id              → NULL until tenant provisioned
tour_completed_at      → NULL until tour done
tour_skipped           → 0 until skipped
```

The layout server (`+layout.server.ts`) reads these fields and computes the current step:

```
if (!profile_completed_at) → "profile"
else if (!email_verified) → "verify-email"
else if (!plan_selected) → "plans"
else if (!payment_completed_at && plan !== "free") → "checkout"
else if (!tenant_id) → "success"
else if (!tour_completed_at && !tour_skipped) → "tour"
else → "success"
```

---

## Route Structure

### Pages

| Route                 | Purpose                       | Auth Required |
| --------------------- | ----------------------------- | ------------- |
| `/`                   | Landing / auth redirect       | No            |
| `/profile`            | Display name, username, color | Yes           |
| `/verify-email`       | Email verification            | Yes           |
| `/plans`              | Plan selection                | Yes           |
| `/checkout`           | Stripe checkout redirect      | Yes           |
| `/success`            | Tenant provisioning           | Yes           |
| `/tour`               | Guided tour of new blog       | Yes           |
| `/invited`            | Beta invite code entry        | Yes           |
| `/comped`             | Claim comped access           | Yes           |
| `/account`            | Post-onboarding account page  | Yes           |
| `/auth/setup-passkey` | WebAuthn passkey registration | Yes           |

### API Routes

| Route                                      | Method | Purpose                         |
| ------------------------------------------ | ------ | ------------------------------- |
| `/auth`                                    | GET    | Initiate OAuth flow             |
| `/auth/callback`                           | GET    | OAuth callback from Heartwood   |
| `/auth/magic-link/callback`                | GET    | Magic link callback             |
| `/api/auth/magic-link`                     | POST   | Request magic link              |
| `/api/check-username`                      | GET    | Username availability check     |
| `/api/save-profile`                        | POST   | Save profile data               |
| `/api/verify-email`                        | POST   | Submit email verification       |
| `/api/verify-email/resend`                 | POST   | Resend verification email       |
| `/api/select-plan`                         | POST   | Save plan selection             |
| `/api/claim-comped`                        | POST   | Claim comped access             |
| `/api/webhooks/stripe`                     | POST   | Stripe webhook handler          |
| `/api/health/payments`                     | GET    | Payment system health check     |
| `/api/account/passkey/register-options`    | POST   | WebAuthn registration options   |
| `/api/account/passkey/verify-registration` | POST   | Verify passkey registration     |
| `/api/passkey/authenticate/options`        | POST   | WebAuthn auth options           |
| `/api/passkey/authenticate/verify`         | POST   | Verify passkey authentication   |
| `/success/check`                           | GET    | Poll tenant provisioning status |

---

## Billing

### Tier System

`libs/engine/src/lib/config/tiers.ts` (620 lines) is the single source of truth for all tier configuration. Each tier defines limits, features, rate limits, pricing, display names, and support levels.

| Tier      | Grove Name | Monthly | Yearly  | Posts | Storage | Status      |
| --------- | ---------- | ------- | ------- | ----- | ------- | ----------- |
| Free      | Wanderer   | $0      | —       | 25    | 100 MB  | Live        |
| Seedling  | Seedling   | $8      | $81.60  | 100   | 1 GB    | Live        |
| Sapling   | Sapling    | $12     | $122.40 | 250   | 5 GB    | Coming Soon |
| Oak       | Oak        | $25     | $255    | 1000  | 20 GB   | Future      |
| Evergreen | Evergreen  | $35     | $357    | 10000 | 100 GB  | Future      |

Only the first two tiers (Wanderer and Seedling) are currently available for selection.

### Tier Features Matrix

| Feature       | Wanderer  | Seedling  | Sapling     | Oak        | Evergreen     |
| ------------- | --------- | --------- | ----------- | ---------- | ------------- |
| Blog          | Yes       | Yes       | Yes         | Yes        | Yes           |
| Meadow access | Yes       | Yes       | Yes         | Yes        | Yes           |
| Drafts        | 5         | 15        | 50          | 200        | Unlimited     |
| Themes        | 3         | 5         | 10          | All        | All+Custom    |
| Nav pages     | 3         | 5         | 10          | 25         | Unlimited     |
| Custom domain | No        | No        | No          | Yes (BYOD) | Yes           |
| Email (Ivy)   | No        | No        | Forwarding  | Full       | Full          |
| AI writing    | No        | No        | 5,000 words | 25,000     | 100,000       |
| Analytics     | Basic     | Basic     | Standard    | Advanced   | Advanced      |
| Support       | Community | Community | Email       | Priority   | 8hrs+Priority |

### Stripe Integration

`apps/plant/src/lib/server/stripe.ts` (480 lines) handles all payment operations.

**Key functions:**

- `createCheckoutSession()` — Creates Stripe hosted checkout with metadata, auto tax collection, promo code support
- `verifyWebhookSignature()` — HMAC-SHA256 verification with constant-time comparison
- `createBillingPortalSession()` — Self-service billing management
- `mapSubscriptionStatus()` — Maps Stripe statuses to Grove statuses

**Price IDs** are hardcoded in the Stripe module (safe to commit, not secrets).

**Webhook Events Handled:**

| Event                           | Action                                   |
| ------------------------------- | ---------------------------------------- |
| `checkout.session.completed`    | Mark payment complete, update onboarding |
| `customer.subscription.updated` | Sync plan/status changes                 |
| `customer.subscription.deleted` | Mark subscription canceled               |
| `invoice.payment_succeeded`     | Log successful payment                   |
| `invoice.payment_failed`        | Log failed payment, notify               |

**Idempotency:** The `webhook_events` table stores processed event IDs to prevent duplicate handling.

### Payment Flow

```
Wanderer selects Seedling plan
    │
    ▼
POST /api/select-plan
    │ saves plan_selected, plan_billing_cycle
    ▼
GET /checkout
    │ +page.server.ts calls createCheckoutSession()
    ▼
Redirect to Stripe hosted checkout
    │ Stripe collects payment
    ▼
Stripe webhook: checkout.session.completed
    │ POST /api/webhooks/stripe
    │ verifyWebhookSignature()
    │ check webhook_events for idempotency
    │ update user_onboarding.payment_completed_at
    ▼
Wanderer returns to /success
    │ createTenant() provisions blog
    ▼
Blog live at username.grove.place
```

---

## Subdomain Provisioning

The spec used to describe DNS record creation, cert setup, and manual provisioning steps. Reality is much simpler.

### How It Actually Works

`grove-router` (`services/grove-router/`) catches all `*.grove.place` requests. When a request arrives for `username.grove.place`, grove-router looks up the `tenants` table for a matching subdomain and proxies to Engine. No DNS changes. No certificate management. No manual steps.

**Provisioning = inserting a row.**

```
createTenant(db, { username, plan, groveauthId })
    │
    ├── INSERT INTO tenants (subdomain = username, plan, active = true)
    ├── INSERT INTO platform_billing (subscription status, period dates)
    ├── INSERT INTO site_settings (title, description, theme, accent_color)
    ├── INSERT INTO pages (home page, about page)
    └── UPDATE user_onboarding SET tenant_id = new_tenant_id
    │
    ▼
username.grove.place is immediately live
grove-router resolves it on the next request
```

### Username Rules

- Checked against `reserved_usernames` table (protects system subdomains like `login`, `api`, `admin`)
- Must be unique across all tenants
- Validated client-side and server-side via `/api/check-username`

---

## Email Sequences

Plant triggers the welcome email sequence on successful onboarding via `scheduleWelcomeSequence()` in `libs/engine/src/lib/email/schedule.ts`.

### Sequence

| Email   | Timing    | Template           |
| ------- | --------- | ------------------ |
| Welcome | Immediate | `WelcomeEmail.tsx` |
| Day 1   | +1 day    | `Day1Email.tsx`    |
| Day 7   | +7 days   | `Day7Email.tsx`    |
| Day 14  | +14 days  | `Day14Email.tsx`   |
| Day 30  | +30 days  | `Day30Email.tsx`   |

Templates are React email components in `libs/engine/src/lib/email/sequences/`. Delivery via Zephyr (Resend gateway) with Resend's native `scheduled_at` for delayed sends. Idempotency keys prevent duplicate emails.

A separate `BetaInviteEmail.tsx` exists for the invited flow.

---

## Data Schema

Plant does not have its own database. It shares `grove-engine-db` (D1) with all Grove services. The tables Plant reads from and writes to:

### user_onboarding

The state machine for the onboarding flow. One row per signup attempt.

```sql
CREATE TABLE user_onboarding (
  id TEXT PRIMARY KEY,
  groveauth_id TEXT NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  username TEXT,
  favorite_color TEXT,
  interests TEXT,              -- JSON array
  profile_completed_at INTEGER,
  email_verified INTEGER DEFAULT 0,
  email_verified_at INTEGER,
  email_verified_via TEXT,     -- 'magic-link' or 'oauth'
  plan_selected TEXT,          -- 'free', 'seedling', etc.
  plan_billing_cycle TEXT,     -- 'monthly' or 'yearly'
  stripe_customer_id TEXT,
  stripe_checkout_session_id TEXT,
  payment_completed_at INTEGER,
  tenant_id TEXT,
  tour_completed_at INTEGER,
  tour_skipped INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### tenants

Created by `createTenant()` on successful onboarding. Multi-tenant record for the blog.

### platform_billing

Subscription status, provider references, billing period dates. Created alongside the tenant.

### reserved_usernames

System-protected subdomains. Checked during username selection.

### webhook_events

Stripe webhook idempotency. Stores processed event IDs to prevent duplicate handling.

---

## Error Handling

Plant uses the Signpost error system. All errors use structured codes from the `PLANT_ERRORS` catalog (`apps/plant/src/lib/errors.ts`, 216 lines).

### Error Catalog

| Code Range    | Category            | Examples                                             |
| ------------- | ------------------- | ---------------------------------------------------- |
| PLANT-001–019 | Service/Binding     | DB unavailable, AUTH unavailable, Zephyr unavailable |
| PLANT-020–039 | Session/Auth        | No session, invalid session, OAuth failed            |
| PLANT-040–059 | Database/Onboarding | Onboarding not found, username taken, plan invalid   |
| PLANT-080–099 | Internal            | Unexpected errors, configuration issues              |

### Error Handling Pattern

```typescript
import { PLANT_ERRORS } from "$lib/errors";
import { buildErrorJson, logGroveError } from "@autumnsgrove/lattice/errors";

// API route
if (!session) {
	return json(buildErrorJson(PLANT_ERRORS.NO_SESSION), { status: 401 });
}

// Server logging
logGroveError("Plant", PLANT_ERRORS.DB_QUERY_FAILED, {
	path: "/api/save-profile",
	cause: error,
});
```

---

## Security

### Authentication

- All auth via Heartwood. No local auth logic.
- Session validation on every authenticated page load via layout server
- Dual session tokens (`better-auth.session_token` + `grove_session`)
- Zero passwords. Completely passwordless.

### Bot Protection

- Shade (Cloudflare Turnstile) on auth and verification flows
- Turnstile site key in `wrangler.toml`, secret key in dashboard

### CSRF

- SvelteKit's built-in CSRF with trusted origins: `grove.place`, `*.grove.place`, `localhost`
- Additional origin validation in `hooks.server.ts`

### Rate Limiting

- KV-based rate limiting on email verification endpoints
- Prevents abuse of magic link and verification code flows

### Webhook Security

- Stripe webhook signature verification using HMAC-SHA256
- Constant-time comparison to prevent timing attacks
- Idempotency via `webhook_events` table

### Data Isolation

- Onboarding data scoped by `onboarding_id` cookie (not shared between sessions)
- Tenant data scoped by `tenant_id` after provisioning
- No cross-tenant data access possible through Plant

---

## Support

Plant does not include a support system. Support is handled by the Porch (`porch.grove.place`), Grove's dedicated support and feedback application.

The Porch provides warm, conversation-style support. Not tickets and SLAs, but porch conversations with the grove keeper. See `docs/specs/porch-spec.md` for the full specification.

---

## UI Components

Plant uses Lattice's shared component library. No custom design system.

### From `@autumnsgrove/lattice`

| Component             | Import Path                       | Usage                   |
| --------------------- | --------------------------------- | ----------------------- |
| `GlassCard`           | `@autumnsgrove/lattice/ui`        | Step containers         |
| `Logo`                | `@autumnsgrove/lattice/ui/chrome` | Header branding         |
| `Footer`              | `@autumnsgrove/lattice/ui/chrome` | Page footer             |
| `ThemeToggle`         | `@autumnsgrove/lattice/ui/chrome` | Light/dark mode         |
| `LoginRedirectButton` | `@autumnsgrove/lattice/ui`        | OAuth sign-in buttons   |
| Icons                 | `@autumnsgrove/lattice/ui/icons`  | UI icons                |
| Pricing utilities     | `@autumnsgrove/lattice/ui`        | Plan cards, comparisons |

### Design Standards

- **Font:** Lexend (Grove's standard)
- **Styling:** Tailwind CSS via Lattice preset (`libs/engine/src/lib/ui/tailwind.preset.js`)
- **Theme:** Nature-themed glassmorphism with seasonal depth
- **Aesthetic:** Studio Ghibli warmth meets indie bookshop

---

## Implementation Status

### Complete

- [x] Google OAuth flow via Heartwood
- [x] Magic link authentication
- [x] Passkey registration and authentication
- [x] Profile step (display name, username, favorite color)
- [x] Email verification with rate-limited resend
- [x] Plan selection (Wanderer and Seedling)
- [x] Stripe checkout integration with hosted checkout
- [x] Webhook handling with signature verification and idempotency
- [x] Tenant provisioning via `createTenant()`
- [x] Welcome email sequence (Welcome, Day1, Day7, Day14, Day30)
- [x] Invited flow (beta invite codes)
- [x] Comped flow (free premium)
- [x] Tour page
- [x] Account page
- [x] PLANT_ERRORS catalog (14 error definitions)
- [x] Shade (Turnstile) bot protection
- [x] CSRF protection with trusted origins
- [x] KV rate limiting

### Planned

- [ ] Sapling tier ($12/mo) — status: `coming_soon`
- [ ] Oak tier ($25/mo) — status: `future`
- [ ] Evergreen tier ($35/mo) — status: `future`
- [ ] Custom domain setup flow (Oak+)
- [ ] Billing portal integration in account page
- [ ] Account deletion flow
- [ ] Data export from account page
- [ ] Onboarding analytics (funnel tracking, drop-off analysis)

---

## Related Specs

| Spec                | Relationship                                             |
| ------------------- | -------------------------------------------------------- |
| `porch-spec.md`     | Support system. Plant links to it, does not replicate it |
| `amber-spec.md`     | Storage system. Tracks files uploaded via Engine         |
| `heartwood-spec.md` | Auth service. Plant delegates all auth here              |
| `rings-spec.md`     | Analytics. Onboarding funnel metrics                     |

---

_A seedling breaks through. The soil is warm. The roots are deep. Welcome to the grove._
