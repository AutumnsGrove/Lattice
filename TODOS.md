# TODOs for Grove Platform

> **Note:** UI components and Design System have been split into [GroveUI](https://github.com/AutumnsGrove/GroveUI). This repo focuses on the core engine, example site, and hosting (grove.place).
>
> **Completed tasks:** See `COMPLETED.md` for historical record of finished work.

---

## 🔥 Immediate: Merge PR & Deploy SST

**Current State (2025-12-24):**
- ✅ `sst.config.ts` written - unified config for all Cloudflare resources
- ✅ Router default target bug fixed (was routing to example-site instead of groveengine)
- ✅ Knowledge base updated with ALL specs (including completed folder)
- ⚠️ PR #104 has merge conflicts - needs to be resolved before merge

### Commands to Run

```bash
# 1. Merge this PR (after resolving conflicts in GitHub)
#    Or locally:
git checkout main
git pull origin main
git merge claude/plan-next-steps-0rjeY
# Resolve any conflicts, then:
git push origin main

# 2. Install SST and initialize
pnpm add -D sst@latest
pnpm sst install

# 3. Deploy to dev stage first
pnpm sst deploy --stage dev

# 4. Once verified, deploy to production
pnpm sst deploy --stage production
```

### Rollback Plan (if SST deployment fails)

```bash
# 1. Revert to previous commit (before SST changes)
git revert HEAD --no-commit
git commit -m "revert: roll back SST migration"

# 2. Redeploy each app via wrangler (old configs still work)
cd landing && pnpm wrangler pages deploy
cd ../plant && pnpm wrangler pages deploy
cd ../domains && pnpm wrangler pages deploy
cd ../packages/engine && pnpm wrangler pages deploy
cd ../packages/example-site && pnpm wrangler pages deploy

# 3. Verify all apps are back online
# Resource IDs (D1, KV, R2) remain unchanged - SST imports existing ones
```

**Why this works:** SST imports existing Cloudflare resources by ID rather than creating new ones. Rolling back to wrangler deployment doesn't affect the underlying data.

### Post-Merge Cleanup
- [ ] Delete branch `claude/plan-next-steps-0rjeY`
- [ ] Verify all apps still work after SST migration
- [ ] Remove old `wrangler.toml` files (Phase 5)

---

## 🚀 Up Next: SST Migration

> **Full Plan:** See `specs/sst-migration-plan.md` for complete migration strategy.

SST (sst.dev) will unify our infrastructure-as-code, replacing multiple `wrangler.toml` files with a single TypeScript config. Key benefits:

- **Stripe in Code** - Define products, prices, and webhooks as code (greenfield setup)
- **Staging Environment** - Finally stop deploying straight to production
- **PR Previews** - Auto-deploy each PR to `pr-123.grove.place` with Stripe test mode
- **Simplified Routing** - Workers handle `*.grove.place` natively, Cloudflare for SaaS for custom domains only (Oak+ tier)

### Implementation Phases

- [x] **Phase 1: Foundation** - `sst.config.ts` created with unified config ✅
- [ ] **Phase 2: Stripe Integration** - Products/prices in code, webhooks, billing portal
- [ ] **Phase 3: SvelteKit Apps** - Migrate engine, plant, landing to SST
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
  - ⏳ Payment via Stripe (placeholder IDs, needs real products)
  - ✅ Interactive tour (8 steps, skippable)
  - ✅ Email templates ready (welcome, day 1/3/7/30)
  - ⚠️ **Auth issue:** Login hangs after OAuth redirect (route misconfiguration)

### Stripe Integration (plant.grove.place)
> **Status:** Code deployed with placeholder price IDs. **Will be migrated to SST.**
> **Location:** `plant/src/lib/server/stripe.ts`
> **New Plan:** See `specs/sst-migration-plan.md` - products/prices defined in code via SST
>
> **SST Approach (Preferred):**
> - [ ] Define products in `sst.config.ts` using `sst.stripe.Product`
> - [ ] Define prices (8 total: 4 plans × monthly/yearly)
> - [ ] SST auto-creates products/prices in Stripe on deploy
> - [ ] SST manages webhook endpoints automatically
> - [ ] Different Stripe keys per stage (test for dev/PR, live for production)
>
> **Manual Fallback (if SST not ready):**
> - [ ] Create 4 products in Stripe Dashboard (Seedling, Sapling, Oak, Evergreen)
> - [ ] Create 8 prices (4 plans × monthly/yearly with 15% discount)
> - [ ] Replace placeholder IDs in `plant/src/lib/server/stripe.ts`
> - [ ] Set STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET secrets
> - [ ] Configure webhook endpoint: `https://plant.grove.place/api/webhooks/stripe`
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

## Phase 5: Grove Social (Weeks 21-30)

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
