# TODOs for Grove Platform

> **Note:** UI components and Design System have been split into [GroveUI](https://github.com/AutumnsGrove/GroveUI). This repo focuses on the core engine, example site, and hosting (grove.place).
>
> **Completed tasks:** See `COMPLETED.md` for historical record of finished work.

---

## ✅ Shade Routing Fix COMPLETE! (2025-12-31)

**Status: COMPLETE - All routing and Turnstile verification working!** 🎉

### What We Fixed
- ✅ Fixed grove-router default fallback (was using non-existent `groveengine.pages.dev`, now uses `grove-example-site.pages.dev`)
- ✅ Added missing vineyard route to grove-router SUBDOMAIN_ROUTES
- ✅ Deployed engine package to groveengine Pages project
- ✅ Engine now properly handles D1 tenant lookup (sarah.grove.place shows "Sarah's Garden" not "Midnight Bloom")
- ✅ Shade (Turnstile) verification redirects work (visitors get 302 → /verify)
- ✅ Archived deprecated `packages/example-site` to `_archived/example-site-deprecated-2025-12-31/`
- ✅ Fixed wisp API build error (renamed +server.js → +server.ts)
- ✅ Fixed Turnstile CSRF validation error - `/api/verify/turnstile` now uses origin-based validation like auth endpoints (new visitors don't have CSRF tokens yet)

---

## Vineyard Component Showcase

### ✅ GlassCarousel Completion (2026-01-01)
- [x] **Add GlassCarousel to vineyard showcase** — Interactive demo added with:
  - Variant switcher (default/frosted/minimal)
  - Autoplay toggle
  - Custom seasonal slide content
  - Swipe, drag, and keyboard navigation hints

---

## Nature Assets Migration (Future)

> **Note:** The nature components (trees, weather, sky, botanical, creatures, structural) currently live in `landing/src/lib/components/nature/`. These should eventually be moved to the engine package (`packages/engine/src/lib/ui/components/nature/`) so they can be shared across all Grove properties (landing, plant, meadow, engine admin).
>
> **Components to migrate:**
> - Trees: Logo, TreePine, TreeCherry, TreeAspen, TreeBirch
> - Weather: SnowfallLayer, FallingPetalsLayer, FallingLeavesLayer
> - Sky: Cloud, Moon, StarCluster, Sun, Rainbow
> - Ground: Tulip, Daffodil, FlowerWild, GrassTuft, Mushrooms, etc.
> - Creatures: Cardinal, Robin, Firefly, Butterfly, Deer, etc.
> - Structural: Lattice, Lantern, StonePath, GardenGate, Bridge
> - Palette: Season colors, midnightBloom palette
>
> **When:** After initial launch, when we want seasonal theming on plant.grove.place

---

## ✅ Admin Panel Overhaul COMPLETE! (2025-12-29)

**Status: DONE - Major UX improvements and Trails feature spec complete!**

### Admin Panel Updates
- ✅ Applied glassmorphism design to sidebar and content areas
- ✅ Replaced emojis with Lucide icons throughout admin panel
- ✅ Added collapsible sidebar with smooth animations
- ✅ Created `GlassConfirmDialog` component for destructive actions
- ✅ Added inline delete button to blog posts list (with confirmation)
- ✅ Updated dashboard stats: post count, word count, top tags, account age
- ✅ Added "What's New in the Grove" roadmap preview card
- ✅ Fixed vine/leaf background visibility (transparent glass effects)
- ✅ Removed Console section (Rings will replace later)

### Trails Feature Planning
- ✅ Added **Trails** to grove-naming.md - personal roadmaps for users
- ✅ Created `docs/specs/trails-spec.md` - full feature specification
- ✅ Added Trails to roadmap (First Buds phase, alongside Ivy/Amber)
- ✅ Updated DO architecture doc with admin panel extensions

### Remaining (Debug Locally)
- [x] Debug Edit button on blog list (navigation not working) - FIXED
  - Edit route exists at `/admin/blog/edit/[slug]`
  - Fixed tenant context issue in admin edit server route
  - Admin routes now handle missing tenantId gracefully
  - TableOfContents component clicking also fixed

---

## ✅ Build Error Cleanup COMPLETE! (2025-12-26)

**Status: DONE - All 260 errors fixed → 0 errors across all projects!** 🎉

- ✅ Fixed vite.config.js, POSTS_DB→DB, locals.tenant→locals.tenantId
- ✅ Renamed shop API files .js→.ts, added proper type annotations
- ✅ Fixed GutterItem types, null safety, error handling
- ✅ Fixed all shop API type issues (ProductStatus, PaymentStatus, etc.)
- ✅ Fixed all Svelte component type issues
- ✅ Fixed all test mock type compatibility
- ✅ **All projects: 0 errors!** (Engine, Landing, Plant, Domains)

---

## 🎉 Plant Signup Flow Working! (2025-12-24 Evening)

**MASSIVE DEBUGGING SESSION!** The plant.grove.place signup flow is now working through to checkout!

**What we fixed:**
- ✅ OAuth flow - Multiple issues resolved:
  - Registered `grove-plant` client in GroveAuth database
  - Fixed base64 vs base64url encoding mismatch in client secret hash
  - Fixed cookie domain mismatch (hardcoded canonical URL to avoid pages.dev issues)
  - Changed auth endpoint from `/authorize` to `/login` (GroveAuth-specific)
- ✅ CSRF 403 errors - SvelteKit's origin check was failing on Cloudflare Pages
  - Created `hooks.server.ts` with custom CSRF handling for allowed origins
  - Disabled built-in check, implemented explicit origin whitelist
- ✅ Created GitHub Actions workflow for plant deployment (`.github/workflows/deploy-plant.yml`)
- ✅ Added Stripe webhook events: `invoice.paid`, `customer.subscription.trial_will_end`
- ✅ Created billing email templates in `docs/templates/emails/`
- ✅ Profile form now submits successfully → redirects to `/plans`

**Current Status:**
- 🔄 Stripe checkout returning 500 - needs debugging (STRIPE_SECRET_KEY is set but may be wrong key or Stripe API issue)
- Form submission works, plans page displays correctly
- Need to verify Stripe API key is correct test mode key

**Files created/modified:**
- `plant/src/hooks.server.ts` - Custom CSRF handling
- `plant/svelte.config.js` - Disabled built-in CSRF check
- `.github/workflows/deploy-plant.yml` - CI/CD for plant
- `GroveAuth/src/db/seed.sql` - Added grove-plant client
- `plant/src/routes/profile/+page.svelte` - Fixed variable shadowing bug

---

## 🎉 LAUNCH MILESTONE - First Emails Sent! (2025-12-24)

**HUGE PROGRESS!** Grove has officially launched to the community!

**What happened:**
- ✅ Created launch email v1 with beautiful autumn forest screenshot
- ✅ Built script to extract 59 subscriber emails from production database
- ✅ Sent initial launch email: "I'm finally ready to show you what I've been building"
- ✅ Created and sent follow-up email v2 with clickable link: "Actually, here's a link you can click"
- ✅ Improved landing page UX - added vision CTA before email signup
- ✅ Both emails successfully delivered to all 59 subscribers! 🌲✨

**Next steps:**
- Monitor subscriber engagement
- Respond to any replies or questions
- Continue building toward January launch

**Email documents:**
- `docs/internal/grove-launch-email-v1.md` - Original launch email
- `docs/internal/grove-launch-email-v2-followup.md` - Follow-up with clickable link
- `scripts/get-subscribers.sh` - Subscriber email extraction tool

---

## ✅ SST Resources Deployed (2025-12-24)

**Current State:**
- ✅ `sst.config.ts` manages D1, KV, R2 resources
- ✅ Dev stage deployed with isolated resources
- ✅ Secrets management via `secrets.json` (gitignored)
- ✅ NPM scripts: `pnpm sst:dev`, `pnpm sst:prod`

### Dev Stage Resources Created
```
cacheId: 4b650904a144458abd9bdd67318ef05c
cdnName: grove-dev-grovecdnbucket-bbdbvtaf
mediaName: grove-dev-grovemediabucket-rcxtoscn
```

### Quick Commands
```bash
# Deploy to dev (creates new isolated resources)
pnpm sst:dev

# Deploy to production (imports existing resources by ID)
pnpm sst:prod

# Remove dev stage resources
pnpm sst:remove --stage dev
```

### Rollback Plan (if issues)
Apps still deploy via wrangler.toml - SST only manages resources.
Production resource IDs are hardcoded in sst.config.ts.

---

## 🚀 SST Migration Progress

> **Full Plan:** See `specs/sst-migration-plan.md` for complete migration strategy.

SST (sst.dev) manages infrastructure-as-code. Currently managing D1, KV, R2 resources.

### Implementation Phases

- [x] **Phase 1: Foundation** - `sst.config.ts` with D1/KV/R2 resources ✅
  - Dev stage deployed with isolated resources
  - Secrets via `secrets.json`, npm scripts added
- [x] **Phase 2: Stripe Integration** - Products/prices in code ✅
  - 4 products (Seedling, Sapling, Oak, Evergreen) created in Stripe test mode
  - 8 prices (monthly + yearly for each plan) created via SST
  - Price IDs wired up in `plant/src/lib/server/stripe.ts`
  - Webhook handler ready at `/api/webhooks/stripe`
  - **Remaining:** Set secrets in Cloudflare, configure webhook in Stripe Dashboard
- [ ] **Phase 3: SvelteKit Apps** - DEFERRED (wrangler works fine)
  - SST lacks `cloudflare.SvelteKit` component
  - Decision: SST for Stripe + resources, wrangler for app deployment
- [ ] **Phase 4: Dev Workflow** - Staging environment, PR previews, GitHub Actions
- [ ] **Phase 5: Cleanup** - Remove old wrangler.toml files, evaluate grove-router
  - [ ] Test all routing without grove-router active
  - [ ] Verify: cdn.grove.place, auth/admin/login subdomains, www redirect
  - [ ] If all works: delete `packages/grove-router` entirely
  - [ ] If gaps exist: document which edge cases still need the router

### Hybrid Routing Strategy

| User Type | Domain | Routing | Cost |
|-----------|--------|---------|------|
| Seedling/Sapling | `*.grove.place` | Worker wildcards | Free |
| Oak (BYOD) | `custom.com` | Cloudflare for SaaS | $0.10/hostname |
| Evergreen | `custom.com` | Cloudflare for SaaS | $0.10/hostname |

**Pricing:** 100 custom domains free, then $0.10 each, max 5,000 before Enterprise.

---

## 🛡️ Shade Implementation (Pre-Launch)

> **Spec:** See `docs/specs/shade-spec.md` for full technical specification.
> **Philosophy:** Users own their words. In a forest full of harvesters, this grove stays shaded.

### Phase 1: Cloudflare Configuration (Today)
- [ ] Verify "Block AI Bots" toggle is ON in Cloudflare Dashboard
- [ ] Enable "Bot Fight Mode"
- [ ] Check if "AI Labyrinth" is available and enable
- [x] Subscribe to Dark Visitors for ongoing blocklist updates ✅

### Phase 2: Technical Implementation (This Week)
- [ ] Deploy comprehensive robots.txt to grove.place
- [ ] Add `noai, noimageai` meta tags to all pages (root layout)
- [ ] Set `X-Robots-Tag: noai, noimageai` header via Transform Rules
- [ ] Configure WAF custom rules (3 of 5 slots):
  - Rule 1: Block empty/suspicious user agents
  - Rule 2: Challenge bot-like user agents (except Google, Bing, Yandex, Kagi)
  - Rule 3: High threat score filtering
- [ ] Set up rate limiting rules (60/min general, 200/5min crawling)

### Phase 2.5: Turnstile Human Verification
- [x] Create Turnstile widget in Cloudflare Dashboard ✅
- [x] Add site key to wrangler.toml files ✅
- [x] Add secret key to Cloudflare Pages (engine, landing, plant, ivy, amber) ✅
- [x] Implement TurnstileWidget.svelte component ✅
- [x] Add server-side verification utility (turnstile.ts) ✅
- [x] Create /api/verify/turnstile endpoint ✅
- [x] Update CSP to allow challenges.cloudflare.com ✅
- [x] Add verification page (/verify) for first-time visitors ✅
- [x] Set grove_verified cookie (7-day expiry) ✅
- [x] Write help center article (how-grove-protects-your-content.md) ✅

### Phase 3: Legal & Public Pages
- [ ] Create and publish `/shade` policy page
- [ ] Update Terms of Service with AI prohibition language
- [ ] Add footer link to /shade on all pages

### Phase 4: Post-Launch Monitoring
- [ ] Set up monitoring dashboard for blocked requests
- [ ] Document any false positive patterns
- [ ] Review and adjust rate limits based on real traffic

---

## Security Audit - Remaining Items

### Medium Priority
- [ ] **CDN magic byte validation** - Add file signature validation
  - Location: `landing/src/routes/api/admin/cdn/upload/+server.ts`
- [ ] **CSRF token rotation** - Implement per-session or periodic rotation
- [ ] **Rate limiting** - Add to image upload, post creation, settings endpoints
- [ ] **Content-Disposition headers** - Add to R2 uploads for forced download
- [ ] **Image bomb protection** - Add dimension validation after image load
- [ ] **JS/CSS CDN uploads** - Force download or remove from allowed types

### Low Priority (Polish)
- [ ] **Logout CSRF** - Consider requiring POST instead of GET
- [ ] **Failed attempts cleanup** - Add cleanup for old `failed_attempts` records
- [ ] **CSP headers** - Add Content-Security-Policy headers in hooks
- [ ] **Alt text sanitization** - Sanitize before DB storage in CDN patch endpoint

---

## ✅ Email Unsubscribe Flow COMPLETE! (2026-01-01)

**Status: COMPLETE - Token-based unsubscribe system live!** 🎉

### What We Built
- ✅ HMAC-SHA256 token generation (no DB column needed, derived from email + secret)
- ✅ Unsubscribe page at `/unsubscribe?email=x&token=y` with confirmation form
- ✅ Updated email templates with unsubscribe footer link
- ✅ Added `List-Unsubscribe` headers for email client "unsubscribe" buttons
- ✅ Warm, no-guilt-trip confirmation page ("We'll miss you")

### Files Created/Modified
- `landing/src/lib/email/tokens.ts` — HMAC token generation/verification
- `landing/src/lib/email/send.ts` — Added unsubscribe URL + headers
- `landing/src/lib/email/templates.ts` — Added unsubscribe footer
- `landing/src/routes/unsubscribe/+page.server.ts` — Token verification + DB update
- `landing/src/routes/unsubscribe/+page.svelte` — Confirmation UI

---

## Resend Broadcasts Integration (Future - Ivy)

> **Context:** Currently sending emails by copying subscribers into Proton Mail. Resend Audiences + Broadcasts would allow bulk email directly from Resend dashboard or API.
> **Goal:** Sync D1 subscribers to Resend Audience, then compose/send broadcasts without manual copy-paste.
> **Long-term:** Ivy (Grove email client) will handle this internally.

### Implementation Tasks
- [ ] Create Resend Audience via API or dashboard
- [ ] Build admin endpoint `/admin/api/sync-audience` to sync D1 → Resend
  - Push all subscribers where `unsubscribed_at IS NULL`
  - Handle adds/removes (Resend tracks unsubscribes automatically)
- [ ] Add "Sync Subscribers" button to admin panel
- [ ] Document broadcast workflow (compose in Resend dashboard, uses `{{{RESEND_UNSUBSCRIBE_URL}}}`)
- [ ] Consider scheduled sync (daily cron via Cloudflare Workers)

### Future: Ivy Integration
- [ ] Build Ivy compose UI for broadcasts
- [ ] API integration for send-from-Ivy
- [ ] Template management within Ivy
- [ ] Delivery analytics in Ivy dashboard

---

## Phase 1: GroveEngine MVP (Remaining)

- [ ] Test with Mom's publishing house as first client
- [ ] Implement basic analytics

---

## Phase 2: Multi-tenant Infrastructure

### User Registration to D1 ✅
> **Status:** COMPLETED (2025-12-19)
> - Created `migrations/013_users.sql` with users table
> - Updated `/auth/callback/+server.ts` to fetch userinfo and UPSERT user
> - Added `getUserFromSession()` and related helpers in `src/lib/server/services/users.ts`
> - Exported from `@autumnsgrove/groveengine/services`

### Auth Bug - Login Button Does Nothing ✅
> **Status:** FIXED (2025-12-19)
> - Moved OAuth initiation to `/auth/login/start/+server.ts`
> - Updated `+page.svelte` to redirect to `/auth/login/start`
> - Removed conflicting `/auth/login/+server.ts`

- [x] Build tenant onboarding flow → **DEPLOYED**: `plant.grove.place`
  - ✅ Signup: name, username (=subdomain), verified email, favorite color, interests
  - ✅ Plan selection page with 4 tiers
  - ✅ Payment via Stripe (SST-generated price IDs wired up)
  - ✅ Interactive tour (8 steps, skippable)
  - ✅ Email templates ready (welcome, day 1/3/7/30)
  - ⏳ **Config needed:** Set auth/Stripe secrets in Cloudflare Dashboard

### Stripe Integration (plant.grove.place) ✅
> **Status:** COMPLETE via SST (2025-12-24)
> **Location:** `plant/src/lib/server/stripe.ts`
>
> **Completed:**
> - [x] Products defined in `sst.config.ts` using `stripe.Product`
> - [x] 8 prices created (4 plans × monthly/yearly)
> - [x] Price IDs wired up in plant app
> - [x] Webhook handler at `/api/webhooks/stripe`
>
> **Remaining Config (Cloudflare + Stripe Dashboards):**
> - [ ] Set STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY in Cloudflare
> - [ ] Create webhook in Stripe Dashboard → get STRIPE_WEBHOOK_SECRET
> - [ ] Set GROVEAUTH_* secrets for OAuth flow
- [ ] Implement plan management (Seedling/Sapling/Oak/Evergreen)
  - **Tiers:** Seedling ($8), Sapling ($12), Oak ($25), Evergreen ($35)
  - **Free tier** for Meadow-only users (no blog, social features only)
  - See: `docs/grove-pricing.md`, `docs/internal/pricing-discussions.md`
- [ ] Implement Free tier signup and upgrade flow
  - Free users created directly (no Stripe checkout)
  - Store `plan='free'` in tenants table
  - Free → Paid upgrade via `/api/billing` (creates Stripe subscription)
  - No downgrade from paid to free (cancel = keep until period end)
  - Rate limits: 20 public comments/week, 50 private replies/day
- [ ] Add custom domain support for Oak+ (BYOD) and Evergreen (search + registration included)
- [ ] Build tenant admin panel
- [ ] Implement storage limits per plan (1GB/5GB/20GB/100GB)

### Per-Tenant Theming → Foliage Integration
> **Issue:** All tenants currently share the same green theme. Midnight Bloom should have its purple theme back.
> **Solution:** Integrate `@autumnsgrove/foliage` - our dedicated theming package.
> **Repository:** https://github.com/AutumnsGrove/Foliage

**Foliage provides:**
- 10 curated themes (Grove, Minimal, Night Garden, Zine, Moodboard, Typewriter, Solarpunk, Cozy Cabin, Ocean, Wildflower)
- Tier-gated access (Seedling=3, Sapling=10, Oak+=customizer, Evergreen+=custom fonts)
- CSS variable generation with WCAG AA contrast validation
- Community themes (Oak+ can browse/submit, moderation queue)
- Custom font uploads to R2 (Evergreen tier)

**Integration Tasks:**
- [ ] Add `@autumnsgrove/foliage` as dependency to engine
- [ ] Run Foliage migrations (theme_settings, community_themes, theme_ratings tables)
- [ ] Add R2 bucket for custom fonts (`foliage-fonts`)
- [ ] Import `loadThemeSettings` in engine's `+layout.server.ts`
- [ ] Apply theme CSS vars via `applyThemeVariables()` in `+layout.svelte`
- [ ] Add theme admin routes (`/admin/themes/`) using Foliage components
- [ ] Wire up tier access using `canAccessTheme()`, `canUseCustomizer()`, etc.

**Midnight Bloom Theme** - Can be implemented as custom colors via customizer (Oak+) or as a community theme.

---

## Phase 3: Grove Website (Remaining)

- [ ] Add customer portal
- [ ] Implement signup flow (see tenant onboarding spec)
- [ ] Add documentation/help center → **SPEC READY**: `docs/specs/help-center-spec.md`
  - Built into admin panel, not external docs site
  - Contextual help buttons (Cloudflare-style) throughout admin UI
  - SQLite FTS5 search, 10 categories, "Was this helpful?" feedback

---

## Phase 4: Content Moderation System (Weeks 16-20)
> **Spec:** See `docs/Specs/CONTENT-MODERATION.md` for full technical specification.

**Implementation Tasks:**
- [ ] Set up Fireworks AI / Groq accounts with ZDR enabled
- [ ] Create isolated Cloudflare Worker for moderation service
- [ ] Implement encrypted content queue in KV
- [ ] Build decision engine with confidence threshold routing
- [ ] Create notification email templates in Resend
- [ ] Set up anonymous audit logging (no content stored)
- [ ] Write integration tests with mock API responses

**UI/UX Tasks:**
- [ ] Add publishing state UI (post → review → published)
- [ ] Build moderation notification center for users
- [ ] Create appeal submission form
- [ ] Add AI content labeling toggle in post editor

**Operational Tasks:**
- [ ] Document moderator vetting and training criteria (Section 8.4)
- [ ] Create moderator burnout prevention guidelines
- [ ] Set up API key rotation reminders (90-day schedule)
- [ ] Create test suite per Section 14 checklist

---

## Phase 5: Grove Social / Meadow (Weeks 21-30)

> **Spec:** See `docs/specs/social-spec.md` for full technical specification.
> **Naming:** Meadow is the public name, GroveSocial internally.

### 5.1 Meadow Landing Page (Pre-Launch)
- [ ] Create `meadow/` project directory with basic SvelteKit setup
- [ ] Create wrangler.toml with Turnstile site key
- [ ] Build landing page explaining Meadow features:
  - No public metrics, no viral mechanics
  - Chronological feed of people you follow
  - Reactions only visible to author
  - Connection without competition
- [ ] Add Shade protections (robots.txt, meta tags, Turnstile)
- [ ] Deploy to meadow.grove.place

### 5.2 Core Social Features
- [ ] Build community feed system
- [ ] Implement post sharing between blogs
- [ ] Add voting system (upvotes/downvotes)
- [ ] Implement emoji reactions
- [ ] Build social features UI
- [ ] Add privacy controls for shared posts
- [ ] Extend moderation system for social content (comments, reactions)

---

## Phase 6: Polish & Scale (Weeks 31-41)

- [ ] Performance optimization
- [ ] Implement theme system → **NOW: Foliage Integration** (see Phase 2 "Per-Tenant Theming")
  - Spec at `docs/specs/theme-system-spec.md`, implementation at `@autumnsgrove/foliage`
  - 10 curated themes, tier-gated access, community themes, custom fonts
- [ ] Implement advanced analytics (see docs/specs/analytics-spec.md)
- [ ] Build priority support system
- [ ] Implement comment system → **SPEC READY**: `docs/specs/comments-spec.md`
  - Custom build (NOT Hyvor Talk) - dual-mode system
  - **Reply** = private message to author (like email)
  - **Comment** = public, visible to all (requires author approval queue)
  - Rate limits: Free=20/week public, 50/day private; Paid=unlimited
  - Integrates with content moderation system
- [ ] Implement data export (markdown + pictures + comments as zip)
  - Export format documented in `docs/legal/data-portability-separation.md`
- [ ] Implement backup/restore functionality
- [ ] Scale infrastructure as needed

---

## Durable Objects Implementation (Post-Launch)

> **Spec:** See `docs/grove-durable-objects-architecture.md` for full technical specification.
> **Priority:** High - Solves auth coordination, D1 write scaling, and enables real-time features.
> **Philosophy:** DOs are a coordination and caching layer, not a replacement for D1. D1 remains source of truth.

### DO Phase 1: Auth (Heartwood) — HIGHEST PRIORITY
- [ ] Implement `SessionDO` class with SQLite storage
- [ ] Update Heartwood OAuth flow to use SessionDO
- [ ] Update auth middleware in all workers to validate via SessionDO
- [ ] Add "manage sessions" UI showing active devices
- [ ] Test cross-subdomain auth

**Expected improvements:**
- Login time: 15 seconds → 2-3 seconds
- Session validation: D1 query → DO call (sub-millisecond if cached)
- "Log out all devices" becomes trivial

### DO Phase 2: Tenant Coordination
- [ ] Implement `TenantDO` class with SQLite storage
- [ ] Migrate config loading from D1 to TenantDO
- [ ] Add per-tenant rate limiting
- [ ] Set up analytics buffering to TenantDO

**Expected improvements:**
- Config load: D1 query per request → cached in DO
- Rate limiting: Works correctly (currently IP-based only)
- D1 writes: Reduced by ~90% for analytics

### DO Phase 3: Content Coordination
- [ ] Implement `PostDO` class
- [ ] Add real-time reactions (atomic, no lost updates)
- [ ] Add comment WebSocket for live updates
- [ ] Add presence indicators ("X people viewing")

### DO Phase 4: Meadow Social (After Meadow MVP)
- [ ] Implement `FeedDO` class (pre-computed personalized feeds)
- [ ] Implement `NotificationDO` class (aggregated notifications)
- [ ] Add follow/unfollow with feed updates
- [ ] Add push notifications via WebSocket

### DO Phase 5: Analytics (Rings Enhancement)
- [ ] Implement `AnalyticsDO` class (one per tenant per day)
- [ ] Add real-time dashboard via WebSocket
- [ ] Implement 60-second flush-to-D1 strategy
- [ ] Add end-of-day finalization
- [ ] Privacy: daily hash rotation for visitor deduplication

**Expected improvements:**
- D1 writes: 87% reduction (10,000 events → ~1,400 batched writes/day)
- Real-time dashboard: Live updates without polling

---

## Future Considerations (Post-Launch)

### Shop Feature (E-commerce) - DEFERRED
> **Status:** Temporarily disabled (2025-12-09). Shop API routes return 503, UI shows "Coming Soon" page.
> **Resume:** After Phase 4 (Grove Social) is complete.

### Theme System Expansion
> **Status:** Core features implemented in `@autumnsgrove/foliage`. Below are post-launch expansions.
- [x] Custom CSS override option (Oak+ via customizer) - **IN FOLIAGE**
- [x] Community theme submission portal - **IN FOLIAGE**
- [x] Theme builder/customizer UI (Oak+) - **IN FOLIAGE**
- [x] Custom font uploads (Evergreen) - **IN FOLIAGE**
- [ ] **Midnight Bloom theme** - Add to Foliage as 11th curated theme (purple/plum/amber, late-night tea café vibe)
- [ ] Theme marketplace (users buy/sell themes) - **DEFERRED** to post-launch

### Internal Tools
- [ ] Add search queue support (allow multiple concurrent domain searches)

### Vista Pre-requisites
- [ ] **Add `/health` endpoint to autumnsgrove worker** — Required for Vista health monitoring
  - Location: autumnsgrove repo (autumnsgrove.dev)
  - Endpoint should return `{ status: "ok" }` with 200 status code
  - See `docs/specs/vista-spec.md` for health check standard

### Personal TODOs
- [ ] Within markdown editor, allow for Drafts (saveable, postable later)

### Spring Mode for Landing Site ✅
> **Status:** COMPLETED (2025-12-22)
> Full spring mode implemented with blossom pink logo, spring birds (Robin, Bluebird),
> spring flowers (Tulip, Crocus, Daffodil), fresh yellow-green foliage, and spring sky gradients.
> All components registered in asset viewer.

### Migration Tools Expansion
- [ ] WordPress import tool
- [ ] Ghost import tool
- [ ] Medium import tool
- [ ] Substack import tool
- [ ] Generic RSS/Atom import
- [ ] Bulk media migration

### API Access (Paid Add-on)
- [ ] Public REST API for reading posts
- [ ] Authenticated API for creating/editing posts
- [ ] API key management in dashboard
- [ ] Rate limiting and usage tracking
- [ ] API documentation and examples
- [ ] Webhook support for external integrations
- [ ] SDK/client libraries (JavaScript, Python)

---

## Legal & Compliance (Remaining)

- [x] Add AGPL-3.0 license to repo
- [ ] Register DMCA designated agent with US Copyright Office ($6 fee)
  - Required for DMCA safe harbor protection
  - Register at: https://www.copyright.gov/dmca-directory/
- [ ] **PRE-LAUNCH: Review all legal policies**
  - Review ToS for any needed updates
  - Review Privacy Policy for accuracy
  - Review AUP for clarity and enforceability
  - Consider professional legal review

---

## Documentation (Remaining)

- [ ] Add usage examples for tenants
- [ ] Write testing documentation

---

## Success Metrics

- [ ] Zero data loss incidents
- [ ] Page load time < 2 seconds
- [ ] < 10 hours support per client/month
- [ ] < 5% monthly churn rate
- [ ] Net Promoter Score > 50
- [ ] 10 clients by Month 3
- [ ] 20 clients by Month 6
- [ ] $500 MRR by Month 12
