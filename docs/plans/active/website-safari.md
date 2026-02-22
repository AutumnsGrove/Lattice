# Website Spec Safari — The Map That Forgot the Territory

> The spec describes a house that was never built. The territory built something better.
> **Aesthetic principle**: Ground truth over aspiration
> **Scope**: `docs/specs/website-spec.md` vs the actual codebase (`apps/plant/`, `libs/engine/`, `services/heartwood/`, `services/grove-router/`, the Porch)

---

## Ecosystem Overview

**6 stops** across the Website landscape, comparing what the spec describes to what actually exists:

1. `docs/specs/website-spec.md` — The November 2025 spec (1,073 lines)
2. `apps/plant/` — The actual onboarding/billing app (60 files, ~11,445 lines)
3. `libs/engine/` — Billing, tiers, Stripe, tenant management
4. `services/heartwood/` + `services/grove-router/` — Auth and routing
5. The Porch — Grove's actual support infrastructure
6. Email system — Onboarding sequences and transactional emails

### Items by condition

**Thriving** 🟢: Plant onboarding app, Engine tier system, Heartwood auth, Porch support, email sequences
**Growing** 🟡: Grove Router (working, some routes commented "coming soon")
**Wilting** 🟠: (none)
**Barren** 🔴: The website spec itself (disconnected from every system it describes)

---

## 1. The Spec (`docs/specs/website-spec.md`)

**Character**: A time capsule from November 2025. It describes a product called `grove-website` in its own repository, with Lucia auth, password hashing, magic link codes, a `clients` table, and a support ticket system. None of this exists. The territory evolved without the map.

### Safari findings: What the spec describes vs reality

**Architecture** (spec lines 54-123):

- [ ] **Standalone `grove-website` repo** — doesn't exist. The app is `apps/plant/` in the Lattice monorepo
- [ ] **Cloudflare Pages hosting** — partially true. Plant deploys to CF Pages, but uses Workers bindings (D1, KV, service bindings) which Pages alone can't do
- [ ] **Project structure** — entirely fictional. The spec's file tree (`src/lib/components/marketing/`, `src/lib/api/clients.ts`, `src/lib/auth/lucia.ts`) bears no resemblance to `apps/plant/src/`
- [ ] **Custom design system** — spec says "Tailwind CSS + Custom Design System". Reality: Lattice Tailwind preset with shared engine components

**Authentication** (spec lines 889-911):

- [ ] **Lucia auth** — Lucia is deprecated. Grove uses Better Auth 1.4.18 via Heartwood
- [ ] **Email/password with bcrypt** — doesn't exist. Grove has Google OAuth, magic links, and WebAuthn passkeys
- [ ] **6-digit email codes** — partially implemented as magic links, but the flow is fundamentally different
- [ ] **Password reset** — no passwords exist
- [ ] **Rate limiting on login (5 attempts/15 min)** — rate limiting exists, but in Heartwood middleware, not in Plant

**Database** (spec lines 366-566):

- [ ] **`clients` table** — doesn't exist. Grove uses `tenants` + `user_onboarding`
- [ ] **`blogs` table** — doesn't exist. Content lives in tenant-scoped `posts` and `pages` tables
- [ ] **`subscriptions` table** — was created in migration 007, then dropped in migration 085 as dead code
- [ ] **`invoices` table** — doesn't exist. Stripe handles invoicing; `webhook_events` stores event data
- [ ] **`support_tickets` table** — doesn't exist. The Porch has `porch_visits` and `porch_messages`
- [ ] **`ticket_messages` table** — doesn't exist. See Porch

**Billing** (spec lines 228-265):

- [x] Plan names match (Free, Seedling, Sapling, Oak, Evergreen) — correct!
- [x] Pricing matches ($0, $8, $12, $25, $35) — correct!
- [ ] **Annual pricing** — spec says "2 months free". Reality: 15% discount (e.g., Seedling yearly = $81.60, not $82)
- [ ] **Stripe integration code** — spec describes custom API endpoints. Reality: Plant uses Stripe Checkout (hosted page) with direct API calls, not the Engine payment provider abstraction
- [ ] **Dunning management** — spec describes 3 emails over 7 days. Not implemented. Stripe handles retry logic natively

**Support** (spec lines 296-363):

- [ ] **Support ticket system** — doesn't exist as described. The Porch IS the support system
- [ ] **SLA by plan** — spec describes 48hr/24hr/12hr/4hr response times. Reality: support levels are tier properties in `tiers.ts` (help_center, community, email, priority, dedicated) but no SLA enforcement exists
- [ ] **Ticket workflow** — spec describes open/in_progress/resolved/closed. Porch has open/pending/resolved
- [ ] **Escalation rules** — not implemented

**Marketing Pages** (spec lines 129-159):

- [ ] **Homepage at `grove.place`** — exists, but it's `apps/landing/`, not Plant. Plant is at `plant.grove.place`
- [ ] **Features page** — doesn't exist as a standalone page
- [ ] **Pricing page** — exists within Plant's onboarding flow, not as a public marketing page
- [ ] **Examples page** — doesn't exist

**Email** (spec lines 786-848):

- [x] Welcome email — exists (WelcomeEmail.tsx)
- [x] Day 1 email — exists (Day1Email.tsx)
- [ ] **Day 3 email** — spec says Day 3, but actual sequence skips to Day 7
- [x] Day 7 email — exists (Day7Email.tsx, though spec says "Tips for growing")
- [x] Day 14 email — exists (Day14Email.tsx)
- [x] Day 30 email — exists (Day30Email.tsx)
- [ ] **Payment receipt** — handled by Stripe, not custom
- [ ] **Payment failed** — handled by Stripe, not custom
- [ ] **Subscription canceled** — not implemented as email

**Admin Dashboard** (spec lines 851-884):

- [ ] **Client management UI** — doesn't exist as described. Admin features live in Arbor (the tenant admin panel in the landing app)
- [ ] **Revenue dashboard** — not implemented
- [ ] **Support dashboard** — partially exists as the Porch admin panel at `/arbor/porch`
- [ ] **System health** — not implemented as UI

### Design spec (safari-approved)

**The spec needs a complete rewrite.** Not a patch. The document describes a product from a different timeline. Every section needs to be rewritten against the actual codebase.

#### What the new spec should cover

1. **Plant** (`apps/plant/`) as the onboarding app: auth, profile, email verification, plan selection, Stripe checkout, tenant provisioning, tour
2. **Engine** (`libs/engine/`) as the billing/tier brain: `tiers.ts` as single source of truth, `billing.ts` for subscription helpers, payment provider abstraction
3. **Heartwood** as the auth system: Better Auth, Google OAuth, magic links, passkeys, SessionDO bridge
4. **The Porch** as the support system: visits (not tickets), email-first conversations, admin panel
5. **Grove Router** as the traffic director: subdomain routing, service bindings
6. **Landing** (`apps/landing/`) as the marketing site: homepage, pricing, feedback, Porch, Arbor admin
7. **Email system**: Zephyr gateway, welcome sequences (Day 0/1/7/14/30), transactional templates

#### What to PRESERVE from the current spec

- Plan names and pricing ($0/$8/$12/$25/$35) — still accurate
- Feature matrix concept (though details need updating from `tiers.ts`)
- The vision of what Grove is (marketing, onboarding, billing, management)
- Subdomain provisioning concept (though the flow is different)

#### What to REMOVE

- All Lucia auth references
- All password/bcrypt references
- The fictional file tree
- The `clients`, `blogs`, `subscriptions`, `invoices`, `support_tickets`, `ticket_messages` schemas
- Custom Stripe endpoint code examples
- The admin dashboard section (doesn't exist)
- Sentry references (Grove uses Signpost)
- All SLA enforcement details (not implemented)
- Cookie consent banner (not implemented)

#### What to ADD

- Engine-first architecture diagram showing how Plant, Engine, Heartwood, Router, and Porch relate
- Actual onboarding flow (6 steps: Auth → Profile → Verify → Plans → Checkout → Success/Tour)
- The Porch as the support system (visits, not tickets)
- Better Auth session architecture (dual-token system)
- Actual database tables (`tenants`, `user_onboarding`, `platform_billing`, `porch_visits`, `porch_messages`)
- Email sequence system (Zephyr, React Email templates)
- What's actually available today (free + seedling) vs coming soon (sapling) vs future (oak, evergreen)
- Comped account flow (invite codes, beta access)
- Passkey registration during onboarding

---

## 2. Plant App (`apps/plant/`)

**Character**: A focused, single-purpose onboarding app that does one thing beautifully: turn a stranger into a Wanderer with their own blog. Warm, intentional, queer-centered. 60 files, ~11,445 lines of purposeful code.

### Safari findings: What exists today

**Configuration**:

- [x] SvelteKit 2.0+ with Cloudflare Pages adapter
- [x] Lattice Tailwind preset (grove design system)
- [x] Lexend font
- [x] CSRF trusted origins configured
- [x] D1 binding to `grove-engine-db` (shared database)
- [x] Service binding to Heartwood (`AUTH`)
- [x] Service binding to Zephyr email gateway
- [x] KV binding for rate limiting
- [x] Turnstile (Shade) for human verification
- [x] Stripe secrets configured

**Onboarding Flow** (6 steps):

- [x] Step 1: Auth — Google OAuth via Heartwood, LoginGraft component
- [x] Step 2: Profile — display name, username (subdomain), favorite color
- [x] Step 3: Verify email — magic link or verification code
- [x] Step 4: Plans — Wanderer (free) or Seedling ($8/mo)
- [x] Step 5: Checkout — Stripe hosted checkout page
- [x] Step 6: Success + optional Tour
- [x] Username validation (reserved_usernames + tenants uniqueness check)
- [x] Step progress dots in header
- [x] Redirect logic (skip completed steps)

**API Endpoints** (13):

- [x] Auth: magic-link, passkey options/verify
- [x] Onboarding: check-username, save-profile, select-plan, verify-email, verify-email/resend
- [x] Billing: Stripe webhook handler
- [x] Special: claim-comped, health/payments
- [ ] **No billing portal endpoint** — Stripe billing portal session exists in code but no user-facing route

**Special Flows**:

- [x] Invited flow (`/invited/`) — beta access via invite codes
- [x] Comped flow (`/comped/`) — free sponsored accounts
- [x] Account page (`/account/`) — post-onboarding management
- [x] Tour flow (`/tour/`) — interactive onboarding walkthrough

**Error Handling**:

- [x] Signpost-standard PLANT_ERRORS (PLANT-001 through PLANT-080)
- [x] Structured error codes with user/admin messages
- [x] Error URL building for redirect-based error display

**Testing**:

- [x] 3 test files (email-verification, free-account-limits, onboarding-helper)
- [x] Vitest setup with mocks

### Design spec (safari-approved)

**Plant is in good shape.** It's the most "real" part of the website ecosystem. The spec should describe Plant as it exists, not redesign it.

#### Minor gaps to note in the spec

- [ ] Billing portal access — code exists for creating Stripe billing portal sessions, but no user-facing route in Plant. The account page could link to it
- [ ] Plan upgrade/downgrade — not implemented in Plant. Stripe billing portal handles this
- [ ] Account deletion — not in Plant. Exists as a `grove-account-deletion` skill but no self-service UI
- [ ] Only 2 plans available (free + seedling) — sapling is "coming_soon", oak/evergreen are "future"
- [ ] LemonSqueezy webhook route may still exist (legacy, should be cleaned up)

---

## 3. Engine Billing & Tiers (`libs/engine/`)

**Character**: The single brain that knows everything about pricing, features, rate limits, and subscriptions. `tiers.ts` is the 620-line source of truth that every other system reads from.

### Safari findings: What exists today

**Tier Config** (`libs/engine/src/lib/config/tiers.ts`, 620 lines):

- [x] 5 tiers defined: free, seedling, sapling, oak, evergreen
- [x] Each tier has: limits, features, rateLimits, pricing, display, support
- [x] Pricing in both dollars and cents (for Stripe)
- [x] Feature booleans: blog, meadow, emailForwarding, fullEmail, customDomain, byod, themeCustomizer, customFonts, centennial, shop, ai, analytics
- [x] Rate limits per tier: requests/min, writes/hour, uploads/day, AI calls/day
- [x] Support levels: help_center, community, email, priority, dedicated
- [x] Display info with Grove-themed names and standard-mode alternatives
- [x] Tier status: available, coming_soon, future

**Billing Module** (`libs/engine/src/lib/server/billing.ts`, 218 lines):

- [x] `getTenantSubscription()` — returns tier, status, isActive
- [x] `checkFeatureAccess()` — validates feature against tier
- [x] `requireActiveSubscription()` — throws if inactive
- [x] `isCompedAccount()` — detects free premium accounts
- [x] `logBillingAudit()` — non-blocking audit trail

**Stripe Provider** (`libs/engine/src/lib/payments/stripe/provider.ts`, 702 lines):

- [x] Checkout sessions (payment or subscription mode)
- [x] Subscription management (get, cancel, resume)
- [x] Billing portal sessions
- [x] Webhook verification and event mapping
- [x] Stripe Connect for tenant shops
- [x] Provider-agnostic interface (`PaymentProvider`)

**Database Tables**:

- [x] `tenants` — id, subdomain, display_name, email, plan, active
- [x] `user_onboarding` — full signup flow with Stripe refs
- [x] `platform_billing` — subscription status with Stripe IDs
- [x] `webhook_events` — idempotent event storage
- [x] Shop tables dropped (migration 085) — dead code cleaned up
- [x] LemonSqueezy columns dropped (migration 086)

### Design spec (safari-approved)

**Engine billing is solid.** The spec should describe it accurately, especially the `tiers.ts` as the canonical source.

#### Key facts for the spec

- Pricing: free=$0, seedling=$8/mo ($81.60/yr), sapling=$12/mo ($122.40/yr), oak=$25/mo ($255/yr), evergreen=$35/mo ($357/yr)
- Only free + seedling are status "available". Sapling is "coming_soon". Oak + evergreen are "future"
- Comped accounts: paid tier without `provider_customer_id`
- No custom invoice table. Stripe handles invoicing
- No dunning orchestration. Stripe handles payment retries
- Billing audit logs to `audit_log` table (non-blocking)

---

## 4. Auth & Routing (`services/heartwood/`, `services/grove-router/`)

**Character**: Heartwood is the oak at the center of the grove. Every session flows through it. Grove Router is the trail system connecting every subdomain to the right service.

### Safari findings: What exists today

**Heartwood** (`services/heartwood/`):

- [x] Better Auth 1.4.18 (not Lucia)
- [x] Google OAuth, magic links, WebAuthn passkeys, 2FA
- [x] Dual-token session architecture (Better Auth cookie + SessionDO bridge)
- [x] Session validation via service binding (`POST /session/validate`)
- [x] Cookie domain `.grove.place` for cross-subdomain SSO
- [x] D1 (`groveauth`) for auth tables, separate from `grove-engine-db`
- [x] KV for session caching
- [x] SessionDO for per-user session management

**Grove Router** (`services/grove-router/`, 310 lines):

- [x] Wildcard `*.grove.place` routing
- [x] Named subdomains: login, plant, meadow, auth-api, porch, cdn, etc.
- [x] Service bindings for Worker-to-Worker calls
- [x] X-Forwarded-Host header for origin awareness
- [x] Fallback to `grove-lattice.pages.dev` for tenant subdomains
- [x] R2 bucket routing for CDN

### Design spec (safari-approved)

**Auth is the most mature system in the ecosystem.** The spec should reference the Heartwood spec (`docs/specs/heartwood-spec.md`) rather than redescribe it.

#### What the website spec needs

- [ ] Reference Heartwood spec for auth details (don't duplicate)
- [ ] Document the onboarding auth flow specifically (Google OAuth → callback → profile → passkey setup)
- [ ] Describe the session cookie model (which cookies, which domains)
- [ ] Reference grove-router subdomain map

---

## 5. The Porch (Support Infrastructure)

**Character**: A porch is where you sit and talk. Not a ticket counter. Not a corporate help desk queue. It's two people on a porch, figuring things out together. Fully built, production-ready.

### Safari findings: What exists today

**User-Facing** (`apps/landing/src/routes/porch/`):

- [x] Landing page with "Start a visit" CTA
- [x] Visit creation form: category, subject, message (10-5000 chars)
- [x] Categories: billing, technical, account, hello, other
- [x] Turnstile CAPTCHA for guests
- [x] Rate limiting (5 visits/day per IP)
- [x] Visit numbering (PORCH-2026-XXXXX via KV)
- [x] Dual email: confirmation to visitor + notification to Autumn
- [x] Visit history page (authenticated users)
- [x] Visit detail with reply capability

**Admin** (`apps/landing/src/routes/arbor/porch/`):

- [x] Dashboard with open/pending/resolved stats
- [x] Search by subject, visit number, email, name
- [x] Status filters
- [x] Full conversation thread view
- [x] Admin reply (sends email to visitor)
- [x] Status updates (open → pending → resolved)
- [x] Internal admin notes

**Database** (`apps/landing/migrations/0005_porch.sql`):

- [x] `porch_visits` — id, visit_number, user_id, guest_email, guest_name, category, subject, status, priority, timestamps
- [x] `porch_messages` — id, visit_id, sender_type, sender_name, content, created_at
- [x] Indexes on user_id, email, status, created_at, visit_id

**Email** (`libs/engine/src/lib/email/porch/`):

- [x] `PorchReplyEmail.tsx` — React Email template for reply notifications
- [x] From: `porch@grove.place`

### Design spec (safari-approved)

**The Porch is the support system the spec was trying to describe, but warmer.** The new spec should reference the Porch spec (`docs/specs/porch-spec.md`) and describe it as the support layer.

#### Key differences from spec's support vision

| Spec Described                           | Porch Reality                                                |
| ---------------------------------------- | ------------------------------------------------------------ |
| "Support tickets"                        | "Porch visits"                                               |
| SLA enforcement (48hr/24hr/12hr/4hr)     | Support levels as tier properties, no SLA enforcement        |
| Ticket categories                        | Visit categories (billing, technical, account, hello, other) |
| Status: open/in_progress/resolved/closed | Status: open/pending/resolved                                |
| Assigned_to field                        | Single operator (Autumn)                                     |
| Response time tracking                   | Not tracked programmatically                                 |
| Escalation rules                         | Not implemented                                              |
| Canned responses                         | Not implemented                                              |

#### What the spec should note as future work

- [ ] SLA tracking (measure response time against tier promises)
- [ ] Ivy mail integration for visit notifications (Phase 2 of Porch spec)
- [ ] Self-service knowledge base (help center articles exist at `docs/help-center/`)
- [ ] File attachments on visits

---

## 6. Email System

**Character**: A carefully designed sequence of warmth. Not a drip campaign. Timed letters from a friend who runs your favorite tea shop.

### Safari findings: What exists today

**Onboarding Sequences** (`libs/engine/src/lib/email/sequences/`):

- [x] `WelcomeEmail.tsx` — Immediate (Day 0)
- [x] `Day1Email.tsx` — Day 1
- [x] `Day7Email.tsx` — Day 7 (spec said Day 3, actual skips to 7)
- [x] `Day14Email.tsx` — Day 14
- [x] `Day30Email.tsx` — Day 30
- [x] `BetaInviteEmail.tsx` — Invite flow

**Scheduling** (`libs/engine/src/lib/email/schedule.ts`, 325 lines):

- [x] `scheduleWelcomeSequence()` — queues all emails via Zephyr with Resend `scheduled_at`
- [x] `sendEmail()` — single email via Zephyr
- [x] Idempotency keys to prevent duplicate sequences
- [x] Audience-type-aware sequences (rooted vs waitlist)

**Infrastructure**:

- [x] Zephyr email gateway (`services/zephyr/`)
- [x] Resend as delivery provider
- [x] React Email templates (JSX → HTML rendering)
- [x] Unsubscribe support

### Design spec (safari-approved)

**Email is in good shape.** The spec should document the actual sequence (Day 0/1/7/14/30), not the aspirational one (Day 0/1/3/7/14/30).

#### Spec vs reality for email

| Spec Email                     | Actual                  |
| ------------------------------ | ----------------------- |
| Immediately: Welcome           | Day 0: WelcomeEmail.tsx |
| Day 1: Admin panel walkthrough | Day 1: Day1Email.tsx    |
| Day 3: First post tutorial     | (skipped)               |
| Day 7: Growing your blog       | Day 7: Day7Email.tsx    |
| Day 14: Check-in               | Day 14: Day14Email.tsx  |
| Day 30: Upgrade prompt         | Day 30: Day30Email.tsx  |
| Payment receipt                | Stripe handles this     |
| Payment failed                 | Stripe handles this     |
| Subscription canceled          | Not implemented         |

---

## Expedition Summary

### By the numbers

| Metric        | Count                                                                  |
| ------------- | ---------------------------------------------------------------------- |
| Total stops   | 6                                                                      |
| Thriving 🟢   | 5                                                                      |
| Growing 🟡    | 1                                                                      |
| Wilting 🟠    | 0                                                                      |
| Barren 🔴     | 1 (the spec itself)                                                    |
| Spec accuracy | ~15% (pricing + plan names are right, almost everything else is wrong) |

### The core finding

**The spec is a fossil.** It describes a product from November 2025 that diverged from reality almost immediately. The actual codebase is healthier, more mature, and more thoughtfully designed than what the spec imagined. The territory grew beyond the map.

What actually exists:

- **Plant**: A polished 6-step onboarding app with Stripe, Heartwood auth, and Lattice UI
- **Engine**: A 620-line tier config that is the single source of truth for all pricing and features
- **Heartwood**: Better Auth with Google OAuth, magic links, passkeys, and 2FA
- **The Porch**: A warm, human support system with visits, conversations, and email integration
- **Email sequences**: 5-email welcome sequence via Zephyr/Resend with React Email templates
- **Grove Router**: Subdomain routing to every service in the ecosystem

What the spec described:

- A standalone `grove-website` repo (doesn't exist)
- Lucia auth with passwords (deprecated and never used)
- 6 database tables (0 of which exist)
- A support ticket system (replaced by the Porch)
- An admin dashboard (partially exists as Arbor)

### Recommended approach

**Full rewrite via Swan Design.** The spec needs to be rebuilt from the ground truth, just like the Amber spec was. The structure should be:

1. **Overview**: What Plant does (onboarding + billing), what Landing does (marketing + Porch + Arbor admin)
2. **Architecture**: How Plant, Engine, Heartwood, Router, Porch, and Zephyr connect
3. **Onboarding Flow**: The actual 6-step journey with each step documented
4. **Billing**: Reference `tiers.ts` as source of truth, describe Stripe integration
5. **Support**: Reference Porch spec, describe how support maps to tiers
6. **Email**: The actual welcome sequence + transactional emails
7. **Auth**: Reference Heartwood spec, describe the onboarding-specific flow
8. **Database**: The actual tables (tenants, user_onboarding, platform_billing, porch_visits)
9. **What's Built vs What's Coming**: Honest status of each tier and feature

### Cross-cutting themes

1. **The spec described a monolith, reality is a distributed system.** Plant handles onboarding. Engine handles billing logic. Heartwood handles auth. Porch handles support. Router handles traffic. The spec imagined one app doing everything.

2. **Auth evolved three times.** The spec describes Lucia. Grove migrated through custom PKCE OAuth to Better Auth 1.4.18. The new spec should reference Heartwood and not re-describe auth.

3. **Support is warm, not corporate.** The spec described SLAs, escalation rules, and canned responses. The Porch is simpler and more human. The new spec should embrace this.

4. **Stripe does more than the spec expected.** Invoicing, payment retries, billing portal, subscription management. The spec tried to build custom versions of things Stripe handles natively.

5. **The tier config is the real spec.** `tiers.ts` (620 lines) contains more accurate product definition than the entire 1,073-line website spec. Every pricing detail, feature flag, rate limit, and support level lives there.

---

_The fire dies to embers. The journal is full. 6 stops, 1 barren spec, 5 thriving systems it failed to describe. The territory is healthy. The map just needs to be redrawn. Tomorrow, the swan glides across the lake. Tonight was the drive. And it was magnificent._ 🚙
