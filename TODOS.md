# TODOs for Grove Platform

> **Note:** UI components and Design System have been split into [GroveUI](https://github.com/AutumnsGrove/GroveUI). This repo focuses on the core engine, example site, and hosting (grove.place).
>
> **Completed tasks:** See `COMPLETED.md` for historical record of finished work.

---

# 🚀 LAUNCH SPRINT

These are the blockers. Get these done and you're live.

---

## 🛡️ Shade Implementation — ✅ COMPLETE!

> **Spec:** `docs/specs/shade-spec.md`
> **Philosophy:** Users own their words. In a forest full of harvesters, this grove stays shaded.
> **Status:** Free tier protection deployed and effective (blocks 90%+ of AI scrapers)

### ✅ Deployed & Working
- [x] Subscribe to Dark Visitors for ongoing blocklist updates
- [x] Create Turnstile widget in Cloudflare Dashboard
- [x] Add site key to wrangler.toml files
- [x] Add secret key to Cloudflare Pages (engine, landing, plant, ivy, amber)
- [x] Implement TurnstileWidget.svelte component
- [x] Add server-side verification utility (turnstile.ts)
- [x] Create /api/verify/turnstile endpoint
- [x] Update CSP to allow challenges.cloudflare.com
- [x] Add verification page (/verify) for first-time visitors
- [x] Set grove_verified cookie (7-day expiry)
- [x] Write help center article (how-grove-protects-your-content.md)
- [x] Verify "Block AI Bots" toggle is ON in Cloudflare Dashboard
- [x] Enable "Bot Fight Mode"
- [x] Deploy comprehensive robots.txt to grove.place
- [x] Add `noai, noimageai` meta tags to all pages (root layout)
- [x] Set `X-Robots-Tag: noai, noimageai` header via Transform Rules
- [x] Create `/shade` policy page
- [x] Add footer link to /shade on all pages

### 📝 Optional Future Upgrade (Not Required for Launch)
- [ ] **Cloudflare Pro ($20/mo)** - Adds WAF custom rules + advanced rate limiting
  - Catches the remaining 5-10% of sophisticated scrapers
  - Can enable post-launch if analytics show scraping attempts
  - Current free tier protection is already highly effective

### 📋 Legal Cleanup (Non-Blocking)
- [ ] **Update Terms of Service** with AI prohibition language (15 min task)

---

## 💳 Stripe Production Configuration — ✅ COMPLETE!

> **Code:** Complete in `plant/src/lib/server/stripe.ts`
> **Setup Guide:** `docs/STRIPE-SETUP.md`
> **Status:** All live price IDs configured, ready for production!

### ✅ Completed
- [x] Switch Stripe Dashboard from test mode to live mode
- [x] Create 4 products (Seedling $8, Sapling $12, Oak $25, Evergreen $35)
- [x] Create 8 prices (monthly + yearly for each tier)
- [x] Copy live price IDs to `plant/src/lib/server/stripe.ts`
- [x] Set production secrets in Cloudflare Dashboard
- [x] Products configured with 14-day trial period
- [x] Webhook handler ready at `/api/webhooks/stripe`

### 📝 Final Step (When Ready to Accept Payments)
- [ ] Verify GROVEAUTH_* secrets are set for OAuth flow (required for signup to work)

---

## 🚦 Rate Limiting (Threshold) — CORE COMPLETE ✅

> **Spec:** `docs/patterns/threshold-pattern.md`
> **Implementation:** `packages/engine/src/lib/server/rate-limits/`
> **Status:** Core KV-based rate limiting complete. See "Rate Limiting Enhancement" section below for details.

### Phase 1: Cloudflare Edge Rate Limiting (Days 1-2)
- [ ] Configure Cloudflare WAF rate limiting rules (Layer 1)
  - General request limit: 1000 req/min per IP
  - Auth endpoint limit: 50 req/5min per IP
  - Upload endpoint limit: 100 req/hour per IP
  - AI endpoint limit: 500 req/day per IP
- [ ] Test rules don't block legitimate traffic

### Phase 2: Tenant Rate Limiting ✅ COMPLETE
- [x] Implement `checkTenantRateLimit()` method
- [x] Add tier-based limits (Seedling: 100/min, Oak: 1000/min)
- [x] Add rate limit headers to responses (`X-RateLimit-*`)
- [ ] Add rate limit tables to TenantDO schema (deferred to DO phase)
- [ ] Integrate with router middleware (after TenantDO ready)

### Phase 3: User Rate Limiting ✅ PARTIAL
- [x] Implement abuse state tracking (KV-based)
- [x] Implement `checkRateLimit()` middleware
- [x] Implement graduated response (warning → 24h ban after 5 violations)
- [ ] Add rate limit tables to SessionDO schema (deferred to DO phase)
- [ ] Integrate with Heartwood login flow

### Phase 4: Monitoring (Post-Launch OK)
- [ ] Add rate limit event logging
- [ ] Create Vista dashboard component
- [ ] Configure alert thresholds
- [ ] Document runbooks for common scenarios

---

## 📊 Clearing (Public Status Page) — ✅ DEPLOYED!

> **What it is:** Public-facing status page at `status.grove.place` (NOT Vista — Vista is the internal monitoring dashboard)
> **Location:** `clearing/` directory - complete SvelteKit application
> **Spec:** `docs/specs/clearing-spec.md`
> **Status:** ✅ **LIVE at https://status.grove.place** (Deployed 2026-01-11)

### Architecture Decision (2026-01-10)
Clearing lives **inside GroveEngine** as a monorepo package, not as a separate repo. The external `AutumnsGrove/Clearing` repo was archived — it was just a template placeholder with no implementation. Benefits:
- Shared D1 database with main engine (no cross-repo coordination)
- Single pnpm workspace for consistent tooling
- Simpler deployment pipeline

### What's Built
- 7 Svelte components: `GlassStatusBanner`, `GlassStatusCard`, `GlassUptimeBar`, `IncidentCard`, `ScheduledMaintenanceCard`, `Header`, `Footer`
- Full routes: status page, incident details (`/incidents/[slug]`), RSS feed (`/feed`)
- D1 queries in `src/lib/server/status.ts`
- TypeScript types in `src/lib/types/status.ts`
- Database migration ready: `migrations/0001_status_tables.sql`

### Deployment Tasks ✅ COMPLETED
- [x] Run database migrations (`wrangler d1 execute grove-engine-db --remote --file=clearing/migrations/0001_status_tables.sql`)
- [x] Create Cloudflare Pages project `grove-clearing`
- [x] Configure custom domain `status.grove.place` via grove-router
- [x] Deploy to production (`cd clearing && pnpm run deploy`)
- [x] Update grove-router to point `status` subdomain to `grove-clearing.pages.dev`

### Phase 2 (Post-Launch)
- [ ] Admin interface in GroveAuth for creating/updating incidents
- [ ] Component status override controls
- [ ] Scheduled maintenance UI

---

## 📋 Legal Pre-Launch Checklist

- [ ] Register DMCA designated agent with US Copyright Office ($6 fee)
  - Required for DMCA safe harbor protection
  - Register at: https://www.copyright.gov/dmca-directory/
- [x] Review ToS for any needed updates — ✅ Added AI prohibition section, updated dates
- [x] Review Privacy Policy for accuracy — ✅ Already comprehensive, updated dates
- [x] Review AUP for clarity and enforceability — ✅ Excellent as-is, updated dates

---

# 📅 THIS WEEK (Non-Blocking but Important)

---

## 📸 Tour Walkthrough Screenshots — HUMAN TASK

> **Location:** `plant/static/tour/`
> **Context:** The onboarding tour shows 6 placeholder images. Need actual screenshots.

### Screenshots Needed (6 total)

| File | Step Title | What to Screenshot |
|------|------------|-------------------|
| `homepage.png` | Your Blog Homepage | example.grove.place - clean landing page with Midnight Bloom branding |
| `post.png` | Blog Posts | A blog post page showing markdown content with images |
| `vines.png` | Vines - Margin Notes | A post with visible vine/margin annotations in the sidebar |
| `admin.png` | Your Dashboard | The admin panel overview (your-blog.grove.place/admin) |
| `editor.png` | The Post Editor | Markdown editor with live preview, showing drag-drop for images |
| `autumnsgrove.png` | See It In Action | autumnsgrove.com homepage as a real-world example |

### Technical Requirements
- **Dimensions:** 16:9 aspect ratio recommended (matches the `aspect-video` container)
- **Resolution:** 1280×720 or 1920×1080, will be displayed in ~600px wide container
- **Theme:** Use light mode for consistency (or match Grove's default theme)
- **Format:** PNG for screenshots

### Notes
- First step (Welcome) and last step (You're Ready!) use icons, no screenshot needed
- Tour code is in `plant/src/routes/tour/+page.svelte`
- Current placeholder shows "Preview of [location]" text

---

## 🔍 Safari Reader Mode & Glass Cards — QUICK FIX

> **Issue:** Safari Reader Mode strips `backdrop-blur` and translucent backgrounds, making glass card content invisible.
> **Discovered:** 2026-01-06 while reviewing Vision page Core Values cards
> **Severity:** Medium — affects content accessibility for users who prefer reader mode

### The Problem
- Glass cards use `bg-white/60 backdrop-blur-md` styling
- Reader mode extracts semantic content and strips most CSS
- Content inside glass cards becomes unreadable (no background, no contrast)

### Implementation Tasks
- [ ] Add `@supports not (backdrop-filter: blur(1px))` fallback in Tailwind config or global CSS
  ```css
  @supports not (backdrop-filter: blur(1px)) {
    .glass-card, [class*="Glass"] {
      background: rgba(255, 255, 255, 0.95) !important;
      /* or use solid bg-white dark:bg-slate-800 */
    }
  }
  ```
- [ ] Wrap glass card content in semantic `<article>` or `<section>` elements
- [ ] Ensure text inside glass cards has sufficient color contrast even without backdrop
- [ ] Test fix in Safari iOS (Settings → Safari → Show Reader) and Safari macOS (View → Show Reader)

### Pages to Test After Fix
- `/vision` — Core Values cards (5 cards)
- `/pricing` — Plan comparison cards
- `/roadmap` — Feature lists
- Any glass-heavy content pages

---

## 🌿 Vines Subicons Brainstorm — ON HOLD

> **Context:** Vines are "gutter widgets" - margin content that climbs alongside posts.
> **Current:** GutterManager.svelte implements Comment, Photo, Gallery types
> **Status:** Brainstorming paused for launch sprint

**Ideas to explore (post-launch):**
- Content annotation: Footnote, Aside, Callout, Definition
- Media: Audio, Video, Code snippets, Diagrams (Weave/Fern)
- Navigation: Related posts, Backlinks, Series nav, External links
- Interactive: Polls, Reactions, Bookmarks

**Reference files:**
- `packages/engine/src/lib/components/admin/GutterManager.svelte`
- `docs/specs/lattice-spec.md`

---

## 🪟 Glass Design System Overhaul (2026-01-02) — AUDIT COMPLETE

> **Status:** Audit complete. Implementation plans ready for agent handoff.
> **Design System Docs:** `docs/patterns/prism-pattern.md`, `.claude/skills/grove-ui-design/SKILL.md`
> **Components:** 8 glass components in `packages/engine/src/lib/ui/components/ui/Glass*.svelte`

### Current Glass Adoption

| Area | Status | Notes |
|------|--------|-------|
| Admin Dashboard | ✅ Excellent | GlassCard stats, glass sidebar |
| Admin Layout | ✅ Excellent | `glass-sidebar`, `glass-surface` |
| Vineyard | ✅ Reference | All 8 components demoed |
| Plant Home | ✅ Good | GlassCard, glass utilities |
| Landing Home | ⚠️ Partial | Some `glass-grove` usage |
| Forest | ⚠️ Needs Glass | Nature scene, no glass overlays |
| Admin Pages (6) | ❌ None | Solid backgrounds throughout |
| Plant Pages (5) | ❌ None | checkout, plans, profile, success, tour |
| Domains (9 pages) | ❌ None | Traditional admin styling |
| Knowledge Base | ❌ None | 10+ pages (dynamic markdown) |

**Overall: 13% full glass, 7% partial, 80% no glass**

---

### 🌲 Landing Site Glass Plan

> **Scope:** Most pages load content from markdown files dynamically. Focus on structural elements and the Forest page.

**Already Glass:**
- Main hero section uses `glass-grove` utility
- Pricing table has backdrop-blur treatment
- Contact page has custom `glass-contact` class

**Needs Review (Structural):**
- [ ] Navbar consistency across all landing routes
- [ ] Footer could benefit from subtle glass treatment
- [ ] Knowledge base article wrapper (if not markdown-controlled)

**Forest Page — HIGH PRIORITY:**
See dedicated section below.

---

### 🌳 Forest Page Glass Implementation

> **Route:** `landing/src/routes/forest/+page.svelte`
> **Current State:** Beautiful nature scene with trees, seasonal effects, NO glassmorphism
> **Goal:** Add glass panels/overlays to enhance readability while preserving the organic feel

**Implementation Tasks:**
- [ ] Add glass overlay for any text content sections
- [ ] Consider glass-tint panels for feature callouts
- [ ] Add glass card for "Visit the Forest" CTA or navigation
- [ ] Ensure glass doesn't obstruct nature elements (trees should peek through)
- [ ] Test with all 4 seasons (spring/summer/autumn/winter)
- [ ] Respect `prefers-reduced-motion` for glass transitions

**Recommended Glass Usage:**
```svelte
<!-- Info panels over forest background -->
<Glass variant="tint" class="p-6 rounded-xl max-w-2xl mx-auto">
  <h2>Welcome to the Forest</h2>
  <p>Discover community blogs...</p>
</Glass>

<!-- Navigation cards -->
<GlassCard variant="frosted" hoverable>
  <a href="/forest/explore">Explore Blogs</a>
</GlassCard>
```

**Key Consideration:** The forest is about immersion. Use glass sparingly—enhance, don't dominate.

---

### 🔍 Safari Reader Mode & Glass Cards

> **Issue:** Safari Reader Mode on iOS strips `backdrop-blur` and translucent backgrounds, making glass card content invisible.
> **Discovered:** 2026-01-06 while reviewing Vision page Core Values cards
> **Severity:** Medium — affects content accessibility for users who prefer reader mode

**Problem:**
- Glass cards use `bg-white/60 backdrop-blur-md` styling
- Reader mode extracts semantic content and strips most CSS
- Content inside glass cards becomes unreadable (no background, no contrast)

**Potential Solutions to Research:**
- [ ] Add `aria-label` or semantic structure that reader mode preserves
- [ ] Use `<article>` or `<section>` elements that reader mode respects
- [ ] Add fallback solid background via `@supports not (backdrop-filter: blur(1px))`
- [ ] Test if `print` media query styles apply in reader mode
- [ ] Consider `data-reader-*` attributes if Safari supports them

**Pages Affected (glass cards with important content):**
- `/vision` — Core Values cards (5 cards)
- `/pricing` — Plan comparison cards
- `/roadmap` — Feature lists
- Any future glass-heavy content pages

**Testing:**
- Safari iOS: Settings → Safari → Show Reader Automatically
- Safari macOS: View → Show Reader

---

### 🌱 Plant (Signup Flow) Glass Implementation

> **Routes:** `plant/src/routes/`
> **Current State:** Home page has glass, other pages use solid forms
> **Goal:** Consistent glassmorphism throughout the entire signup journey

**Pages Requiring Glass Treatment:**

#### 1. Profile Page (`/profile`)
- [ ] Form container → `GlassCard variant="frosted"`
- [ ] Input fields → glass background (`bg-white/60 backdrop-blur-sm`)
- [ ] Color picker section → glass panel
- [ ] Interests selector → glass chips/tags

#### 2. Plans Page (`/plans`)
- [ ] Plan cards → `GlassCard` with variant per tier
  - Seedling: `variant="default"`
  - Sapling: `variant="default"`
  - Oak: `variant="accent"` (recommended)
  - Evergreen: `variant="frosted"` (premium feel)
- [ ] Comparison table → glass container
- [ ] CTA buttons → `GlassButton`

#### 3. Checkout Page (`/checkout`)
- [ ] Order summary card → `GlassCard`
- [ ] Payment form container → glass treatment
- [ ] Security badges/trust indicators → subtle glass

#### 4. Success Page (`/success`)
- [ ] Celebration card → `GlassCard variant="accent"`
- [ ] Next steps list → glass container
- [ ] Confetti should appear OVER the glass (z-index)

#### 5. Tour Page (`/tour`)
- [ ] Tour step cards → `GlassCard` with progression
- [ ] Navigation dots → glass styling
- [ ] Skip/Next buttons → `GlassButton`

**Shared Patterns for Plant:**
```svelte
<!-- Form wrapper pattern -->
<GlassCard variant="frosted" class="max-w-md mx-auto">
  <form>
    <input class="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm ..." />
  </form>
</GlassCard>

<!-- Glass input styling -->
.glass-input {
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
```

---

### 🔧 Admin Panel Glass Implementation

> **Routes:** `packages/engine/src/routes/admin/`
> **Current State:** Dashboard excellent, other pages use solid backgrounds
> **Goal:** Consistent glass treatment across ALL admin pages

**Pages Requiring Glass Treatment:**

#### 1. Blog List (`/admin/blog`)
- [ ] Table container → glass wrapper
- [ ] Table header → `glass-surface` (sticky with blur)
- [ ] Info box → `GlassCard variant="muted"`
- [ ] Row hover states → subtle glass glow
- [ ] Action buttons → consider `GlassButton variant="ghost"`

#### 2. Blog Editor (`/admin/blog/edit/[slug]` and `/admin/blog/new`)
- [ ] Metadata panel → `GlassCard variant="frosted"`
- [ ] Editor section container → subtle glass background
- [ ] Gutter panel → glass treatment
- [ ] Tag badges → translucent glass styling
- [ ] Error banner → `Glass variant="accent"` with red tint

#### 3. Images/CDN (`/admin/images`)
- [ ] Drop zone → `Glass variant="tint"` with dashed border
- [ ] Options panel (collapsible) → `GlassCard`
- [ ] Upload progress cards → glass with status colors
- [ ] Gallery section → glass container
- [ ] Gallery cards → glass overlay on images (subtle)

#### 4. Pages List (`/admin/pages`)
- [ ] Table container → glass wrapper (same as blog list)
- [ ] Info box → `GlassCard variant="muted"`
- [ ] Badge styling → translucent glass

#### 5. Page Editor (`/admin/pages/edit/[slug]`)
- [ ] Details section → `GlassCard` (collapsible)
- [ ] Hero fields nested box → glass treatment
- [ ] Editor container → subtle glass

#### 6. Settings (`/admin/settings`)
- [ ] Settings sections → `GlassCard` instead of box-shadow cards
- [ ] Health grid items → small glass cards
- [ ] Font option cards → `GlassCard variant="default"` with hover
- [ ] Status indicators → glass backgrounds
- [ ] Action buttons → `GlassButton`

#### 7. Subscribers (`/admin/subscribers`)
- [ ] Card container → `GlassCard`
- [ ] Danger zone → `Glass variant="accent"` with red/pink tint
- [ ] Table → glass wrapper
- [ ] Action buttons → `GlassButton variant="ghost"`

**Admin Glass Patterns:**
```svelte
<!-- Table wrapper pattern -->
<GlassCard variant="default" class="overflow-hidden">
  <table class="w-full">
    <thead class="glass-surface sticky top-0">
      ...
    </thead>
    <tbody>
      ...
    </tbody>
  </table>
</GlassCard>

<!-- Settings section pattern -->
<GlassCard variant="frosted" class="mb-6">
  <h3 class="text-lg font-semibold mb-4">Section Title</h3>
  <!-- content -->
</GlassCard>

<!-- Danger zone pattern -->
<Glass variant="accent" class="bg-red-500/10 border-red-500/30 p-4 rounded-lg">
  <h4 class="text-red-600 dark:text-red-400">Danger Zone</h4>
  ...
</Glass>
```

---

### 📋 Implementation Checklist (For Agent Handoff)

When implementing glass updates, follow this order:

1. **Forest Page** (1 page, high visual impact)
   - Add glass overlays for text sections
   - Test all 4 seasons
   - Verify nature elements visible through glass

2. **Plant Pages** (5 pages, user-facing)
   - profile → plans → checkout → success → tour
   - Consistent form styling throughout
   - Premium feel for payment flow

3. **Admin Panel** (7 pages, daily use)
   - settings → blog list → blog editor → images → pages → page editor → subscribers
   - Start with settings (simpler), work up to complex editors
   - Maintain readability for data-dense views

**Per-Page Checklist:**
- [ ] Import glass components from `@autumnsgrove/groveengine/ui`
- [ ] Replace solid containers with GlassCard
- [ ] Update input styling with glass backgrounds
- [ ] Test light mode AND dark mode
- [ ] Verify contrast meets accessibility standards
- [ ] Check mobile responsiveness
- [ ] Test with `prefers-reduced-motion`

---

## 🔮 Domains App Glass Overhaul — FUTURE SESSION

> **Scope:** Separate session, not part of current glass overhaul
> **App:** `domains/` - Domain finder admin tool
> **Current State:** Traditional clean admin styling, NO glassmorphism
> **Goal:** Adopt warm Grove glassmorphism while maintaining professional readability

### Context for Future Agent

The Domains app is a professional admin tool for domain discovery. It needs **selective** glass treatment—don't overdo it. Data tables and search results need solid backgrounds for readability.

**9 Pages to Update:**
1. `+page.svelte` - Landing/hero
2. `+layout.svelte` - Root layout
3. `admin/+layout.svelte` - Admin nav with tabs
4. `admin/+page.svelte` - Dashboard with stats cards, job list
5. `admin/searcher/+page.svelte` - Main search form (vibe & detailed modes)
6. `admin/config/+page.svelte` - Configuration settings
7. `admin/history/+page.svelte` - Search history table
8. `admin/history/[id]/+page.svelte` - Individual search details
9. `admin/login/+page.svelte` - Authentication

**Recommended Glass Placement:**
- ✅ Dashboard stats cards → GlassCard
- ✅ Search form containers → GlassCard variant="frosted"
- ✅ Config panels → GlassCard
- ✅ Navigation header → glass-surface
- ❌ Data tables → Keep solid (readability critical)
- ❌ Search results → Keep solid
- ⚠️ Status indicators → Subtle glass only

**Implementation Notes:**
```css
/* Domains glass should be slightly more opaque for professionalism */
.domains-glass {
  background: rgba(255, 255, 255, 0.75); /* vs 0.6 for plant */
  backdrop-filter: blur(10px); /* vs 12px standard */
  border: 1px solid rgba(44, 140, 126, 0.2); /* domain-teal tint */
}
```

**Color Palette:**
- Primary: `domain-600` (#2c8c7e teal)
- Background: Gradient `from-purple-50 via-cream to-green-50`
- Keep existing color scheme, add glass effects

---

## 📚 Design Documentation Gaps — FUTURE SESSION

> **Scope:** Separate session focused on documentation, not UI changes
> **Current Docs:** `docs/patterns/prism-pattern.md` (excellent), `.claude/skills/grove-ui-design/SKILL.md`

### Missing Documentation

| Document | Purpose | Priority |
|----------|---------|----------|
| `COMPONENT-REFERENCE.md` | Visual guide for all 25 UI components with examples | High |
| `DARK-MODE-GUIDE.md` | Contrast ratios, WCAG compliance, color pairs | High |
| `SPACING-SYSTEM.md` | When to use gap-6 vs p-6, baseline rhythm | Medium |
| `ANIMATION-GUIDE.md` | When/why to use each of 13 animations | Medium |
| `FORM-SYSTEM.md` | Input validation states, error styling, accessibility | Medium |
| `ICONOGRAPHY.md` | Icon selection process, sizing hierarchy | Low |
| `BREAKPOINT-STRATEGY.md` | Mobile-first approach documentation | Low |

### What Exists (Strengths)

- **Prism Pattern** (862 lines) — Comprehensive glassmorphism architecture
- **Grove UI Skill** — Practitioner guide with code examples
- **Tailwind Preset** — All design tokens defined, custom animations
- **Content CSS** — Grid system, typography, code blocks

### Implementation Notes for Future Agent

1. Create docs in `docs/design-system/` directory
2. Use existing Prism pattern as the "source of truth"
3. Include visual examples (screenshots or ASCII diagrams)
4. Cross-reference with actual component implementations
5. Follow Grove's warm, documentation-as-conversation style

**Example Structure for COMPONENT-REFERENCE.md:**
```markdown
# Grove Component Reference

## Glass Components

### GlassCard
**When to use:** Content containers over busy backgrounds
**Variants:** default, accent, dark, muted, frosted

| Variant | Light Mode | Dark Mode | Use Case |
|---------|------------|-----------|----------|
| default | 60% white | 25% emerald | General cards |
| frosted | 70% white | 35% emerald | Premium feel |
...
```

---

## ✅ OG Images & Platform Icons COMPLETE! (2026-01-02)

### What We Built
- ✅ **Static icons deployed!** iMessage/iOS shows Grove logo
  - `apple-touch-icon.png` (180×180) — iMessage/iOS
  - `favicon-32x32.png` — browser tabs
  - `icon-192.png`, `icon-512.png` — PWA/Android
  - `site.webmanifest` — PWA manifest
  - `safari-pinned-tab.svg` — Safari pinned tabs
- ✅ Updated `app.html` with comprehensive icon meta tags
- ✅ **Dynamic OG images working via dedicated Worker!**

### The Solution: Separate Cloudflare Worker

WASM libraries don't bundle with SvelteKit + Cloudflare Pages (Vite can't resolve WASM imports).
**Solution:** Deploy OG generation as a standalone Worker at `og.grove.place`.

**Architecture:**
```
grove.place/api/og?title=X
       ↓ 302 redirect
og.grove.place/?title=X
       ↓ workers-og
PNG image (1200×630)
```

### Files
- `packages/og-worker/` — Standalone OG image generation Worker
  - Uses `workers-og` for image generation
  - Lexend font from cdn.grove.place
  - Deployed to `og.grove.place`
- `landing/src/routes/api/og/+server.ts` — Proxies to og.grove.place
- `landing/src/routes/api/og/forest/+server.ts` — Forest-themed proxy
- `packages/grove-router/src/index.ts` — Routes `og.grove.place` to Worker

### API
```
GET https://og.grove.place/?title=X&subtitle=Y&accent=HEX
```
| Param | Default | Description |
|-------|---------|-------------|
| title | "Grove" | Main title (max 100 chars) |
| subtitle | "A place to Be." | Subtitle (max 200 chars) |
| accent | "16a34a" | Hex color (no #) |

### Future Improvements
- [ ] Add more design variants (forest, autumn, seasonal themes)
- [ ] Add background patterns or illustrations
- [ ] Per-page customization via SEO component

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

### Color Palette Showcase Page — FUTURE
> **Priority:** Low — Nice-to-have for design consistency documentation

Create a dedicated `/vineyard/palettes` page showcasing ALL project color palettes:

**Palettes to Display:**
- `grove` — Core green (50-950)
- `domain` — Admin purple/violet (50-900)
- `forage` — Teal for Forage branding (50-950)
- `neutral` — Warm stone tones for glass dark mode (50-950)
- `cream` / `bark` — Base light/dark colors
- Tailwind defaults we rely on: `amber`, `red`, etc.

**Page Features:**
- [ ] Color swatches with hex codes (click to copy)
- [ ] Light/dark mode toggle to see palette contrast
- [ ] Usage notes (where each palette is used)
- [ ] Accessibility contrast checker (WCAG AA/AAA)
- [ ] Example components using each palette

**Location:** `packages/engine/src/routes/vineyard/palettes/+page.svelte`

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

## ❌ SST Removed (2026-01-05)

> **Decision:** SST was removed from the project. The added complexity wasn't worth it for managing 8 static Stripe price IDs.
>
> **What changed:**
> - Removed `sst.config.ts` and SST dependency
> - Stripe products/prices now managed directly in Stripe Dashboard
> - Price IDs configured in `plant/src/lib/server/stripe.ts`
> - See `docs/STRIPE-SETUP.md` for configuration instructions
>
> **Archived:** `_archived/sst-migration-plan-archived-2026-01-05.md`

### Hybrid Routing Strategy (Still Valid)

| User Type | Domain | Routing | Cost |
|-----------|--------|---------|------|
| Seedling/Sapling | `*.grove.place` | Worker wildcards | Free |
| Oak (BYOD) | `custom.com` | Cloudflare for SaaS | $0.10/hostname |
| Evergreen | `custom.com` | Cloudflare for SaaS | $0.10/hostname |

**Pricing:** 100 custom domains free, then $0.10 each, max 5,000 before Enterprise.

---

## 🔒 Security Audit - Grove 1.0 Pre-Release (2026-01-08)

> **Audit Report:** `archives/audit-reports/grove-1.0-pre-release-audit.md`
> **Status:** All 6 critical issues FIXED. Ready for 1.0 launch.

### ✅ Critical Issues COMPLETE (P0 Blockers)

| Issue | Fix Location |
|-------|--------------|
| SSR Sanitization Bypass | `sanitize.ts:33-95` - Added `sanitizeServerSafe()` regex-based fallback |
| Blog Posts Not Sanitized | `markdown.ts:324` - `parseMarkdownContent()` calls `sanitizeMarkdown()` |
| Recursive Markdown XSS | `markdown.ts:190-192` - Recursive content wrapped in `sanitizeMarkdown()` |
| No Tenant Isolation in R2 | `upload/+server.ts:155` - Keys prefixed with `${tenantId}/` |
| No Ownership on Delete | `delete/+server.ts:77-82` - Verifies tenant prefix before deletion |
| PII Logged in Production | `auth/callback/+server.ts:316` - Logs `userInfo.sub` not email |

### ✅ High Priority Issues COMPLETE

- [x] **Rate limiting on auth endpoints** - Threshold pattern implemented
- [x] **Tenant filtering in R2 list** - `list/+server.ts:66-68` forces tenant prefix
- [x] **Gutter content sanitization** - `markdown.ts:401` sanitizes gutter markdown

### Medium Priority (Post-Launch OK)

- [ ] **CDN magic byte validation** - Add file signature validation
  - Location: `landing/src/routes/api/admin/cdn/upload/+server.ts`
- [ ] **CSRF token rotation** - Implement per-session or periodic rotation
- [ ] **Content-Disposition headers** - Add to R2 uploads for forced download
- [ ] **Image bomb protection** - Add dimension validation after image load
- [ ] **JS/CSS CDN uploads** - Force download or remove from allowed types

### Low Priority (Polish)

- [ ] **Logout CSRF** - Consider requiring POST instead of GET
- [ ] **Failed attempts cleanup** - Add cleanup for old `failed_attempts` records
- [ ] **CSP headers** - Add Content-Security-Policy headers in hooks
- [ ] **Alt text sanitization** - Sanitize before DB storage in CDN patch endpoint

---

## Rate Limiting Enhancement (Threshold Pattern)

> **Spec:** See `docs/patterns/threshold-pattern.md` for full technical specification.
> **Priority:** HIGH - Immediate security benefits and abuse prevention.
> **Implementation:** `packages/engine/src/lib/server/rate-limits/`

### ✅ Core Rate Limiting COMPLETE (2026-01-08)

**What was built:**
- ✅ KV-based rate limiting with tier config (seedling/sapling/oak/evergreen)
- ✅ Endpoint-specific rate limits (auth, posts, uploads, AI)
- ✅ `checkRateLimit()` middleware helper for SvelteKit routes
- ✅ `checkTenantRateLimit()` for tier-based tenant limiting
- ✅ Abuse tracking with graduated response (warning → 24h ban after 5 violations)
- ✅ Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)
- ✅ Wisp route updated to use new middleware
- ✅ Full test coverage (57 tests)
- ✅ Server export path: `import { checkRateLimit } from '@autumnsgrove/groveengine/server'`
- ✅ `getClientIP()` helper for IP extraction from CF headers

**Files:**
- `packages/engine/src/lib/server/rate-limits/config.ts` - Tier and endpoint config
- `packages/engine/src/lib/server/rate-limits/middleware.ts` - SvelteKit helpers
- `packages/engine/src/lib/server/rate-limits/tenant.ts` - Tenant rate limiting
- `packages/engine/src/lib/server/rate-limits/abuse.ts` - Graduated response system
- `packages/engine/src/lib/server/rate-limits/test-utils.ts` - Shared test mocks
- `packages/engine/src/lib/server/index.ts` - Server exports

### Remaining: Cloudflare Edge Layer
- [ ] Configure Cloudflare WAF rate limiting rules (Layer 1 - IP-based)
  - General request limit: 1000 req/min per IP
  - Auth endpoint limit: 50 req/5min per IP
  - Upload endpoint limit: 100 req/hour per IP
  - AI endpoint limit: 500 req/day per IP
- [ ] Test with synthetic traffic

### Remaining: Route Integration
- [ ] Add rate limiting to auth endpoints (`/api/auth/*`)
- [ ] Add rate limiting to CDN upload endpoints (`/api/cdn/*`)
- [ ] Add rate limiting to post creation endpoints
- [ ] Add rate limiting to comment creation endpoints
- [ ] Integrate `checkTenantRateLimit()` in router middleware (when TenantDO is ready)

### Remaining: Heartwood Integration
- [ ] Add rate limit check in Heartwood login flow
- [ ] Add abuse state check for banned users
- [ ] Return appropriate 403 response for banned users

### Remaining: Durable Objects Integration (when DO is ready)
- [ ] Move tenant rate limits to TenantDO (atomic operations)
- [ ] Move user rate limits to SessionDO (cross-request consistency)
- [ ] Real-time rate limit dashboard via WebSocket

### Remaining: Monitoring & Documentation
- [ ] Add rate limit event logging to Vista
- [ ] Create Vista dashboard component for rate limit metrics
- [ ] Configure alert thresholds (ban events, high violation rates)
- [ ] Document runbooks for common scenarios
- [ ] Add rate limiting section to engine README

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

- [ ] Complete multi-tenant infrastructure testing
- [ ] Implement basic analytics
- [ ] Finalize tenant onboarding flow

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
  - ✅ Payment via Stripe
  - ✅ Interactive tour (8 steps, skippable)
  - ✅ Email templates ready (welcome, day 1/3/7/30)
  - ⏳ **Config needed:** Set auth/Stripe secrets in Cloudflare Dashboard

### Stripe Integration (plant.grove.place)
> **Status:** Code complete, needs configuration
> **Location:** `plant/src/lib/server/stripe.ts`
> **Setup Guide:** `docs/STRIPE-SETUP.md`
>
> **Remaining Config:**
> - [ ] Create 4 products in Stripe Dashboard (Seedling, Sapling, Oak, Evergreen)
> - [ ] Create 8 prices (monthly + yearly for each plan)
> - [ ] Copy price IDs to `plant/src/lib/server/stripe.ts`
> - [ ] Set STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY in Cloudflare Dashboard
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
- [ ] **Refresh Vista repo with updated spec** — Marketing analytics section added (2026-01-02)
  - Copy updated `docs/specs/vista-spec.md` to GroveMonitor repo
  - New section: "Marketing & Acquisition Analytics" for QR code/funnel tracking
  - New tables: `acquisition_events`, `acquisition_daily`
  - New dashboard page: `/acquisition`
  - New Phase 7: Marketing Analytics implementation tasks
- [ ] **Update business card QR URLs with tracking params**
  - Front QR: `grove.place?ref=card-front`
  - Back QR: `grove.place/hello?ref=card-back`
  - See `docs/marketing/business-card-spec.md`

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
- [ ] **Write AI Development Process Guide** — Document the full workflow for building Grove with Claude Code, Kilo Code, and AI-assisted development
  - How to structure prompts and context
  - Working with Claude Code CLI vs web vs mobile
  - The mental model behind rapid prototyping with AI
  - Tips for maintaining code quality at speed
  - Placeholder added to Knowledge Base at `/knowledge/developer/ai-development-process`

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
