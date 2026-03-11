---
title: Plant — Tenant Onboarding
description: Multi-step onboarding flow for new Grove users
category: specs
specCategory: platform-services
icon: landplot
lastUpdated: '2026-03-11'
aliases: []
date created: Sunday, December 1st 2025
date modified: Tuesday, March 11th 2026
tags:
  - onboarding
  - signup
  - user-experience
  - stripe
  - authentication
type: tech-spec
---

```
                          .  ·  ☀️  ·  .
                       ·               ·
                      ·    ~~~  ~~~    ·
                     ·        💧        ·
                    ·                   ·
                              🌱
                         ───────────
                    ╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱
                   ~~~~~~~~~~~~~~~~~~~~~~~~
                ──────── prepared soil ────────

                Where new growth begins.
```

> *Seedlings start in prepared soil. We start new writers here.*

# Plant: Tenant Onboarding

Grove's complete onboarding system. A multi-step flow from OAuth sign-in through email verification, profile setup, plan selection, Stripe payment, tenant provisioning, interactive tour, and handoff to a live blog. Built for warmth — gets new Wanderers publishing within minutes.

**Public Name:** Plant
**Internal Name:** Plant
**Domain:** `plant.grove.place`
**Version:** 2.0 (Production)
**Last Updated:** March 2026

A seedbed is where seeds are planted and nurtured until they're ready to grow on their own. Plant is that seedbed: the carefully prepared soil where new Grove writers take root.

---

## Overview

### What This Is

Plant is a standalone SvelteKit app deployed to Cloudflare Workers at `plant.grove.place`. It manages the entire lifecycle of a new user — from first click through a fully provisioned blog. The flow is linear, stateful, and resumable. Users can close the browser and pick up where they left off.

### Goals

- Frictionless onboarding that respects the Wanderer's time
- Every step resumable — state persisted in D1, tracked via cookies
- Free tier (Wanderer) requires no credit card
- Paid tiers use Stripe Checkout with webhook-driven provisioning
- Seasonal atmosphere and glassmorphism throughout — it should feel like Grove from the first moment

### Non-Goals

- Self-hosted sign-up (Plant is the single entry point for all new tenants)
- Custom domain setup during onboarding (handled post-provisioning in Arbor)
- Trial periods (Wanderer tier is the permanent free path)

---

## Architecture

```
plant.grove.place (Plant App)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Browser                        Cloudflare Workers
───────                        ─────────────────

┌──────────┐  OAuth   ┌──────────────────────┐
│   /      │ ───────→ │ GroveAuth (Heartwood)│
│ Landing  │ ←─────── │ Better Auth OAuth     │
└────┬─────┘ callback └──────────────────────┘
     │
     ▼
┌──────────┐  POST    ┌──────────────────────┐
│ /profile │ ───────→ │ /api/save-profile    │
│ form     │          │ /api/check-username  │
└────┬─────┘          └──────────────────────┘
     │                          │
     ▼                          ▼
┌────────────┐        ┌─────────────────┐
│/verify-email│───────→│ email_verifications│
│ 6-digit code│       │ (D1 table)       │
└─────┬──────┘        └─────────────────┘
      │                         │
      ▼                         ▼
┌──────────┐  POST    ┌──────────────────────┐
│  /plans  │ ───────→ │ /api/select-plan     │
│ tier grid│          └──────────────────────┘
└────┬─────┘
     │
     ▼
┌──────────┐  POST    ┌──────────────────────┐
│/checkout │ ───────→ │ Stripe Checkout      │
│ redirect │          │ (hosted page)        │
└────┬─────┘          └──────────┬───────────┘
     │                           │ webhook
     ▼                           ▼
┌──────────┐  poll    ┌──────────────────────┐
│ /success │ ───────→ │ /api/webhooks/stripe │
│ (waiting)│          │ tenant provisioning  │
└────┬─────┘          └──────────────────────┘
     │                          │
     ▼                          ▼
┌──────────┐          ┌──────────────────────┐
│  /tour   │          │ D1: tenants,         │
│ 8 stops  │          │ platform_billing,    │
└────┬─────┘          │ site_settings, pages │
     │                └──────────────────────┘
     ▼
┌──────────────────────┐
│ username.grove.place  │
│ /arbor?welcome=true   │
└──────────────────────┘
```

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| App framework | SvelteKit 2, Svelte 5 runes | Shared with engine, SSR + client hydration |
| Runtime | Cloudflare Workers | Smart Placement for low D1 latency |
| Database | D1 (`grove-engine-db`) | Shared with engine — same tenants, users tables |
| Payment | Stripe Checkout + Webhooks | Hosted checkout, no PCI scope for Plant |
| Auth | Better Auth via GroveAuth (Heartwood) | OAuth 2.0, service binding for session validation |
| Email | Zephyr gateway → Resend | Verification codes, payment receipts |
| Rate limiting | KV namespace | Username checks, email resend throttling |
| UI | Engine components (GlassCard, Glass, Logo) | Glassmorphism, seasonal effects, shared tokens |
| Validation | Zod schemas + Rootwork parseFormData | Type-safe form boundaries |
| Error handling | Signpost PLANT-XXX codes | Structured, diagnosable, user-safe messages |

### Bindings

| Binding | Type | Purpose |
|---------|------|---------|
| `DB` | D1 | Core database (`grove-engine-db`) |
| `KV` | KV Namespace | Rate limiting |
| `AUTH` | Service | GroveAuth session validation |
| `ZEPHYR` | Service | Email gateway |
| `STRIPE_SECRET_KEY` | Secret | Stripe API authentication |
| `STRIPE_WEBHOOK_SECRET` | Secret | Webhook signature verification |
| `GROVEAUTH_CLIENT_SECRET` | Secret | OAuth client credentials |
| `ZEPHYR_API_KEY` | Secret | Email gateway auth |
| `TURNSTILE_SECRET_KEY` | Secret | Shade human verification |

---

## Onboarding Flow

The flow is a 6-step linear journey. Each step is a separate route. The layout server loads onboarding state from D1 on every request, determines the current step, and child routes redirect if visited out of order.

### Step Progression

```
┌───────┐   ┌─────────┐   ┌────────┐   ┌───────┐   ┌──────────┐   ┌─────────┐   ┌───────┐   ┌──────┐
│Sign In│ → │ Passkey  │ → │Profile │ → │Verify │ → │  Plans   │ → │Checkout │ → │Success│ → │ Tour │
│  /    │   │  Setup   │   │/profile│   │ Email │   │ /plans   │   │/checkout│   │/success│  │/tour │
└───────┘   └─────────┘   └────────┘   └───────┘   └─────────┘   └─────────┘   └────────┘  └──────┘
  OAuth       Optional      Name,        6-digit     Wanderer/     Stripe        Provision    8-stop
  via         passkey       username,     code via    Seedling/     hosted        tenant,      walkthrough
  Heartwood   enrollment    color,        Zephyr      Sapling/      checkout      poll for     of Grove
                           interests                  Oak/                        readiness    features
                                                     Evergreen
```

**Step state machine** (from `+layout.server.ts`):

| State | Condition | Current Step |
|-------|-----------|-------------|
| No profile | `!profile_completed_at` | `profile` |
| Unverified email | `!email_verified` | `verify-email` |
| No plan | `!plan_selected` | `plans` |
| Unpaid (non-Wanderer) | `!payment_completed_at && plan !== 'wanderer'` | `checkout` |
| No tenant | `!tenant_id` | `success` |
| No tour | `!tour_completed_at && !tour_skipped` | `tour` |
| Complete | everything done | `success` |

**Resumability:** Onboarding state is stored in D1 (`user_onboarding` table) and identified by an `onboarding_id` cookie. Users can close the browser, return days later, and pick up exactly where they left off.

---

## Routes

### Pages

| Route | Purpose | Auth Required | Key Logic |
|-------|---------|---------------|-----------|
| `/` | Landing page | No | Features, plan previews, "Get Started" CTA → OAuth |
| `/profile` | Name, username, color, interests | Yes | Real-time username availability, Zod validation |
| `/verify-email` | 6-digit code entry | Yes | Auto-submit on 6 digits, rate-limited resend |
| `/plans` | Plan selection grid | Yes | GrowthCard components, billing toggle, Wanderer free path |
| `/checkout` | Order summary → Stripe redirect | Yes | Auto-creates checkout session, redirects to Stripe |
| `/success` | Tenant creation status | Yes | Polls `/success/check` until tenant ready |
| `/tour` | 8-stop interactive walkthrough | Yes | Swipe/keyboard nav, skip confirmation, step dots |
| `/comped` | Invitation-comped welcome | Yes | Bypasses Stripe for invited users |
| `/invited` | Invitation landing | Depends | Validates invite token, fast-tracks onboarding |
| `/account` | Post-onboarding account management | Yes | Billing portal, account details |
| `/auth/setup-passkey` | Optional passkey enrollment | Yes | WebAuthn registration after first OAuth |

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/check-username` | GET | Username availability with blocklist, rate limiting, suggestions |
| `/api/save-profile` | POST | Save profile data to `user_onboarding` |
| `/api/verify-email` | POST | Verify 6-digit email code |
| `/api/verify-email/resend` | POST | Resend verification code (rate limited) |
| `/api/select-plan` | POST | Save plan selection, redirect path |
| `/api/claim-comped` | POST | Claim a comped/invited subscription |
| `/api/health/payments` | GET | Stripe connectivity health check |
| `/api/webhooks/stripe` | POST | Stripe webhook handler (6 event types) |
| `/api/auth/magic-link` | POST | Magic link authentication |
| `/api/account/passkey/*` | POST | Passkey registration/verification |
| `/api/passkey/authenticate/*` | POST | Passkey authentication flow |
| `/checkout` | POST | Create Stripe checkout session |
| `/success/check` | GET | Poll tenant creation status |
| `/auth` | GET | OAuth initiation |
| `/auth/callback` | GET | OAuth callback, session creation, onboarding record |
| `/auth/magic-link/callback` | GET | Magic link verification callback |

---

## Authentication

Plant uses GroveAuth (Heartwood) via Better Auth for authentication. The flow:

1. User clicks "Get Started" on the landing page
2. `LoginRedirectButton` sends them to GroveAuth's OAuth consent screen
3. GroveAuth handles Google OAuth or magic link
4. Callback at `/auth/callback` receives the session
5. Plant verifies the Better Auth session cookie via service binding
6. Creates or finds the `user_onboarding` record in D1
7. Sets `onboarding_id` and `access_token` cookies
8. Redirects to the appropriate step

**Identity resolution** (in `/auth/callback`):
- Primary: lookup by `groveauth_id` in `user_onboarding`
- Fallback 1: lookup by email (handles Better Auth ID changes)
- Fallback 2: check `users`/`tenants` tables (pre-Plant users → redirect to Arbor)

**Post-OAuth for new users:** Redirects to `/auth/setup-passkey` for optional passkey enrollment before profile setup.

---

## Username Validation

Username is the subdomain (`username.grove.place`). Validation is multi-layered:

**Format Rules:**
- 3–30 characters
- Lowercase alphanumeric and hyphens only
- Must start with a letter
- No consecutive hyphens, no trailing hyphen
- Regex: `/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/`

**Blocklist Layers:**

| Layer | Source | Check |
|-------|--------|-------|
| Domain blocklist | `@autumnsgrove/lattice/config/domain-blocklist` | System routes, infrastructure, trademarks |
| Offensive filter | `@autumnsgrove/lattice/config/offensive-blocklist` | Slurs, hate speech (no suggestions offered) |
| Reserved table | `reserved_usernames` (D1) | Database-level reservations |
| Existing tenants | `tenants` table | Already-taken subdomains |
| In-progress | `user_onboarding` table | Recently claimed (1-hour window) |

**Rate Limiting:** 30 requests/minute per IP via KV, with `X-RateLimit-*` headers.

**Suggestions:** When taken, offers up to 3 alternatives (e.g., `autumn-writes`, `autumn-blog`, `autumn2026`). No suggestions for offensive terms.

---

## Email Verification

After profile completion, users verify their email with a 6-digit code sent via Zephyr.

**Code Generation:**
- Cryptographically secure 6-digit code (`crypto.getRandomValues`)
- 15-minute expiry
- Max 5 attempts per code
- Rate limited: 3 resends per hour (KV-backed)

**Verification Methods:**
- `code` — Manual entry of 6-digit code from email
- `oauth` — Auto-verified if OAuth provider confirms email (e.g., Google)

**Auto-submit:** The UI auto-submits when 6 digits are entered. No button press needed.

**Storage:** `email_verifications` table (D1) with `user_id`, `code`, `expires_at`, `attempts`, `verified_at`.

---

## Plan Selection

Plans are defined in the shared tier config (`@autumnsgrove/lattice/config`) and rendered via `GrowthCard` components from the upgrades graft.

### Available Plans

| Plan | Monthly | Yearly | Status |
|------|---------|--------|--------|
| **Wanderer** | Free | — | Available |
| **Seedling** | $8/mo | ~$81/yr | Available |
| **Sapling** | $12/mo | ~$122/yr | Coming Soon |
| **Oak** | $25/mo | ~$255/yr | Coming Soon |
| **Evergreen** | $35/mo | ~$357/yr | Future |

**Billing toggle:** Monthly ↔ Annual with ~15% annual savings. Uses shared `PricingToggle` component.

**Wanderer path:** Selecting Wanderer skips checkout entirely — goes directly to `/success` where tenant is provisioned without Stripe.

---

## Payment (Stripe Integration)

### Stripe Checkout

Plant uses Stripe's hosted checkout page (redirect-based, not embedded). No Stripe.js loaded on Plant pages.

**Checkout Session Creation** (`/checkout` POST):

```typescript
const body = new URLSearchParams({
  mode: 'subscription',
  'line_items[0][price]': priceId,
  'line_items[0][quantity]': '1',
  customer_email: email,
  'automatic_tax[enabled]': 'true',
  billing_address_collection: 'required',
  allow_promotion_codes: 'true',
  'metadata[onboarding_id]': onboardingId,
  'metadata[username]': username,
  'metadata[plan]': plan,
  'metadata[billing_cycle]': billingCycle,
  success_url: `${appUrl}/success`,
  cancel_url: `${appUrl}/plans`,
});
```

**Price IDs:** Hardcoded in `apps/plant/src/lib/server/stripe.ts` (not secrets — visible in Stripe URLs). One ID per plan per billing cycle (8 total for 4 paid tiers × monthly/yearly).

### Webhook Handler

**Endpoint:** `/api/webhooks/stripe`

**Security:**
- HMAC-SHA256 signature verification with constant-time comparison
- Supports signature rotation (multiple `v1` signatures)
- 5-minute timestamp tolerance (replay protection)
- Idempotent: `webhook_events` table tracks processed events by `provider_event_id`
- Payloads sanitized before storage (PII removal for GDPR/PCI)
- 120-day auto-expiry on stored events

**Handled Events:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create tenant, update onboarding |
| `customer.subscription.created` | Logged (tenant creation handled by checkout) |
| `customer.subscription.updated` | Update `platform_billing` status and period |
| `customer.subscription.deleted` | Set status to `cancelled` |
| `invoice.paid` | Set status to `active`, send receipt email (first payment only) |
| `invoice.payment_failed` | Set status to `past_due`, send failure notification email |

### Billing Portal

**Source:** `createBillingPortalSession()` in `stripe.ts`

Accessible from `/account` — creates a Stripe Billing Portal session for plan changes, payment updates, invoice history, and cancellation.

---

## Tenant Provisioning

When payment completes (webhook or direct for Wanderer), `createTenant()` provisions:

1. **Tenant record** — `tenants` table with subdomain, display name, email, plan, accent color
2. **Billing record** — `platform_billing` table linking Stripe customer/subscription IDs
3. **Site settings** — Default `site_title`, `site_description`, `accent_color`, `font_family`
4. **Home page** — Default welcome page with markdown content and hero section
5. **About page** — Placeholder about page with edit link
6. **Onboarding link** — Updates `user_onboarding.tenant_id`

**Success page polling:** After Stripe redirects back, `/success` polls `/success/check` every second (up to 30 seconds) waiting for the webhook to finish provisioning. Shows animated bouncing dots during the wait.

---

## Interactive Tour

An 8-stop client-side walkthrough at `/tour`. Uses static tour stop definitions with GlassCard display, progress bar, and step navigation.

### Tour Stops

| # | ID | Title | Content |
|---|-----|-------|---------|
| 1 | `welcome` | Welcome to the Tour! | Introduction to what we'll explore |
| 2 | `homepage` | Your Blog Homepage | How visitors experience the blog |
| 3 | `post` | Blog Posts | Markdown, images, margin notes |
| 4 | `vines` | Margin Notes | Sidebar annotations and linked thoughts |
| 5 | `admin` | Your Dashboard | Admin panel overview |
| 6 | `editor` | The Post Editor | Markdown + live preview editor |
| 7 | `real-example` | See It In Action | Link to autumnsgrove.com |
| 8 | `complete` | You're Ready! | CTA to visit the new blog |

**Navigation:**
- Forward/back buttons
- Dot indicators (clickable)
- Keyboard: Arrow keys, Escape to skip
- Touch: Swipe left/right (50px threshold)
- Skip confirmation modal: "No problem! You can always revisit from your Help menu."

**Completion:** Redirects to `username.grove.place/admin?welcome=true&tour=complete` (or `tour=skipped`).

---

## Email System

Plant sends transactional emails via the Zephyr email gateway (service binding to `grove-zephyr` worker, backed by Resend).

### Email Types

| Email | Trigger | Template |
|-------|---------|----------|
| Verification code | Profile completed | 6-digit code, 15-min expiry |
| Payment received | `invoice.paid` (first payment only) | Amount, plan, next billing date |
| Payment failed | `invoice.payment_failed` | Update payment CTA |

**Template system:** `apps/plant/src/lib/server/email-templates.ts` and `verification-email-template.ts` provide structured HTML + plaintext templates.

**Zephyr client:** `import { ZephyrClient } from '@autumnsgrove/lattice/zephyr'` — unified email gateway with rate limiting and structured logging.

---

## Error Handling

All errors use Signpost codes with structured error definitions.

### Error Catalog (PLANT-XXX)

| Range | Category | Examples |
|-------|----------|---------|
| 001–019 | Service & binding | DB unavailable, AUTH missing, Stripe not configured, KV missing |
| 020–039 | Session & auth | Session fetch failed, magic link error, OAuth denied, no cookie |
| 040–059 | Database & onboarding | Query/insert/update failures, tenant lookup, cookie errors, email format |
| 060–079 | Webhooks | Signature invalid, processing failed, email degraded |
| 080–099 | Internal | Catch-all unhandled errors |

**Error helpers:**
- `logPlantError(error, context)` — Structured logging with `[Plant]` prefix
- `buildPlantErrorUrl(error, baseUrl)` — Redirect URL with `?error=` and `?error_code=` params
- Landing page renders auth errors from `?error=` query params

---

## OnboardingChecklist Component

**Source:** `apps/plant/src/lib/components/OnboardingChecklist.svelte`

A glassmorphism progress indicator showing the Wanderer's position in the onboarding journey. Used in the layout to provide visual context.

**Steps displayed:**
1. Tell us about yourself (profile)
2. Verify your email
3. Choose your path (plans)
4. Welcome home (success)

**Responsive:**
- Mobile: Compact horizontal stepper with colored circles and connector lines
- Desktop: Vertical detailed list with step labels, "You are here" indicator, and encouraging footer messages

---

## Security

### CSRF Protection

Custom CSRF middleware in `hooks.server.ts` using `validateCSRF()` from the engine. Validates origin headers for all state-changing methods (POST, PUT, DELETE, PATCH). Required because Plant sits behind `grove-router` where SvelteKit's built-in CSRF may not see the correct origin.

### Content Security Policy

Defined in `hooks.server.ts`, tuned for Stripe's redirect-based checkout:

```
default-src 'self'
script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com
style-src 'self' 'unsafe-inline'
img-src 'self' https://cdn.grove.place data: blob:
frame-src https://challenges.cloudflare.com
connect-src 'self' https://*.grove.place
frame-ancestors 'none'
```

### Security Headers

`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(), microphone=(), camera=()`, `Strict-Transport-Security` with preload.

### Webhook Security

- Stripe HMAC-SHA256 signature verification
- Constant-time comparison (`secureCompare()`) prevents timing attacks
- Replay protection via timestamp tolerance
- PII sanitization before payload storage
- Idempotent processing (duplicate event detection)

---

## Database Schema

Plant uses the shared `grove-engine-db` D1 database. Key tables:

### user_onboarding

Central state tracking for the onboarding flow.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | TEXT PK | Onboarding session UUID |
| `groveauth_id` | TEXT | Better Auth user ID |
| `email` | TEXT | User email |
| `display_name` | TEXT | Chosen display name |
| `username` | TEXT | Chosen subdomain |
| `favorite_color` | TEXT | Accent color hex |
| `interests` | TEXT | JSON array of interest IDs |
| `auth_completed_at` | INTEGER | OAuth timestamp |
| `profile_completed_at` | INTEGER | Profile form timestamp |
| `email_verified` | INTEGER | Boolean: verified or not |
| `email_verified_at` | INTEGER | Verification timestamp |
| `email_verified_via` | TEXT | `'code'` or `'oauth'` |
| `plan_selected` | TEXT | Chosen plan key |
| `plan_billing_cycle` | TEXT | `'monthly'` or `'yearly'` |
| `payment_completed_at` | INTEGER | Stripe payment timestamp |
| `stripe_customer_id` | TEXT | Stripe customer ID |
| `stripe_subscription_id` | TEXT | Stripe subscription ID |
| `tenant_id` | TEXT FK | Created tenant ID |
| `tenant_created_at` | INTEGER | Provisioning timestamp |
| `tour_completed_at` | INTEGER | Tour completion timestamp |
| `tour_skipped` | INTEGER | Boolean: skipped tour |
| `created_at` | INTEGER | Record creation |
| `updated_at` | INTEGER | Last modification |

### email_verifications

6-digit code storage with attempt tracking.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | TEXT PK | UUID |
| `user_id` | TEXT | Onboarding ID |
| `email` | TEXT | Target email address |
| `code` | TEXT | 6-digit verification code |
| `created_at` | INTEGER | Code generation timestamp |
| `expires_at` | INTEGER | Expiry timestamp (15 min) |
| `attempts` | INTEGER | Wrong attempts counter |
| `verified_at` | INTEGER | Successful verification (or -1 for invalidated) |

### reserved_usernames

Database-level username reservations (supplements code-level blocklist).

| Column | Type | Purpose |
|--------|------|---------|
| `username` | TEXT PK | Reserved username |
| `reason` | TEXT | Why reserved (system, trademark, offensive) |
| `created_at` | INTEGER | When reserved |

### webhook_events

Stripe event tracking for idempotency and debugging.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | TEXT PK | UUID |
| `provider` | TEXT | Always `'stripe'` |
| `provider_event_id` | TEXT | Stripe event ID |
| `event_type` | TEXT | Event type string |
| `payload` | TEXT | Sanitized JSON payload |
| `processed` | INTEGER | Boolean: successfully processed |
| `processed_at` | INTEGER | Processing timestamp |
| `error` | TEXT | Error message if failed |
| `retry_count` | INTEGER | Number of processing attempts |
| `created_at` | INTEGER | Event receipt timestamp |
| `expires_at` | INTEGER | Auto-cleanup timestamp (120 days) |

### Related Tables (shared with engine)

| Table | Purpose |
|-------|---------|
| `tenants` | Created during provisioning |
| `platform_billing` | Stripe subscription records |
| `site_settings` | Default settings created during provisioning |
| `pages` | Default home + about pages created during provisioning |

---

## File Structure

```
apps/plant/
├── src/
│   ├── app.css                          # Tailwind + engine styles
│   ├── app.d.ts                         # SvelteKit types (Platform.Env bindings)
│   ├── app.html                         # HTML shell with font preload
│   ├── hooks.server.ts                  # CSRF, security headers, CSP
│   ├── lib/
│   │   ├── errors.ts                    # PLANT-XXX error catalog (25 codes)
│   │   ├── submit-form.ts              # JSON form submission helper
│   │   ├── components/
│   │   │   └── OnboardingChecklist.svelte  # Progress stepper component
│   │   ├── server/
│   │   │   ├── stripe.ts               # Stripe API (checkout, webhooks, portal)
│   │   │   ├── tenant.ts               # Tenant provisioning logic
│   │   │   ├── email-verification.ts   # 6-digit code generation & verification
│   │   │   ├── send-email.ts           # Zephyr email gateway client
│   │   │   ├── email-templates.ts      # Payment receipt/failure templates
│   │   │   ├── verification-email-template.ts  # Code email template
│   │   │   ├── onboarding-helper.ts    # shouldSkipCheckout() utility
│   │   │   └── free-account-limits.ts  # Wanderer tier enforcement
│   │   └── ui/
│   │       └── tier-icons.ts           # Icon mapping for plan cards
│   └── routes/
│       ├── +layout.server.ts           # Session + onboarding state loader
│       ├── +layout.svelte              # Header, stepper, footer, mobile menu
│       ├── +page.svelte                # Landing page (features, plans, auth CTA)
│       ├── profile/                    # Name, username, color, interests form
│       ├── verify-email/               # 6-digit code entry
│       ├── plans/                      # Plan selection grid
│       ├── checkout/                   # Order summary → Stripe redirect
│       ├── success/                    # Tenant creation + celebration
│       ├── tour/                       # 8-stop interactive walkthrough
│       ├── comped/                     # Invitation-comped welcome
│       ├── invited/                    # Invitation token handler
│       ├── account/                    # Post-onboarding account management
│       ├── auth/                       # OAuth flow + passkey setup
│       │   ├── callback/              # OAuth callback handler
│       │   ├── setup-passkey/         # WebAuthn registration
│       │   └── magic-link/callback/   # Magic link verification
│       └── api/                        # REST endpoints (see Routes section)
├── wrangler.toml                       # Cloudflare Workers config
├── svelte.config.js                    # Cloudflare adapter, CSRF origins
├── tailwind.config.js                  # Engine preset + content scanning
├── vite.config.ts                      # Port 5174, engine alias
├── package.json                        # @autumnsgrove/plant
└── tsconfig.json
```

---

## Testing

| File | Type | Coverage |
|------|------|---------|
| `email-verification.test.ts` | Unit | Code generation, verification, rate limiting |
| `free-account-limits.test.ts` | Unit | Wanderer tier feature limits |
| `onboarding-helper.test.ts` | Unit | shouldSkipCheckout logic |

---

## Configuration

### Environment Variables (wrangler.toml)

| Variable | Value | Purpose |
|----------|-------|---------|
| `TURNSTILE_SITE_KEY` | Public key | Shade human verification |
| `ZEPHYR_URL` | Worker URL | Email gateway endpoint |
| `GROVEAUTH_URL` | `https://login.grove.place` | OAuth provider |
| `GROVEAUTH_CLIENT_ID` | `grove-plant` | OAuth client |
| `SIGNUPS_ENABLED` | `"true"` | Kill switch for new signups |

### Secrets (via `gw secret apply`)

`GROVEAUTH_CLIENT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `ZEPHYR_API_KEY`

---

## Cross-App Integration

| System | How Plant Connects | Direction |
|--------|-------------------|-----------|
| **Landing** (`grove.place`) | "Get Started" CTAs link to `plant.grove.place` | Landing → Plant |
| **Login** (`login.grove.place`) | "Create account" link to `plant.grove.place` | Login → Plant |
| **GroveAuth** (Heartwood) | OAuth flow via service binding | Plant ↔ GroveAuth |
| **Engine** (`grove-engine-db`) | Shared D1 database — reads/writes tenants, settings, pages | Plant ↔ Engine |
| **Zephyr** (email gateway) | Service binding for transactional email | Plant → Zephyr |
| **Stripe** | Checkout redirect, webhook events | Plant ↔ Stripe |
| **Arbor** (admin panel) | Handoff: redirects to `username.grove.place/arbor?welcome=true` | Plant → Arbor |

---

## Implementation Status

| Layer | Status | Details |
|-------|--------|---------|
| **Landing page** | Complete | Seasonal effects, feature grid, plan previews, auth CTA |
| **OAuth flow** | Complete | Better Auth via GroveAuth, identity resolution, passkey setup |
| **Profile form** | Complete | Username availability, color picker, interests, Zod validation |
| **Email verification** | Complete | 6-digit codes, rate limiting, auto-submit, OAuth auto-verify |
| **Plan selection** | Complete | GrowthCard grid, billing toggle, Wanderer free path |
| **Stripe checkout** | Complete | Hosted checkout, auto-tax, promotion codes |
| **Webhook handler** | Complete | 6 event types, idempotent, PII sanitization |
| **Tenant provisioning** | Complete | Tenant, billing, settings, default pages |
| **Success page** | Complete | Polling, animated states, CTA buttons |
| **Tour** | Complete | 8 stops, swipe/keyboard nav, skip confirmation |
| **OnboardingChecklist** | Complete | Mobile/desktop responsive stepper |
| **Error system** | Complete | 25 PLANT-XXX codes across 4 ranges |
| **Email system** | Complete | Verification codes, payment notifications via Zephyr |
| **Invitation flow** | Complete | `/invited` and `/comped` routes |
| **Account management** | Complete | `/account` with billing portal |
| **Passkey support** | Complete | WebAuthn registration + authentication |

### Known Gaps

| Gap | Status | Notes |
|-----|--------|-------|
| Tour screenshots | Placeholder | Image slots show "Screenshot coming soon" — needs static captures |
| Follow-up emails | Not implemented | Day 1/3/7/30 check-in emails from spec not built |
| Onboarding checklist in Arbor | Not implemented | Post-signup checklist (write first post, customize theme) |
| Waystones | None | 0 Waystone instances in Plant |
| Funnel analytics | Not implemented | No conversion tracking between steps |
| Drizzle ORM | Not started | All queries use raw D1 `.prepare()` |

---

## Related Files

**Core Implementation:**
- `apps/plant/src/routes/auth/callback/+server.ts` — OAuth callback (407 lines)
- `apps/plant/src/routes/api/webhooks/stripe/+server.ts` — Webhook handler (548 lines)
- `apps/plant/src/lib/server/stripe.ts` — Stripe API client (497 lines)
- `apps/plant/src/lib/server/tenant.ts` — Tenant provisioning (186 lines)
- `apps/plant/src/lib/server/email-verification.ts` — Code verification (389 lines)
- `apps/plant/src/lib/errors.ts` — Error catalog (295 lines)

**Configuration:**
- `apps/plant/wrangler.toml` — Cloudflare Workers deployment
- `apps/plant/svelte.config.js` — CSRF trusted origins
- `docs/setup/stripe-setup.md` — Stripe configuration guide

**Related Specs:**
- `docs/specs/heartwood-spec.md` — Authentication system
- `docs/specs/wanderer-plan-spec.md` — Free tier specification
- `docs/specs/loam-spec.md` — Username protection system

---

*Last Updated: March 2026*
