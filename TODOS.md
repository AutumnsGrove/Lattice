# TODOs for Grove Platform

> **Note:** UI components and Design System have been split into [GroveUI](https://github.com/AutumnsGrove/GroveUI). This repo focuses on the core engine, example site, and hosting (grove.place).
>
> **Completed tasks:** See `COMPLETED.md` for historical record of finished work.

---

# 🔄 CURRENT SESSION (Jan 18, 2026)

## Completed Today ✅

### 📋 Comprehensive Codebase Audit Planning — PLANNING COMPLETE!
> **7 planning documents created** covering security, testing, UI, onboarding, documentation, and code quality
> **Status:** Plans ready for implementation (see individual docs for effort estimates)

Created detailed implementation plans in `docs/plans/planned/`:

| Plan | Priority | Est. Effort | Summary |
|------|----------|-------------|---------|
| [`encryption-pass.md`](docs/plans/planned/encryption-pass.md) | P1 | 4-6h | Wire AES-256-GCM encryption for GitHub/OpenRouter tokens in Journey Curio |
| [`security-hardening.md`](docs/plans/planned/security-hardening.md) | P1 | 6-8h | Webhook payload sanitization + 120-day TTL; standardize `safeJsonParse()` usage |
| [`plant-onboarding-enhancements.md`](docs/plans/planned/plant-onboarding-enhancements.md) | P1-P2 | 16-24h | Email verification, onboarding checklist, custom dialogs, focus management |
| [`documentation-plan.md`](docs/plans/planned/documentation-plan.md) | P2 | 12-16h | Component reference (185 components), dark mode guide, colors, spacing, animation |
| [`code-quality-optimizations.md`](docs/plans/planned/code-quality-optimizations.md) | P2 | 8-12h | Safari Reader fallback, CSP standardization, DB query isolation audit |
| [`ui-placeholders.md`](docs/plans/planned/ui-placeholders.md) | P2 | 4-6h | Enhanced placeholders for Monitor (Vista) and Domains (Forage) pages |
| [`testing-fixes.md`](docs/plans/planned/testing-fixes.md) | P2 | 4-6h | Fix 7 skipped tests related to Svelte 5 reactivity timing |

**Key Findings from Audit:**
- ✅ Encryption module exists and is tested (31 test cases) — just needs wiring
- ✅ Reserved usernames system is **90% complete** (450+ entries, API exists, tests pass)
- ❌ LemonSqueezy webhooks store full PII with no cleanup mechanism
- ❌ ~30 unsafe `JSON.parse()` calls need wrapping
- ❌ Safari Reader fallback exists in `domains/` but not in `engine/`
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

- [ ] Register DMCA designated agent with US Copyright Office ($6 fee)
  - Required for DMCA safe harbor protection
  - Register at: https://www.copyright.gov/dmca-directory/

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
- [ ] **FIX:** grove-find.sh has shell compatibility issues in Claude Code sandbox
- [ ] Consider building `gf` (grove-find) CLI tool for blazing fast search
- [ ] Document key file locations in ARCHITECTURE.md

### 4. Spec Compliance → MERGE SPECS
- [ ] Merge `engine-spec.md` and `lattice-spec.md` into single source of truth
- [ ] Update knowledge base references
- [ ] Document planned vs. implemented features clearly
- [ ] Check Glass usage consistency (desktop TOC needs it!)

### 5. DB Abstraction → REMAINING TASKS
- [ ] Create typed query builders for common operations
- [ ] Document safe patterns in AGENT.md

---

# 🌱 PLANT WALKTHROUGH IMPROVEMENTS

> **Spec:** `docs/specs/plant-spec.md`
> **Plan:** `docs/plans/planned/plant-onboarding-enhancements.md`
> **Location:** `packages/plant/src/routes/`

## Partially Implemented 🚧

**Email Verification Flow**
- [ ] Add email verification gate before plan selection
- [ ] Send verification code via Resend
- [ ] Create `/verify-email` page with code input

**Onboarding Checklist**
- [ ] Add `onboarding_checklist` table to track completion
- [ ] Create migration: `020_onboarding_checklist.sql`
- [ ] Show checklist progress in success page
- [ ] Add checklist widget to admin dashboard

**Follow-up Email Scheduling**
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

**Reserved Usernames Seed Data** — ✅ 90% COMPLETE
> **See:** `docs/plans/planned/plant-onboarding-enhancements.md` (Item 5)
> **Existing work:** Migrations 012 & 017 seed 450+ entries; API at `/api/check-username` works

- [x] Create `reserved_usernames` table seed file — **DONE** (migration 012)
- [x] Add common reserved names — **DONE** (migration 017: 450+ entries)
- [x] Add Grove service names — **DONE** (all services included)
- [ ] Create admin UI for managing reserved usernames
- [ ] Add audit logging for changes
- [ ] Create tests for `offensive-blocklist.ts`

**Analytics / Funnel Tracking**
- [ ] Track funnel: OAuth → Profile → Plans → Checkout → Success
- [ ] Add `acquisition_events` tracking (ties into Vista)
- [ ] Track drop-off points for optimization

## Quick Wins
- [ ] **Custom confirmation dialogs** — Replace browser `confirm()` with glassmorphic modals
- [ ] **Rate limit config** — Move RATE_LIMIT_MAX to shared config/env vars
- [ ] **Focus management** — Return focus to button after actions complete

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

## Landing Site Migration (Post-Curio Launch)
> **Current:** grove.place/journey reads from `history.csv` at build time
> **Future:** Migrate to use Journey Curio API for consistency

- [ ] Create API route in landing to proxy to engine's curio endpoints
- [ ] Update `+page.server.ts` to fetch from API instead of CSV import
- [ ] Keep CSV as backup/seed data for the Curio
- [ ] Deprecate static CSV approach once Curio is stable

---

# 📦 DEFERRED FEATURES

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
> **Status:** Fallback exists in `domains/src/app.css` but NOT in engine

- [ ] Add `@supports not (backdrop-filter: blur(1px))` fallback to engine
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

*Last updated: 2026-01-18 (comprehensive planning session complete!)*
