# TODOs for Grove Platform

> **Note:** UI components and Design System have been split into [GroveUI](https://github.com/AutumnsGrove/GroveUI). This repo focuses on the core engine, example site, and hosting (grove.place).
>
> **Completed tasks:** See `COMPLETED.md` for historical record of finished work.

---

# 🚨 LEGAL COMPLIANCE — BLOCKING FOR PRODUCTION

> **CRITICAL:** These items MUST be completed before launching image uploads to real users.
> **Current Strategy:** Image uploads disabled by default via `image_uploads_enabled` feature flag.
> Can be enabled per-tenant for trusted beta users via grafts.

## PhotoDNA Integration (Layer 1 Hash-Based Detection)
> **Spec Requirement:** Layer 1 should use hash-based detection (PhotoDNA) as primary CSAM detection
> **Current State:** Vision-based interim solution, waiting for PhotoDNA approval
> **Location:** `packages/engine/src/lib/server/petal/layer1-csam.ts`

### Application Status
- [x] **Created Microsoft account** for PhotoDNA application (autumn@grove.place) ✅ Jan 21, 2026
- [ ] **Complete PhotoDNA application** at https://myphotodna.microsoftmoderator.com/Profile
  - Use legal name on application (it's a legal vetting process)
  - Company: Grove / Autumn's Grove LLC
  - Website: grove.place
  - Email: autumn@grove.place
- [ ] Await approval (~1-2 weeks via direct application, ~1 week via Tech Coalition)
- [ ] Receive API credentials from Microsoft
- [ ] Integrate PhotoDNA API into Layer 1 (replace vision-based detection as primary)
- [ ] Enable `image_uploads_enabled` flag globally once integrated

### Alternative Path (if needed)
- Tech Coalition: tech@technologycoalition.org (~1 week response time)
- Thorn Safer: https://www.thorn.org/safer/

## NCMEC CyberTipline Integration
> **Requirement:** 18 U.S.C. § 2258A mandates reporting CSAM to NCMEC within 24 hours
> **Current State:** Petal (PR #412) has placeholder that queues reports to DB for manual processing
> **Location:** `packages/engine/src/lib/server/petal/layer1-csam.ts`

- [ ] Register as ESP (Electronic Service Provider) with NCMEC
- [ ] Implement CyberTipline API integration for automated reporting
- [ ] Set up secure report metadata storage with encryption
- [ ] Establish monitoring and alerting for NCMEC queue depth
- [ ] Document manual review process until automation is complete
- [ ] Test reporting flow end-to-end in staging environment

**Resources:**
- NCMEC CyberTipline: https://www.missingkids.org/gethelpnow/cybertipline
- Cloudflare CSAM Scanning: https://developers.cloudflare.com/images/csam-scanning/
- PhotoDNA (Microsoft): https://www.microsoft.com/en-us/photodna

## Pre-Deployment Checklist (Before Enabling Uploads)
> **From PR #412 reviews** — complete before enabling `image_uploads_enabled` for any tenant

- [x] **Enable Cloudflare CSAM Scanning Tool** in dashboard ✅ Already configured
  - Enabled for `grove.place` and `cdn.autumnsgrove.com`
- [ ] **Verify Workers AI binding** in `wrangler.toml`: `[ai]\nbinding = "AI"`
- [ ] **Set TOGETHER_API_KEY** in Cloudflare secrets (fallback provider)
- [ ] **Run migrations** on production D1: `030_petal.sql`, `031_petal_upload_gate.sql`
- [ ] **Test failover** - verify Together.ai fallback works if Workers AI fails
- [ ] **Document manual review process** for flagged accounts

## Production Monitoring for Petal
> **Current State:** Basic logging implemented, needs production monitoring

- [ ] Set up alerts for NCMEC queue items not reported within 12 hours
- [ ] Monitor provider circuit breaker status
- [ ] Track high block rates (potential attack or false positives)
- [ ] Alert on classification parse failures
- [ ] Dashboard for Petal security events
- [ ] Add log retention cleanup (90-day TTL for `petal_security_log`)

---

# 🔄 CURRENT SESSION (Jan 21, 2026)

## Tomorrow's Tasks (Jan 22, 2026)

### 🛡️ PhotoDNA Application — SUBMIT APPLICATION
> **Status:** Microsoft account created, application form ready to fill
> **Location:** https://myphotodna.microsoftmoderator.com/Profile

- [ ] Complete PhotoDNA application form
  - Use legal name (it's a legal vetting process)
  - Company: Grove / Autumn's Grove LLC
  - Website: grove.place
  - Email: autumn@grove.place
- [ ] Submit and await approval (~1-2 weeks)

### 💳 LemonSqueezy Verification — FILM WALKTHROUGH VIDEO
> **Status:** BLOCKING - LS requested a walkthrough video explaining the website and concepts
> **Priority:** HIGH - Payments are gated behind this verification

**Pre-recording setup:**
- [ ] Enable signups temporarily (`SIGNUPS_ENABLED = "true"` in Cloudflare)
- [ ] Verify Plant flow works end-to-end (LS is in test mode, no real charges)

**Walkthrough script (keep it simple!):**
1. [ ] **grove.place** — "This is Grove, a blog hosting platform" (30 sec)
   - Brief landing page tour, click "Get Started"
2. [ ] **plant.grove.place** — Sign up flow (2-3 min)
   - Sign in with Google
   - Choose username (show Loam validation working)
   - Select Seedling tier ("We're launching with our starter tier")
   - Complete checkout (test mode)
3. [ ] **{username}.grove.place/admin** — Arbor panel (2-3 min)
   - Quick tour of the admin dashboard
   - Create a simple blog post
   - Publish it
4. [ ] **{username}.grove.place** — Show the live blog (30 sec)
   - "And here's their published blog"

**What to narrate around (don't dwell on):**
- Pricing page shows 4 tiers → "We're launching with Seedling, additional tiers planned"
- Skip Workshop/Roadmap entirely — not relevant to "what do you sell"
- Skip Forage mention — not part of phase 1

**Post-recording:**
- [ ] Disable signups again until LS verified
- [ ] Reply to LemonSqueezy email with video
- [ ] **Pantry temporarily hidden** from Workshop to simplify "what we sell" narrative
  - LS was curious about "domain selling" — Pantry's shop/provisioning concept might complicate things
  - Pantry spec and code remain, just not visible on public Workshop page
  - Re-enable after LS verification complete

### 📢 Bluesky Communications Pivot
> **Status:** Grove Bluesky account created: @groveplace.bsky.social
> **First post:** "thinkin about the grove" (2 likes! 🎉)

- [ ] Consider adapting Email #6 to mention Bluesky as new update channel
- [ ] Or send Email #7 as a quick "hey, following updates on Bluesky now" note
- [ ] Start posting Grove updates on Bluesky instead of formal emails
  - Easier than: planning email → querying subscribers → pasting into Proton Mail
  - More casual, more frequent, less pressure

## Completed ✅

### Lattice Museum Planning (PR pending)
> **Branch:** `claude/plan-museum-layout-x9OpU`
> **Plan:** `docs/planning/museum-layout-plan.md`

- [x] Created museum-documentation skill for narrative-driven docs
- [x] Planned 7 wings: Architecture, Nature, Trust, Data, Personalization, Community, Naming
- [x] Created MUSEUM.md entrance and glossary.md
- [x] Added agent orchestration model (swarm with orchestrator)
- [x] Required reading: "Why I Built the Grove" for texture understanding
- [x] Featured naming journeys: Porch (origin), Lumen (difficult), Loom (returning home)

**Follow-up (no rush, it's gotta look good after all):**
- [ ] Greptile generated a beautiful sequence diagram for visitor flow — would look great in the plan!
- [ ] Tier terminology (Seedling/Sapling/Oak/Evergreen) — revisit once pricing is finalized

## In Progress 🚧

### Timeline Curio — 403 Upload Error + Backfilling
> **Problem:** Cannot add new Timeline entries on autumn.grove.place — upload button returns 403 to console
> **Status:** Partially working (viewing works), upload/save broken — needs investigation
> **Last checked:** Jan 22, 2026

**What currently works:**
- [x] Timeline settings page visible at `/admin/curios/timeline`
- [x] Page appears in admin navbar
- [x] Old entries display correctly
- [x] Heat map renders properly

**What's broken:**
- [ ] **Upload button does nothing** — sends 403 error to console
- [ ] Cannot add new timeline entries

**Investigation history:**
- [x] Added toast notifications for feedback (svelte-sonner)
- [x] Added `x-sveltekit-action` header detection in hooks.server.ts
- [x] Removed custom CSRF validation code — SvelteKit handles this automatically
- [ ] **STILL GETTING 403** — Likely a conflict between our custom validation and SvelteKit's built-in CSRF handling

**Root cause hypothesis:**
- SvelteKit does CSRF validation automatically for form actions
- We had wrapped code with custom CSRF validation that conflicted
- Removed that code but something is still blocking the request
- May need to verify the token is actually being saved from the Timeline panel settings

**Next steps:**
- [ ] Verify token is saved correctly in Timeline panel settings
- [ ] Check if there's another CSRF validation layer we missed (route-level?)
- [ ] Verify hooks.server.ts changes actually deployed (check worker bundle)
- [ ] Check Cloudflare Access or WAF rules that might be blocking POST
- [ ] Check if the route's +page.server.ts has its own CSRF check

**Files involved:**
- `packages/engine/src/hooks.server.ts` — Custom CSRF middleware
- `packages/engine/src/routes/admin/curios/timeline/+page.svelte` — Form UI
- `packages/engine/src/routes/admin/curios/timeline/+page.server.ts` — Form action

### Timeline Curio — Backfilling Feature
> **Goal:** Add proper backfilling support via admin panel
> **Priority:** After fixing the 403 upload issue

**Current state:**
- Backfilling requires manual API calls to the worker
- Need to construct the call with token + tenant ID

**Desired state:**
- [ ] Add backfill UI in admin panel (`/admin/curios/timeline/backfill` or similar)
- [ ] Build the API call to worker using stored token + tenant ID
- [ ] Should be straightforward once we have all the pieces (token, tenant ID, worker endpoint)

## Completed ✅

### CI Build Fix — Petal AI Binding Compatibility
> **Problem:** Petal PR added Workers AI binding which requires remote Cloudflare auth during prerendering
> **Solution:** Skip prerendering in CI (entries: []), add handleUnseenRoutes: "ignore"

- [x] Diagnosed wrangler remote proxy auth error during CI builds
- [x] Updated `svelte.config.js` to skip prerendering when `CI=true`
- [x] Added `handleUnseenRoutes: "ignore"` to suppress warnings for routes with `prerender = true`
- [x] Fixed Petal type errors (AI binding, TOGETHER_API_KEY missing from app.d.ts)
- [x] Fixed ArrayBuffer type casting in petal/logging.ts
- [x] Fixed FeatureFlagsEnv casting in upload route
- [x] CI builds now pass ✅

**Commits:**
- `3ccfd8c6` — fix(build): Skip prerendering in CI to avoid AI binding auth requirement
- `19a3506f` — fix(types): Add AI binding type and fix Petal type errors

---

# 🔄 PREVIOUS SESSION (Jan 18-19, 2026)

## Completed ✅

> **20+ commits, 8 PRs merged** — massive sprint! 🔥

### 🛡️ Security Hardening — COMPLETE! (PR #391)
> **Plan:** `docs/plans/completed/security-hardening.md` | **Effort:** ~1 hour (way under 6-8h estimate!)

- [x] **Webhook PII Sanitization** — Whitelist-based stripping of sensitive fields
- [x] **120-day Retention Policy** — `expires_at` column + dedicated cleanup Worker with daily cron
- [x] **Safe JSON Parsing** — Wrapped 16 unsafe `JSON.parse()` calls with `safeJsonParse()`
- [x] **Documentation** — `docs/security/webhook-data-protection.md` + `docs/infrastructure/webhook-cleanup-operations.md`
- [x] **25 new tests** for webhook sanitizer

### 🏗️ Code Quality & Infrastructure (PR #387, #389, #390)
> **Plan:** `docs/plans/completed/code-quality-optimizations.md` | **Multiple items shipped!**

- [x] **Centralized Rate Limiting** — Consolidated to `$lib/server/rate-limits/config.ts` (PR #387)
- [x] **DB Query Isolation Audit** — Wrapped cascading queries in isolated try/catch blocks (PR #387)
- [x] **Safari Reader Mode Fallback** — `@supports not (backdrop-filter)` fallback for glass components (PR #389)
- [x] **Focus Management** — GlassConfirmDialog now saves/restores focus + focus trapping (PR #390)

### 📋 Comprehensive Codebase Audit Planning (PR #385)
> **7 planning documents created** — roadmap for post-v1 improvements

### 🌱 Plant Onboarding Enhancements — COMPLETE! (PR #401)
> **Plan:** `docs/plans/completed/plant-onboarding-enhancements.md` | **Effort:** ~10h (under 16-24h estimate!)

- [x] **Email Verification Flow** — 6-digit codes, 15-min expiry, 5 max attempts, rate-limited resends
- [x] **OAuth Auto-Verification** — Users with `email_verified=true` from Google skip verification
- [x] **Onboarding Checklist UI** — Glassy progress widget with Grove voice ("Wanderer" terminology)
- [x] **Reserved Usernames Admin** — Admin page at `/admin/reserved-usernames` with full audit logging
- [x] **57 tests** for email verification service
- [x] **Accessibility** — ARIA labels, improved color contrast for email template

### 🗺️ Roadmap & Documentation
- [x] **Roadmap Reorganization** — Reordered items, highlighted key features across all phases (PR #386)
- [x] **Marketing Docs** — Social media strategy, refreshed HN post (PR #57057d4)
- [x] **PR Template Simplification** — Streamlined for better agent compliance
- [x] **Journey Curio Architecture** — Added composable sub-curio plan (PR #382)

### 🔧 Developer Experience
- [x] **grove-find fixes** — Explicit binary discovery for shell compatibility
- [x] **gfj command** — New JavaScript-specific file search

### 🎨 Quick Backlog
- [ ] **Gossamer icon** — Choose a better icon (sparkles is buggy/inconsistent)

### 🔐 AUTH MIGRATION AUDIT — ✅ COMPLETE (Jan 20, 2026)
> **Problem:** `autumn.grove.place` was hitting legacy Heartwood via `autumn-website.pages.dev`
> **Solution:** Removed special routing, now uses main groveengine like other tenants

**Completed:**
- [x] **Found the root cause** — grove-router had `autumn: "autumn-website.pages.dev"` hardcoded
- [x] **Traced auth flow** — Engine uses `client_id=groveengine` with dynamic `redirect_uri`
- [x] **Updated grove-router** — Removed legacy `autumn` route (commit `07301c2f` on main)
- [x] **Verified tenant exists** — `autumn-primary` tenant active in D1
- [x] **Updated OAuth client** — Added `autumn.grove.place` to `groveengine` redirect_uris
- [x] **Deployed** — grove-router deployed to production
- [x] **Wildcard redirect URI support** — Implemented in Heartwood! Any `https://{tenant}.grove.place/auth/callback` now works if tenant is active in GroveEngine DB (PR #12, deployed Jan 20, 2026)

### 🌿 UI GRAFTS: PricingGraft Migration — ✅ COMPLETE (Jan 20, 2026, PR #408)
> **Goal:** Consolidate duplicated pricing logic into shared graft system
> **Result:** -633 lines removed, +413 added (net -220 lines), 24 new tests

**Completed:**
- [x] **Migrated Plant to PricingGraft** — Replaced local `plans.ts` and `pricing.ts` with graft imports
- [x] **Added price display helpers** — `getMonthlyEquivalentPrice()`, `getYearlySavingsAmount()`
- [x] **Added billing period converters** — `billingPeriodToDbFormat()` / `dbFormatToBillingPeriod()` for annual↔yearly mapping
- [x] **Extracted shared icon mapping** — `$lib/ui/tier-icons.ts` used by home page and plans page
- [x] **Comprehensive test suite** — 24 tests for all new utilities with round-trip conversion verification
- [x] **Type safety improvements** — Proper `PageData`/`ActionData` types in Svelte components

**Pattern established:** Share data transformation (graft), keep UI context-specific (app). PricingFineprint accordion sections now render consistently across properties.

### 📋 Planning Documents Status
> **All 7 original plans COMPLETE!** See `docs/plans/completed/` for details.

| Plan | Status | Notes |
|------|--------|-------|
| ~~[`encryption-pass.md`](docs/plans/completed/encryption-pass.md)~~ | ✅ **COMPLETE** | PR #400 |
| ~~[`security-hardening.md`](docs/plans/completed/security-hardening.md)~~ | ✅ **COMPLETE** | PR #391 |
| ~~[`code-quality-optimizations.md`](docs/plans/completed/code-quality-optimizations.md)~~ | ✅ **COMPLETE** | PR #387, #389, #390 |
| ~~[`plant-onboarding-enhancements.md`](docs/plans/completed/plant-onboarding-enhancements.md)~~ | ✅ **COMPLETE** | PR #401 |
| ~~[`documentation-plan.md`](docs/plans/completed/documentation-plan.md)~~ | ✅ **COMPLETE** | Component docs |
| ~~[`ui-placeholders.md`](docs/plans/completed/ui-placeholders.md)~~ | ✅ **COMPLETE** | Vista/Forage placeholders |
| ~~[`testing-fixes.md`](docs/plans/completed/testing-fixes.md)~~ | ✅ **COMPLETE** | Svelte 5 test fixes |

**Key Findings from Audit:**
- ✅ Encryption module exists and is tested (31 test cases) — just needs wiring
- ✅ Reserved usernames system is **90% complete** (450+ entries, API exists, tests pass)
- ✅ Safari Reader fallback — ported to `engine/` in PR #389 (Jan 18, 2026)
- ✅ LemonSqueezy webhooks now sanitize PII + auto-expire after 120 days (PR #391)
- ✅ Unsafe `JSON.parse()` calls wrapped with `safeJsonParse()` (PR #391)
- ⚠️ 7 skipped tests due to Svelte 5 reactivity + Vitest timing issues

---

# 🔄 PREVIOUS SESSION (Jan 16, 2026)

## Completed ✅

### 🧪 Testing Infrastructure — COMPLETE!
> **178 test files, ~2,500+ test cases across the engine package**

- [x] Created comprehensive test suite for security modules (auth, csrf, encryption, sanitize)
- [x] Created tests for payment infrastructure (stripe, lemonsqueezy, webhooks)
- [x] Created tests for file validation and storage services
- [x] Created tests for core utilities (markdown, dates, formatting)
- [x] Created tests for feature flags system (targeting, rules, percentage rollouts)
- [x] Achieved 70%+ coverage on critical security paths

### 📁 Documentation Reorganization — COMPLETE!
> **See `docs/FILE-REORGANIZATION-PLAN.md` for full details**

- [x] **Phase 1:** Renamed `_archived/` → `_deprecated/`, fixed UPPERCASE filenames
- [x] **Phase 2:** Restructured docs/ into setup/, infrastructure/, design-system/, philosophy/, plans/
- [x] **Phase 3:** Moved root markdown files to appropriate locations
- [x] **Phase 4:** Fixed migration numbering collisions (001-024 sequential)
- [x] **Phase 6:** Consolidated all apps into `packages/` directory
- [x] **Phase 7:** Updated all GitHub workflows for new paths
- [x] Unified `@cloudflare/workers-types` to `^4.20260116.0` across 10 packages

### 🛡️ Security Remediation Audit — COMPLETE!
> **30 issues across 9 agents, all verified/fixed**

- [x] **Phase 1:** Content Security (XSS), Storage Security (tenant isolation), Analytics Privacy, Build & CI
- [x] **Phase 2:** Authentication (rate limiting added), Core Infrastructure, Social & Federation
- [x] **Phase 3:** UI Accessibility (all 7 ARIA/keyboard issues verified)
- [x] Added KV-based rate limiting to landing auth callback (10 attempts/15 min)
- [x] Wrapped verbose error logging in DEV flag to prevent config leakage

### 📝 Other
- [x] Consolidated TODOS.md — moved historical completed items to COMPLETED.md
- [x] Created formal Amber ZIP export integration plan (`docs/plans/amber-zip-export-integration.md`)

---

# 🚀 V1 RELEASE BLOCKERS

## 🛡️ Security Remediation — ✅ COMPLETE

> **Plan:** `docs/plans/planned/1.0-critical-high-remediation.md`
> **Completed:** January 2026

### Phase 1 ✅
- [x] **Content Security:** SSR sanitization (`sanitizeServerSafe()`), blog posts sanitized, recursive XSS fixed
- [x] **Storage Security:** Tenant isolation via `${tenantId}/` prefix, ownership verification on delete
- [x] **Analytics Privacy:** Logs `userInfo.sub` (not email) in auth callback
- [x] **Build & CI:** Tests run before deploy, wrangler versions unified, .nvmrc exists, qs patched

### Phase 2 ✅
- [x] **Auth:** Dynamic cookie domains, HMAC-SHA256 Turnstile signing, KV-based rate limiting added
- [x] **Infrastructure:** Type definitions fixed, API responses validated
- [x] **Social:** RSS URLs dynamic per tenant, CSRF strict same-origin

### Phase 3 ✅
- [x] **UI Accessibility:** All 7 issues verified (aria-labels, keyboard nav, proper ARIA roles)

## 💳 Lemon Squeezy Verification — BLOCKED

> **Status:** Awaiting Lemon Squeezy store verification
> **Signups disabled** via `SIGNUPS_ENABLED` env var until approved

- [ ] Test checkout flow once LS verified
- [ ] Enable signups: Set `SIGNUPS_ENABLED = "true"` in Cloudflare Dashboard
- [ ] Configure custom domain: `payments.grove.place` → LS IP (DNS-only, no proxy)

## 📋 Legal Pre-Launch

- [x] Register DMCA designated agent with US Copyright Office ($6 fee) ✅ **DONE Jan 19, 2026**
  - Registered as "Grove Legal" under "Grove"
  - Email: dmca@grove.place
  - Pay.gov Tracking ID: 27US0OE7

## 🌸 Petal — Image Content Moderation — IN PROGRESS

> **Spec:** `docs/specs/petal-spec.md`
> **Builds on:** Thorn (text moderation), Songbird pattern
> **Cost:** ~$0.0025/image moderation overhead
> **Branch:** `feature/petal-image-moderation-spec`

Four-layer image moderation system: CSAM detection → Content classification → Sanity check → Output verification. Privacy-first with Zero Data Retention (ZDR).

### Spec & Planning
- [x] Complete Petal spec ✅ **DONE Jan 20, 2026**
- [ ] Review spec with legal (NCMEC reporting requirements)

### Infrastructure Setup
- [ ] Verify CSAM scanning with primary provider (Together.ai)
- [ ] Configure ZDR settings with all providers
- [ ] Create isolated Cloudflare Worker for Petal (`petal.grove.place` or internal)
- [ ] Set up secure API key storage in Cloudflare secrets

### Layer Implementation
- [ ] **Layer 1: CSAM Detection** — PhotoDNA hash-based, NCMEC auto-report
- [ ] **Layer 2: Content Classification** — Vision model (LlamaGuard), category detection
- [ ] **Layer 3: Sanity Check** — Face detection, quality assessment, screenshot/meme detection
- [ ] **Layer 4: Output Verification** — Re-classify AI-generated images, retry logic

### Integration (You're here! 🌿)
- [ ] Wire into Workshop image upload flow
- [ ] Integrate with Scout Custom Model (user photo uploads)
- [ ] Integrate with Model Farm generation pipeline
- [ ] Build rate limiting system (5/session, 20/day, 3 blocks = review)
- [ ] Implement abuse detection patterns

### User Communication
- [ ] Design rejection UI components (friendly, not scary)
- [ ] Write all user-facing rejection messages
- [ ] Create consent flow dialog (Custom Model enable)
- [ ] Build session end confirmation (deletion confirmation)

### Operations & Monitoring
- [ ] Set up security logging (hash only, never images)
- [ ] Create Petal monitoring dashboard
- [ ] Write integration tests with mock images
- [ ] Document NCMEC reporting procedure (internal ops doc)
- [ ] Set up alerting for high block rates

---

# 📅 V1 LAUNCH TASKS

## 🌲 V1 Release Planning Decisions

### 1. Repo/Package Renaming → AT V1 LAUNCH
- [ ] Rename GitHub repo `AutumnsGrove/GroveEngine` → `AutumnsGrove/Lattice`
- [ ] Publish `@autumnsgrove/lattice` to npm
- [ ] Update `@autumnsgrove/groveengine` to redirect/re-export from lattice
- [ ] Update all consumer apps imports
- [ ] Update documentation references
- [ ] After transition period: Deprecate `@autumnsgrove/groveengine`

### 2. Branch Protection & Development Workflow → WEEKLY RELEASES
- [ ] Protect `main` branch (require PR reviews, no direct pushes)
- [ ] Create `develop` branch for integration
- [ ] Define release workflow: feature → develop → main (weekly or on-demand)
- [ ] Document critical hotfix process (direct-to-main when needed)
- [ ] Update GitHub Actions for new branch strategy
- [ ] Update CONTRIBUTING.md with new workflow

### 3. Code Discoverability Fixes
- [x] **FIX:** grove-find.sh shell compatibility issues ✅ (Jan 18, 2026)
- [ ] Consider building `gf` (grove-find) CLI tool for blazing fast search
- [ ] Document key file locations in ARCHITECTURE.md

### 4. Spec Compliance → MERGE SPECS
- [ ] Merge `engine-spec.md` and `lattice-spec.md` into single source of truth
- [ ] Update knowledge base references
- [ ] Document planned vs. implemented features clearly
- [ ] Check Glass usage consistency (desktop TOC needs it!)

### 5. DB Abstraction → ✅ COMPLETE
- [x] Create typed query builders for common operations ✅ (database.ts has 20+ helpers)
- [x] Document safe patterns in AGENT.md ✅ (lines 315-375: isolation + typed builders)

---

# 🌱 PLANT WALKTHROUGH IMPROVEMENTS

> **Spec:** `docs/specs/plant-spec.md`
> **Plan:** `docs/plans/completed/plant-onboarding-enhancements.md`
> **Location:** `packages/plant/src/routes/`

## Completed ✅ (PR #401)

**Email Verification Flow** — DONE!
- [x] Add email verification gate before plan selection
- [x] Send verification code via Resend
- [x] Create `/verify-email` page with code input
- [x] Rate limiting (3 resends/hour via KV)
- [x] OAuth auto-verification for trusted providers

**Onboarding Checklist** — DONE!
- [x] Track completion via `user_onboarding` table
- [x] Create migration: `028_email_verification.sql`
- [x] Show checklist progress with GlassCard widget
- [x] Grove voice messaging ("Wanderer" terminology)

**Reserved Usernames Admin** — DONE!
- [x] Admin UI at `/admin/reserved-usernames`
- [x] Full audit logging for all changes
- [x] Search/filter/pagination support

## Not Yet Implemented ❌

**Follow-up Email Scheduling** (Future)
- [ ] Wire up Resend scheduled sends (day 1, 3, 7, 30)
- [ ] Add email_queue table or use Resend scheduling API
- [ ] Track email sent status per user

## Not Yet Implemented ❌

**Tour Screenshots (HUMAN TASK)**
- [ ] `homepage.png` - Example blog homepage
- [ ] `post.png` - Blog post with markdown content
- [ ] `vines.png` - Post with margin notes visible
- [ ] `admin.png` - Admin dashboard overview
- [ ] `editor.png` - Markdown editor with preview
- [ ] `autumnsgrove.png` - autumnsgrove.com as example

**Passkey Signup (Future)**
- [ ] Add WebAuthn passkey registration flow
- [ ] Store passkey credentials in Heartwood

**Reserved Usernames** — ✅ 100% COMPLETE (PR #401)
> **Admin UI:** `/admin/reserved-usernames` with full CRUD + audit logging

- [x] Create `reserved_usernames` table seed file — **DONE** (migration 012)
- [x] Add common reserved names — **DONE** (migration 017: 450+ entries)
- [x] Add Grove service names — **DONE** (all services included)
- [x] Create admin UI for managing reserved usernames — **DONE** (PR #401)
- [x] Add audit logging for changes — **DONE** (PR #401)
- [x] Create tests for `offensive-blocklist.ts` — **DONE** (65+ tests)

**Analytics / Funnel Tracking**
- [ ] Track funnel: OAuth → Profile → Plans → Checkout → Success
- [ ] Add `acquisition_events` tracking (ties into Vista)
- [ ] Track drop-off points for optimization

## Quick Wins
- [x] **Custom confirmation dialogs** — Already using `GlassConfirmDialog` throughout ✅ (verified Jan 18, 2026)
- [x] **Rate limit config** — Consolidated to `$lib/server/rate-limits/config.ts` ✅ (Jan 18, 2026)
- [x] **Focus management** — GlassConfirmDialog now saves/restores focus + focus trapping ✅ (Jan 18, 2026)

## Deployment Checklist
- [ ] `audit_log` table migration ready for production D1
- [ ] `CACHE_KV` binding configured in wrangler.toml
- [ ] Stripe webhook handles subscription updates

---

# 🔥 FIREFLY INTEGRATION — JOURNEY CURIO

> **Schema ready:** `journey_jobs` table tracks async Firefly analysis jobs
> **Status:** Schema complete, awaiting Firefly queue integration

## Automated Snapshot Creation
- [ ] Wire Firefly queue to trigger on GitHub release webhooks
- [ ] Implement `analyze` job type for full repo analysis
- [ ] Implement `summarize` job type for AI-generated release notes
- [ ] Add progress tracking (0-100%) for long-running jobs
- [ ] Configure OpenRouter integration for AI summaries

## Job Types
- **analyze**: Full repo analysis (LOC, language breakdown, test coverage)
- **backfill**: Regenerate historical snapshots from git history
- **summarize**: Generate AI release notes via OpenRouter

## Future Enhancements
- [ ] Add webhook endpoint for GitHub release events
- [ ] Implement `commits_since_last` delta calculation
- [ ] Add email notifications on job completion
- [ ] Dashboard widget for job status/history

## Composable Curio Architecture
> **Goal:** Journey Curio should be modular—use all components together or just the pieces you need
> **Context:** Curios can render as pages OR as vines (gutter content), so flexibility is key

- [ ] Split Journey Curio into independent sub-curios:
  - **Milestones Curio** — Version releases with dates and summaries
  - **Code Stats Curio** — Lines of code, language breakdown, test coverage
  - **Timeline Curio** — Full project history visualization
- [ ] Create composable API that supports:
  - Fetching all journey data (current behavior)
  - Fetching just milestones
  - Fetching just code stats
  - Fetching just timeline events
- [ ] Ensure each sub-curio works standalone as a page or vine
- [ ] Document component composition patterns for other curios

## Landing Site Migration (Post-Curio Launch)
> **Current:** grove.place/journey reads from `history.csv` at build time
> **Future:** Migrate to use Journey Curio API for consistency

- [ ] Create API route in landing to proxy to engine's curio endpoints
- [ ] Update `+page.server.ts` to fetch from API instead of CSV import
- [ ] Keep CSV as backup/seed data for the Curio
- [ ] Deprecate static CSV approach once Curio is stable

---

# 📦 DEFERRED FEATURES

## PricingFineprint Additions (When Features Launch)
- [ ] **AI Features fine print** — Add accordion section explaining AI capabilities per tier (when AI features release)
- [ ] **API Access fine print** — Add accordion section explaining API limits/access per tier (when API releases)

## Cover Images for Blog Posts
> **Found during:** Help center documentation review (Phase 2)
> **Status:** Not implemented, docs updated to say "coming soon"

- [ ] Add cover_image_url field to posts table
- [ ] Add cover image upload UI to blog post editor (admin/blog/new and admin/blog/edit)
- [ ] Display cover images at top of blog posts
- [ ] Include cover images in social media previews (og:image meta tags)
- [ ] Include cover images in RSS feed entries

## Active Sessions Management UI
> **Found during:** Help center documentation review (Phase 3)
> **Status:** Not implemented, docs updated to remove reference
> **Note:** Also mentioned under DO Phase 1 (Heartwood) as "manage sessions" UI

- [ ] Create Settings → Security section in admin panel
- [ ] Add Active Sessions page showing all logged-in devices
- [ ] Display device type, browser, location (approximate), and last active time
- [ ] Allow users to revoke individual sessions
- [ ] Add "Log out all devices" bulk action
- [ ] Integrate with Heartwood SessionDO for session management

## Amber ZIP Export Integration
> **Plan:** `docs/plans/amber-zip-export-integration.md`
> **Status:** Plan complete, ready for implementation post-v1

## JXL Metrics Tracking
- [ ] Wire client to send encoding metrics (success/failure, timing) to server
- [ ] The `jxl_encoding_metrics` table is ready in migration
- [ ] Needs: Client instrumentation + `/api/images/metrics` endpoint

---

# 🎨 UI POLISH (Post-Launch OK)

## Safari Reader Mode & Glass Cards
> **Issue:** Safari Reader Mode strips `backdrop-blur`, making glass card content invisible
> **Plan:** `docs/plans/planned/code-quality-optimizations.md` (§1)
> **Status:** Fallback added to engine ✅

- [x] Add `@supports not (backdrop-filter: blur(4px))` fallback to engine ✅ (Jan 18, 2026)
- [ ] Wrap glass card content in semantic `<article>` or `<section>` elements
- [ ] Test fix in Safari iOS and macOS

## Forest Page Glass Implementation
- [ ] Add glass overlay for text content sections
- [ ] Consider glass-tint panels for feature callouts
- [ ] Test with all 4 seasons
- [ ] Respect `prefers-reduced-motion`

## Landing Site Structure Review
- [ ] Navbar consistency across all landing routes
- [ ] Footer glass treatment
- [ ] Knowledge base article wrapper

## Floating TOC / Museum Navigation Pattern
> **Found during:** Art Exhibit section implementation (Jan 22, 2026)
> **Location:** `packages/landing/src/routes/knowledge/exhibit/+page.svelte`

The Art Exhibit landing page has a delightful floating TOC with hover-reveal navigation pattern. Consider extracting this into the engine as a reusable component.

- [ ] Extract floating TOC pattern into `<MuseumNav>` or `<CategoryNav>` engine component
- [ ] Parameterize for different category types (exhibit wings, spec categories, help sections)
- [ ] Support hover-reveal item cards with icon, title, description
- [ ] Make it a signature Grove navigation pattern for category landing pages
- [ ] Consider using it for: `/knowledge/specs`, `/knowledge/help`, future category pages

## Vines Subicons Brainstorm — ON HOLD
> Brainstorming paused for launch sprint

---

# 📊 POST-LAUNCH INFRASTRUCTURE

## Rate Limiting — Remaining Tasks

### Cloudflare Edge Layer
- [ ] Configure Cloudflare WAF rate limiting rules (Layer 1)
  - General request limit: 1000 req/min per IP
  - Auth endpoint limit: 50 req/5min per IP
  - Upload endpoint limit: 100 req/hour per IP

### Route Integration
- [ ] Add rate limiting to auth endpoints (`/api/auth/*`)
- [ ] Add rate limiting to CDN upload endpoints (`/api/cdn/*`)
- [ ] Add rate limiting to post creation endpoints
- [ ] Integrate `checkTenantRateLimit()` in router middleware

### Monitoring
- [ ] Add rate limit event logging to Vista
- [ ] Create Vista dashboard component
- [ ] Configure alert thresholds

## Clearing (Status Page) — Phase 2
- [ ] Admin interface for creating/updating incidents
- [ ] Component status override controls
- [ ] Scheduled maintenance UI

---

# 🔮 FUTURE PHASES

## Phase 2: Multi-tenant Infrastructure (Remaining)
- [ ] Complete multi-tenant infrastructure testing
- [ ] Implement basic analytics
- [ ] Finalize tenant onboarding flow
- [ ] Implement plan management UI
- [ ] Add custom domain support for Oak+ tiers
  - ⚠️ **CRITICAL:** CSRF cookie is hardcoded to `Domain=.grove.place` in `hooks.server.ts:517`
  - Must dynamically set cookie domain for custom domains, or CSRF validation will fail
  - See: `packages/engine/src/hooks.server.ts` lines 504-521
- [ ] Implement storage limits per plan

## Per-Tenant Theming → Foliage Integration
> **Repository:** https://github.com/AutumnsGrove/Foliage

- [ ] Add `@autumnsgrove/foliage` as dependency
- [ ] Run Foliage migrations
- [ ] Import `loadThemeSettings` in engine layout
- [ ] Add theme admin routes (`/admin/themes/`)

## Phase 3: Grove Website (Remaining)
- [ ] Add customer portal
- [ ] Implement signup flow
- [ ] Add documentation/help center (spec ready)

## Phase 4: Content Moderation System
> **Spec:** `docs/Specs/CONTENT-MODERATION.md`

## Phase 5: Grove Social / Meadow
> **Spec:** `docs/specs/social-spec.md`

## Phase 6: Polish & Scale
- [ ] Performance optimization
- [ ] Advanced analytics
- [ ] Comment system (spec ready)
- [ ] Data export (see Amber integration plan)
- [ ] Backup/restore functionality

---

# 🛠️ DURABLE OBJECTS (Post-Launch)

> **Spec:** `docs/grove-durable-objects-architecture.md`

## DO Phase 1: Auth (Heartwood) — HIGHEST PRIORITY
- [ ] Implement `SessionDO` class
- [ ] Update Heartwood OAuth flow
- [ ] Add "manage sessions" UI

## DO Phase 2: Tenant Coordination
- [ ] Implement `TenantDO` class
- [ ] Per-tenant rate limiting
- [ ] Analytics buffering

## DO Phase 3-5
See full spec for Content Coordination, Meadow Social, and Analytics phases.

---

# 🚩 FEATURE FLAGS SYSTEM

> **Spec:** `docs/plans/feature-flags-spec.md`
> **Blocks:** JXL migration gradual rollout, A/B testing

- [ ] Create D1 migration for flag tables
- [ ] Implement evaluation logic
- [ ] Create `/admin/flags` UI
- [ ] Integrate with image processor for JXL rollout

---

# 🌱 GREENHOUSE MODE (Dev Mode for Tenants)

> **Spec:** `docs/specs/grafts-spec.md` (Part III)
> **Internal Name:** Dave mode (after the first test tenant)
> **Builds on:** Existing Grafts infrastructure (Feature Grafts + UI Grafts)

Greenhouse mode is the third layer of Grafts—it enables "dev mode" for tenants, unlocking self-serve graft controls. Instead of requiring operator intervention for every toggle, greenhouse tenants can freely experiment with their own trees.

**Why it matters:** Solves where graft controls live. No separate admin panel needed—controls appear in the tenant's dashboard only when greenhouse mode is enabled.

### Phase 8: Greenhouse Infrastructure
- [ ] Create `greenhouse_tenants` table migration
- [ ] Add `greenhouse_only` column to `feature_flags` table
- [ ] Implement `isInGreenhouse()` API function
- [ ] Add greenhouse context to feature evaluation logic
- [ ] Add greenhouse rule type support
- [ ] Create Wayfinder UI for enrolling tenants in greenhouse mode
- [ ] Implement transplant workflow (greenhouse → production promotion)

### Phase 9: Self-Serve Graft Controls (The "Dev Mode" UI)
- [ ] Graft control panel in tenant dashboard (greenhouse-only visibility)
- [ ] Toggle UI for feature grafts
- [ ] Parameter adjustment UI for configurable grafts
- [ ] "Active grafts" overview showing what's enabled
- [ ] Reset to defaults functionality
- [ ] Graft discovery UI (browse available grafts to enable)
- [ ] Experimental features badge/indicator

### Notes
- Half the infrastructure already exists (Feature Grafts, evaluation logic, KV caching)
- Main new work: `greenhouse_tenants` table + conditional UI visibility
- The "Dev Mode Revelation" (see spec): greenhouse mode unlocks self-serve controls for power users

---

# 🖼️ JPEG XL MIGRATION

> **Spec:** `docs/plans/jxl-migration-spec.md`
> **Prerequisites:** Feature Flags System

- [ ] Add `@jsquash/jxl` dependency
- [ ] Update `imageProcessor.ts` with JXL support
- [ ] Replace "Convert to WebP" toggle with format selector
- [ ] Deploy behind feature flag
- [ ] Gradual rollout: 10% → 50% → 100%

---

# 📚 DOCUMENTATION (Remaining)

> **Plan:** `docs/plans/planned/documentation-plan.md`
> **185 components need cataloging** — excellent code-level docs exist, missing narrative guides

- [ ] Add usage examples for tenants
- [ ] Write testing documentation
- [ ] Write AI Development Process Guide

## Museum Documentation for Knowledge Base
> **Vision:** Documentation so elegant that anyone could read it, not just developers
> **Reference:** [AutumnsGrove Museum](https://github.com/AutumnsGrove/AutumnsGrove/blob/main/MUSEUM.md)
> **Skill:** `museum-documentation` — narrative-driven documentation as guided exhibits

The AutumnsGrove Museum transforms archived code into educational exhibits with:
- **ASCII art headers** that visualize each concept
- **Narrative voice** written "for Ariana" (personalized learner)
- **Guided tours** through architecture, not just API references
- **"Patterns Worth Stealing"** sections for practical takeaways
- **Flow diagrams** showing request lifecycles and data movement
- **"Lessons Learned"** reflecting real development insights

**Goal:** Deploy Museum-style documentation to Grove's public Knowledge Base

**Core exhibits to create:**
- [ ] Create `docs/museum/` directory structure for exhibit files
- [ ] Write Museum entrance (MUSEUM.md) introducing GroveEngine architecture
- [ ] Create exhibits for key systems:
  - [ ] **The Roots** — Multi-tenant architecture and tenant isolation
  - [ ] **The Canopy** — UI component system and design tokens
  - [ ] **The Heartwood** — Authentication and Heartwood integration
  - [ ] **The Sap** — Data flow, D1/KV/R2 storage patterns
  - [ ] **The Seasons** — Theming system and seasonal decorations
  - [ ] **The Grafts** — Feature flags and UI grafts system
  - [ ] **The Curios** — Curio architecture (Journey, Timeline, Gallery)
- [ ] Add Museum section to landing Knowledge Base (publicly accessible)

**🌿 VINES ON EXHIBITS — Curator's Notes**
> Use the Gutter system on documentation! Personal annotations alongside the exhibits.

- [ ] Enable gutter content rendering on Museum exhibit pages
- [ ] Write curator notes for each exhibit:
  - Personal stories ("This pattern saved us during the HN launch")
  - Historical context ("Originally this was 3 separate services")
  - Lessons learned the hard way ("Don't skip this step. Trust me.")
  - Links to related commits/PRs that tell the story
  - Dedications (exhibits written for specific people, like Ariana)
- [ ] Consider different vine types for Museum context:
  - `curator-note` — Personal commentary from the grove keeper
  - `historical` — "This was added in v0.3 after..."
  - `warning` — "If you skip this, you'll hit the same bug we did"
  - `story` — Longer narratives about why something exists
- [ ] Add "last walked" dates (when an exhibit was last verified/updated)

**Why this matters:** Technical documentation that reads like a storybook invites exploration. Non-developers can understand Grove's philosophy. Developers can learn patterns without digging through code. And the gutter notes make it feel *inhabited* — someone cared enough to leave their thoughts in the margins.

## Design Documentation Gaps
| Document | Priority | Plan Section |
|----------|----------|--------------|
| `COMPONENT-REFERENCE.md` | High | §1 (4-6h) |
| `DARK-MODE-GUIDE.md` | High | §2 (2-3h) |
| `COLORS.md` | Medium | §4 (2-3h) |
| `SPACING-SYSTEM.md` | Medium | §3 (1-2h) |
| `ANIMATION-GUIDE.md` | Medium | §5 (2-3h) |

---

# 🎯 SUCCESS METRICS

- [ ] Zero data loss incidents
- [ ] Page load time < 2 seconds
- [ ] < 10 hours support per client/month
- [ ] < 5% monthly churn rate
- [ ] Net Promoter Score > 50
- [ ] 10 clients by Month 3
- [ ] 20 clients by Month 6
- [ ] $500 MRR by Month 12

---

# 🔧 INTERNAL TOOLS (Future)

## Cache Busting Admin Tool (Heartwood)
- [ ] Add "Cache Management" section to admin dashboard
- [ ] Build UI to list/purge cached keys
- [ ] Integrate Cloudflare API for CDN cache purge

## Vista Pre-requisites
- [ ] Add `/health` endpoint to autumnsgrove worker
- [ ] Refresh Vista repo with updated spec

## Resend Broadcasts Integration
- [ ] Create Resend Audience
- [ ] Build admin endpoint `/admin/api/sync-audience`

---

*Last updated: 2026-01-22 (Updated Timeline Curio status + added backfilling todo)*

---

# 📋 REMAINING PLANS (8 items in `/planned`)

| Plan | Priority | Summary |
|------|----------|---------|
| `cdn-domain-migration.md` | **V1 BLOCKER** | Migrate CDN from autumnsgrove.com to cdn.grove.place (~1h) |
| `username-change-feature.md` | Low | Allow users to change subdomain/username (4-6h) |
| `1.1-medium-low-remediation.md` | P2-P3 | 52 medium/low issues for post-1.0 cleanup sprint |
| `amber-zip-export-integration.md` | Medium | ZIP export feature for blogs (8-12h) |
| `dependency-update-strategy.md` | Medium | Security maintenance strategy |
| `feature-flags-expansion-roadmap.md` | High | Enable safe deployment of 10+ features |
| `grove-security-audit-plan.md` | High | Multi-pass AI security audit (~$3-8) |
| `help-center-article-roadmap.md` | High | v1 launch documentation (4-6 sessions) |
