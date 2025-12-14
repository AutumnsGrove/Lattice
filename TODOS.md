# TODOs for Grove Platform

> **Note:** UI components and Design System have been split into [GroveUI](https://github.com/AutumnsGrove/GroveUI). This repo focuses on the core engine, example site, and hosting (grove.place).
>
> **Completed tasks:** See `COMPLETED.md` for historical record of finished work.

---

## Security Audit - Remaining Items

### Medium Priority
- [ ] **CDN magic byte validation** - Add file signature validation
  - Location: `landing/src/routes/api/admin/cdn/upload/+server.ts`
- [ ] **Email enumeration timing** - Add consistent delays for non-allowed emails
  - Location: `send-code/+server.js:169-173`
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

- [ ] Build tenant onboarding flow → **SPEC READY**: `docs/specs/tenant-onboarding-spec.md`
  - Signup: name, username (=subdomain), verified email, favorite color, interests
  - Plan selection → Payment via Stripe → Interactive tour (5-10 min, skippable)
  - Handoff: D1 initialized, site live immediately
  - Email sequence: welcome, day 3, 7, 30 follow-ups
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

### Dave Test Tenant - WORKING! (2025-12-14)
> **Status:** ✅ Multi-tenant routing fully working!
>
> **Completed (2025-12-14):**
> - [x] Fixed `POSTS_DB` → `DB` binding mismatch across all routes
> - [x] Added tenant filtering (`tenant_id`) to all D1 queries
> - [x] Deployed engine package to `groveengine` Pages project
> - [x] Created `example` tenant for Midnight Bloom demo
> - [x] Migrated example-site content to D1
> - [x] Fixed default font from `alagard` to `lexend`
> - [x] Removed broken nav links (Recipes, Timeline, Gallery)
>
> **Remaining:**
> - [ ] Wire up Heartwood auth (see section below)
> - [ ] Add super-admin access for testing
> - [ ] Investigate per-tenant theming (Midnight Bloom purple theme)
> - [ ] Create Sarah test tenant for multi-tenant validation

### Heartwood Auth Migration
> **Priority:** HIGH - Blocks admin access for tenants
> **Auth API:** `auth-api.grove.place` (Worker)
> **Auth UI:** `auth.grove.place` (Pages)

**Migration Steps:**
1. [ ] **Update hooks.server.ts** - Replace JWT session verification with Heartwood token validation
   - Call `auth-api.grove.place/api/validate` to verify tokens
   - Or decode Heartwood JWTs locally if public key is available

2. [ ] **Replace login routes** - Remove magic code flow
   - [ ] Delete `auth/send-code/+server.js`
   - [ ] Delete `auth/verify-code/+server.js`
   - [ ] Update `auth/login/+page.svelte` to redirect to Heartwood

3. [ ] **Add OAuth callback route**
   - [ ] Create `auth/callback/+server.js` to handle OAuth redirect
   - [ ] Exchange authorization code for tokens via GroveAuth client
   - [ ] Create session cookie with Heartwood tokens

4. [ ] **Update session handling**
   - [ ] Store Heartwood access_token in session cookie (or use refresh flow)
   - [ ] Update `verifySession()` to validate Heartwood tokens
   - [ ] Handle token refresh when expired

5. [ ] **Configure environment**
   - [ ] Add `GROVEAUTH_CLIENT_ID` secret
   - [ ] Add `GROVEAUTH_CLIENT_SECRET` secret
   - [ ] Set redirect URI to `https://{tenant}.grove.place/auth/callback`

6. [ ] **Add super-admin bypass**
   - [ ] Add `SUPER_ADMIN_EMAILS` env var
   - [ ] Update `getVerifiedTenantId()` to allow super-admins access to any tenant
   - [ ] Log super-admin access for audit trail

### Per-Tenant Theming
> **Issue:** All tenants currently share the same green theme. Midnight Bloom should have its purple theme back.
> **Reference:** Old example-site had purple theme defined in `tailwind.config.js` and `+layout.svelte`

**Implementation Options:**

**Option A: CSS Variables per Tenant (Recommended)**
- [ ] Add `theme_primary_color`, `theme_accent_color` columns to `tenants` table
- [ ] Load tenant theme colors in `+layout.server.ts`
- [ ] Apply as CSS variables in `+layout.svelte` (override `:root` vars)
- [ ] Add theme color picker to tenant admin settings

**Option B: Preset Themes**
- [ ] Create theme presets (Grove Green, Midnight Purple, Ocean Blue, etc.)
- [ ] Add `theme_preset` column to `tenants` table
- [ ] Load preset CSS based on tenant selection

**Immediate Fix (for Midnight Bloom):**
- [ ] Add theme colors to `example` tenant in D1
- [ ] Update CSS to read tenant theme from context

**Midnight Bloom Original Theme** (from `example-site/src/app.css`):
```css
/* Light Mode - Late Night Tea Café */
--primary: 340 45% 35%;           /* Deep Plum/Burgundy - like steeped black tea */
--primary-foreground: 40 30% 95%;
--accent: 38 70% 50%;             /* Golden Amber - like honey */
--background: 40 25% 97%;         /* Warm off-white */
--foreground: 340 30% 15%;

/* Dark Mode - Late night ambiance */
--primary: 340 50% 55%;           /* Lighter Plum */
--accent: 38 75% 55%;             /* Brighter golden */
--background: 260 20% 8%;         /* Deep night purple */
--foreground: 40 15% 90%;
```

**Files to Update:**
- `src/routes/+layout.server.ts` - Load theme from tenant
- `src/routes/+layout.svelte` - Apply theme CSS variables
- `src/lib/db/schema.sql` - Add theme columns (migration)
- `src/routes/admin/settings/+page.svelte` - Theme picker UI

### Additional Test Tenants
> Create more test tenants to validate multi-tenant isolation

- [ ] **Sarah's Garden** (`sarah.grove.place`)
  - Different theme/colors than Dave
  - Test font settings isolation
  - Verify content doesn't leak between tenants

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
- [ ] Implement theme system → **SPEC READY**: `docs/specs/theme-system-spec.md`
  - 10 hand-curated themes: Grove, Minimal, Night Garden, Zine, Moodboard, Typewriter, Solarpunk, Cozy Cabin, Ocean, Wildflower
  - Tiered access: Seedling=3, Sapling=10, Oak+=customizer+community themes, Evergreen+=custom fonts
  - CSS variable system, custom font uploads to R2
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
> *See: `docs/specs/theme-system-spec.md` for full implementation plan*
- [ ] Custom CSS override option for advanced users (Oak+ via customizer)
- [ ] Theme marketplace (users buy/sell themes) - **DEFERRED** to post-launch
- [ ] Community theme submission portal (Oak+ can download, authors can submit)
- [ ] Theme builder/customizer UI (Oak+)
- [ ] Custom font uploads (Evergreen only, stored in R2)

### Internal Tools
- [ ] Add search queue support (allow multiple concurrent domain searches)

### Personal TODOs
- [ ] Within markdown editor, allow for Drafts (saveable, postable later)

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

- [ ] Add AGPL-3.0 license to repo
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
