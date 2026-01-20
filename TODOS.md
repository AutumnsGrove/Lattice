# TODOs for Grove Platform

> **Note:** UI components and Design System have been split into [GroveUI](https://github.com/AutumnsGrove/GroveUI). This repo focuses on the core engine, example site, and hosting (grove.place).
>
> **Completed tasks:** See `COMPLETED.md` for historical record of finished work.

---

# 🔄 CURRENT SESSION (Jan 18-19, 2026)

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

**Future improvement:** Consider wildcard redirect URI support (`https://*.grove.place/auth/callback`) to avoid per-tenant OAuth registration. See `docs/specs/heartwood-spec.md` for implementation notes.

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

> **Spec:** `docs/specs/petal-spec.md` (in progress)
> **Builds on:** Thorn (text content moderation)
> **Status:** Spec being written

Image uploads need moderation before v1 launch. Petal extends Grove's content moderation infrastructure (Thorn handles text) to cover images.

- [ ] Complete Petal spec
- [ ] Implement image scanning integration
- [ ] Wire into image upload pipeline
- [ ] Add admin review UI for flagged content

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

*Last updated: 2026-01-20 (Jan 18-20 sprint — PricingGraft migration complete, PR #408 merged)*

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
