---
title: "Grove Ecosystem Safari — Reconnecting with the Forest"
status: planned
category: safari
---

# Grove Ecosystem Safari — Reconnecting with the Forest

> _A journey not to build, but to remember. To stand in the clearing and see what's grown._
> **Aesthetic principle**: Nature-themed glassmorphism with seasonal depth — Studio Ghibli warmth meets indie bookshop
> **Scope**: Every package, every property, every living thing in the monorepo
> **Date**: February 16, 2026

---

## Ecosystem Overview

**18 packages** in the monorepo, **2711+ commits** on main, **63 hand-drawn SVG nature components**, **47 named tools** across 8 Workshop categories. One warm forest.

### Packages by type

**SvelteKit Properties (9):**
landing, plant, meadow, clearing, terrarium, engine, login, example-site (empty), ui (empty)

**Cloudflare Workers (6):**
heartwood, domains, og-worker, post-migrator, grove-router, durable-objects

**Worker Collections (1):**
workers (4 cron-triggered background jobs)

**Component Libraries (1):**
vineyard (showcase pattern components)

**Stubs (2):**
zig-core (placeholder), example-site (source removed)

### The soul of it

Grove is a cozy, queer, nature-themed publishing platform built on Cloudflare's edge. Every piece names itself after forests and growing things. Users are Wanderers. Blogs are Gardens. Posts are Blooms. The admin is an Arbor. The community feed is a Meadow. Nothing here is accidental — the metaphor runs bone-deep, from database table names to CSS class names to error messages.

### The Workshop — 47 tools across 8 categories

| Category                | Count | Tools                                                                      |
| ----------------------- | ----- | -------------------------------------------------------------------------- |
| **Core Infrastructure** | 6     | Lattice, Heartwood, Passage, Your Grove, Garden, Blooms                    |
| **Core Services**       | 8     | Clearing, Arbor, Flow, Plant, Grafts, Amber, Centennial, Burrow            |
| **Creative Studio**     | 4     | Foliage, Curios, Terrarium, Weave                                          |
| **Support & Insights**  | 4     | Waystone, Porch, Trace, Rings                                              |
| **Content & Community** | 10    | Trails, Meadow, Thorn, Petal, Wisp, Scribe, Reeds, Canopy, Forests, Wander |
| **Standalone Tools**    | 7     | Forage, Outpost, Ivy, Verge, Gossamer, Nook, Etch                          |
| **Operations**          | 8     | Shade, Patina, Press, Lumen, Zephyr, Mycelium, Warden, Vista               |
| **Patterns**            | 7     | Prism, Loom, Threshold, Firefly, Songbird, Sentinel, Vineyard              |

Every tool has a nature metaphor that actually works as documentation — Heartwood (core of a tree = auth core), Shade (protection from sun = AI scraper defense), Patina (protective aging = automated backups), Lumen (light + hollow tube = AI gateway), Firefly (brief light = ephemeral servers), Songbird with Canary/Kestrel/Robin (three birds = three injection defense layers).

---

## Route Map

| #   | Stop               | Category          | Terrain                |
| --- | ------------------ | ----------------- | ---------------------- |
| 1   | Monorepo Overview  | Infrastructure    | 18 packages            |
| 2   | Landing Homepage   | Marketing         | SvelteKit + Glass      |
| 3   | Manifesto          | Philosophy        | Prose page             |
| 4   | Vision             | Philosophy        | Prose page             |
| 5   | Beyond             | Philosophy        | Prose page             |
| 6   | Nature SVGs        | Design System     | 63 components          |
| 7   | Workshop           | Landing / Roadmap | 47 tools cataloged     |
| 8   | Arbor Dashboard    | Admin UI          | SvelteKit page         |
| 9   | Arbor Garden       | Admin UI          | Post management        |
| 10  | Arbor Editor       | Admin UI          | 820-line editor        |
| 11  | Arbor Rings        | Admin UI          | Analytics (planned)    |
| 12  | Arbor Images       | Admin UI          | 2047-line pipeline     |
| 13  | Arbor Curios       | Admin UI          | 22 widget hub          |
| 14  | Arbor Settings     | Admin UI          | 1741-line prefs        |
| 15  | Meadow Landing     | Community         | Marketing page         |
| 16  | Meadow Feed        | Community         | Main feed view         |
| 17  | Meadow Components  | Community         | 6 UI components        |
| 18  | Meadow Server      | Community         | Feed engine + APIs     |
| 19  | Meadow Post Detail | Community         | Single post view       |
| 20  | Plant              | Onboarding        | 7 pages, 14 APIs       |
| 21  | Clearing           | Status Page       | 8 routes, 7 components |
| 22  | Terrarium          | Creative Canvas   | Drag-and-drop scenes   |
| 23  | Heartwood          | Auth Backbone     | ~15,000 lines          |
| 24  | Login              | Auth UI           | Thin proxy + UI        |
| 25  | Grove Router       | Subdomain Routing | 313 lines              |
| 26  | OG Worker          | Image Generation  | 803 lines              |
| 27  | Post Migrator      | Storage Tiers     | DISABLED               |
| 28  | Durable Objects    | Coordination      | 7 DOs on Loom SDK      |
| 29  | Workers            | Background Jobs   | 4 cron workers         |
| 30  | Domains (Forage)   | Domain Search     | AI-powered             |
| 31  | Vineyard           | Showcase Pattern  | Component library      |

---

## 1. Monorepo Overview

**Character**: The root system. Everything grows from here — a single `pnpm` workspace holding 18 packages, each with its own `wrangler.toml` and deployment pipeline.

### Safari findings

**Infrastructure:**

- [x] Monorepo with `pnpm` workspaces, `bun` for local execution
- [x] Engine-first pattern — shared components in `libs/engine/`, consumed via `@autumnsgrove/lattice/*`
- [x] Export chain: `package.json` exports → barrel files → individual components
- [x] Cloudflare-first: Workers, D1, KV, R2, Durable Objects
- [x] Custom tooling: `gf` (Go, ~40ms) for codebase search, `gw` for infrastructure CLI
- [x] Pre-commit hooks catch bare `fetch()`, pre-push hooks type-check 6 packages
- [x] Conventional Commits enforced

**Custom frameworks built in-house:**

- [x] **Threshold SDK** — Rate limiting with DO-first storage, KV fallback
- [x] **Loom SDK** — Durable Object framework (just migrated all DOs to it)
- [x] **Grafts** — Feature flags loaded once in layout, cascaded to all pages
- [x] **Grove Mode / GroveSwap** — Terminology toggle between standard and grove-speak

**Nature components:**

- [x] 63 SVG components across 8 categories: trees (16), creatures (11), botanicals (12), sky (5), water (4), structures (8), weather (4), ground (3)
- [x] Each is hand-tuned, seasonally aware, and respects `prefers-reduced-motion`
- [x] Randomized forests with configurable density and species mix

---

## 2. Landing Homepage

**Character**: The first clearing in the forest. Warm glass surfaces over nature backgrounds, hero carousel with 5 seasonal slides, the pitch that says "your corner of the internet, away from the noise."

### Safari findings

- [x] 5 dedicated Hero components (full Svelte components, not image slides)
- [x] Each slide has its own personality, animation, and seasonal flavor
- [x] Auto-advances with pause on hover/focus, keyboard accessible
- [x] Feature cards in GlassCard components with grove-themed copy
- [x] Pricing tiers: Seedling (free), Sapling, Oak, Evergreen
- [x] `glass-grove` for lightweight glass, `GlassCard` for structured cards
- [x] Spacing rhythm: `mb-16` major, `mb-12` content, `mb-8` after headings
- [x] Serif for headings, sans for body, `text-foreground` hierarchy

---

## 3. Manifesto

**Character**: The soul of Grove, distilled into prose. Not a product page — a declaration. "We believe the internet should feel like a place you want to be."

### Safari findings

- [x] Long-form prose with serif typography
- [x] Sections on ownership, community, authenticity, privacy
- [x] References the indie web movement, small web philosophy
- [x] Warm, introspective voice — never performative
- [x] This is the page that answers "why does Grove exist?"

---

## 4. Vision

**Character**: Where the manifesto says _why_, the vision says _where_. The roadmap in prose form — seasons as development phases.

### Safari findings

- [x] Seasonal development metaphor: Spring (foundation), Summer (growth), Autumn (harvest), Winter (rest)
- [x] Current phase clearly marked
- [x] Each phase has concrete deliverables alongside the poetic framing
- [x] Honest about what's built vs. what's planned

---

## 5. Beyond

**Character**: The philosophical depths. Goes beyond product into what the internet could be — community ownership, federated futures, digital gardens as legacy.

### Safari findings

- [x] Explores longer-term vision: federation, community governance, data portability
- [x] References Autumn's personal experience as motivation
- [x] The most vulnerable, personal page on the site
- [x] Stands alone as an essay worth reading even outside the product context

---

## 6. Nature SVG Components

**Character**: The visual soul of Grove. 63 hand-drawn SVG components that make every page feel alive.

### Safari findings

- [x] **Trees (16)**: Pine, Oak, Birch, Willow, Maple, Cherry, Aspen, Cedar, Redwood, Palm, Banyan, Baobab, Elm, Poplar, Cypress, Juniper
- [x] **Creatures (11)**: Fox, Owl, Deer, Rabbit, Squirrel, Bear, Hedgehog, Butterfly, Firefly, Dragonfly, Hummingbird
- [x] **Botanicals (12)**: Fern, Mushroom, Wildflower, Moss, Vine, Lily, Sunflower, Lavender, Daisy, Tulip, Rose, Clover
- [x] **Sky (5)**: Sun, Moon, Stars, Clouds, Aurora
- [x] **Water (4)**: Stream, Pond, Waterfall, Rain
- [x] **Structures (8)**: Cabin, Bridge, Lantern, Gate, Fence, Birdhouse, Bench, Well
- [x] **Weather (4)**: Wind, Snow, Lightning, Fog
- [x] **Ground (3)**: Path, Stones, Grass
- [x] All respect `prefers-reduced-motion`
- [x] Seasonal variants where appropriate
- [x] Used throughout: landing heroes, 404 pages, loading states, empty states, decorative borders

---

## 7. Workshop

**Character**: The master map. Every tool Grove has built, is building, and dreams of building — 47 named things across 8 categories, each with a nature metaphor, status badge, and links to specs and help articles.

### Safari findings

(`apps/landing/src/routes/workshop/+page.svelte` — ~1100 lines)

- [x] 8 categories: Core Infrastructure, Core Services, Creative Studio, Support & Insights, Content & Community, Standalone Tools, Operations, Patterns
- [x] Each tool has: name, tagline, description, status, icon, domain, integration notes, GitHub/spec/help links, sub-components
- [x] Status badges: Live (green), Greenhouse (emerald), Complete (green), Applied (blue), Building (amber), Planned (slate)
- [x] Floating TOC with category navigation, mobile-responsive
- [x] Lantern decorations in the hero section
- [x] Patterns category gets distinct amber styling (not white glass)
- [x] `GroveTerm` and `GroveSwapText` used for terminology toggle support
- [x] Tool anchors for deep linking (`#tool-heartwood`, etc.)

**Status breakdown of all 47 tools:**

| Status           | Count | Examples                                                                                    |
| ---------------- | ----- | ------------------------------------------------------------------------------------------- |
| Live             | 17    | Lattice, Heartwood, Passage, Arbor, Flow, Clearing, Shade, Patina, Threshold                |
| Greenhouse       | 6     | Curios, Terrarium, Thorn, Petal, Wisp, Scribe                                               |
| Building         | 7     | Amber, Ivy, Verge, Gossamer, Mycelium, Sentinel, Vineyard                                   |
| Complete/Applied | 4     | Foliage, Loom, Firefly, Songbird                                                            |
| Planned          | 13    | Rings, Reeds, Canopy, Forests, Wander, Weave, Nook, Etch, Burrow, Warden, Vista, Centennial |

---

## 8. Arbor Dashboard

**Character**: The wanderer's home base. Not a corporate dashboard — a warm welcome back. Stats presented as gentle observations, not metrics to optimize.

### Safari findings

(`libs/engine/src/routes/arbor/+page.svelte`)

- [x] Stats in GlassCard tiles: Blooms count, Words Written, Top Tags, Account Age
- [x] Quick actions grid for common tasks
- [x] Roadmap preview showing current phase at "Thaw" (33%)
- [x] Beta welcome dialog for new users
- [x] "Rooted" and "Greenhouse" status badges
- [x] Clean, uncluttered — respects the writer's attention

---

## 9. Arbor Garden

**Character**: The potting shed. Where you see all your blooms at a glance.

### Safari findings

(`libs/engine/src/routes/arbor/garden/+page.svelte`)

- [x] Post list with GlassCard table styling
- [x] Draft/published status indicators
- [x] Tags displayed with Badge engine components
- [x] Edit, view, and delete actions per post
- [x] GlassConfirmDialog for safe deletion
- [x] Empty state with encouraging copy

---

## 10. Arbor Editor (New Bloom)

**Character**: The writing sanctuary. 820 lines of carefully crafted writing experience — where a blog post goes from seed to bloom.

### Safari findings

(`libs/engine/src/routes/arbor/garden/new/+page.svelte` — 820 lines)

**Writing surface:**

- [x] Inline title at 2rem Lexend — no separate title field, just type
- [x] MarkdownEditor with Fireside AI writing assistant toggle
- [x] GutterManager ("Vines") sidebar for structure navigation

**Metadata strip:**

- [x] Collapsible details section — doesn't clutter until you need it
- [x] SEO character counter (120-160 optimal range)
- [x] Cover image with live preview
- [x] Tag input, auto-generated slug from title

**Typography:**

- [x] 18 fonts across 5 categories
- [x] Includes OpenDyslexic and Atkinson Hyperlegible (accessibility-first)
- [x] Live preview of font selection

**Safety:**

- [x] `beforeNavigate` + `beforeunload` guards
- [x] Draft auto-save to server + LocalStorage persistence as backup
- [x] Never lose your words

---

## 11. Arbor Rings (Analytics)

**Character**: A promise, not a product. Analytics reimagined — delayed by design, private by default, focused on resonance not vanity.

### Safari findings

(`libs/engine/src/routes/arbor/analytics/+page.svelte` — 109 lines)

- [x] Coming in "Full Bloom (Early Summer)" phase
- [x] Philosophy: "Private by Default. Delayed by Design."
- [x] 24-hour delayed stats — no refresh-to-check anxiety
- [x] **Resonance Indicators**: Sparked Interest, Really Resonated, Community Favorite
- [x] **Writer Wellness**: Digest Mode, Focus Periods
- [x] **Meaningful Metrics**: Engaged/Return/Deep Readers
- [ ] Not yet implemented — placeholder with philosophy and roadmap

---

## 12. Arbor Images

**Character**: The most technically ambitious page in Arbor. A full image management pipeline — 2047 lines of careful engineering.

### Safari findings

(`libs/engine/src/routes/arbor/images/+page.svelte` — 2047 lines)

- [x] Drag-and-drop upload with per-file progress tracking
- [x] AI Analysis toggle for smart naming, descriptions, and alt text generation
- [x] JXL/WebP processing with feature flags and kill switch
- [x] HEIC/HEIF conversion support
- [x] SHA-256 duplicate detection — never upload the same image twice
- [x] EXIF GPS stripping — privacy by default
- [x] Date-organized storage paths
- [x] Gallery with 6 sort options, multi-select bulk deletion
- [x] Copy format preference (URL/Markdown/HTML) persisted to localStorage
- [x] Graft-gated uploads with free alternative links for seedling tier

---

## 13. Arbor Curios

**Character**: The cabinet of curiosities. 22 whimsical blog widgets.

### Safari findings

(`libs/engine/src/routes/arbor/curios/+page.svelte` — 533 lines)

| Category    | Curios                                                                            |
| ----------- | --------------------------------------------------------------------------------- |
| Classic Web | Hit Counter, Guestbook, Webring Hub, Blogroll                                     |
| Expression  | Status Badges, Activity Status, Mood Ring, Now Playing                            |
| Community   | Polls, Badges, Link Gardens                                                       |
| Creative    | Weird Artifacts, Custom Cursors, Ambient Sounds, Clip Art Library, Custom Uploads |
| Collections | Bookmark Shelf, Personal Shrines, Gallery                                         |
| Greenhouse  | Timeline, Journey, Pulse (upcoming)                                               |

- [x] Grid layout with GlassCard per curio
- [x] Greenhouse curios clearly marked as upcoming
- [x] Mix of nostalgic web1.0 revival and genuinely useful features

---

## 14. Arbor Settings

**Character**: The most personal page. Where a wanderer makes their grove _theirs_. 1741 lines of customization.

### Safari findings

(`libs/engine/src/routes/arbor/settings/+page.svelte` — 1741 lines)

- [x] **Profile Photo** — Upload with preview
- [x] **Preferences** — Grove Mode toggle (standard vs grove-speak)
- [x] **Greenhouse Status** — Beta/plan tier display
- [x] **Graft Control Panel** — Feature flag toggles
- [x] **Typography** — 10 fonts with live preview (including accessibility fonts)
- [x] **Accent Color** — Color picker + curated presets
- [x] **Header Branding** — Custom title, seasonal logo toggle
- [x] **Canopy** — Public directory: visibility, banner, categories, Forests
- [x] **Active Sessions** — Device icons, relative time, breathing green glow on current device, revoke controls

---

## 15. Meadow Landing

**Character**: The clearing where the forest opens up. "Social media that doesn't make you feel like shit."

### Safari findings

(`apps/meadow/src/routes/+page.svelte` — 211 lines)

- [x] Seasonal logo, tagline "Where the forest opens up"
- [x] 4 philosophy cards: opt-in, chronological, private voting, authentic reactions
- [x] Waitlist email signup
- [x] Links to Grove and Plant

---

## 16. Meadow Feed

**Character**: The heart of the community. A chronological feed where blooms and notes mingle.

### Safari findings

(`apps/meadow/src/routes/feed/+page.svelte` — 273 lines)

- [x] ComposeBox at top (auth-gated) — "Leave a note in the meadow..."
- [x] FeedFilters: All, Notes, Blooms, Popular, Hot, Top, Following
- [x] PostCard list with load-more pagination, ReactionPicker popover
- [x] All interactions optimistic with rollback on failure
- [x] `requireAuth()` redirects to login with return URL

**Two post types:**

- **Blooms** — RSS-ingested blog posts with title, description, featured image, external link
- **Notes** — Native short-form (1000 char max), rich text via NoteEditor, optional tags

---

## 17. Meadow Components

**Character**: Six small, focused UI components that make the feed feel alive.

### Safari findings

- [x] **ComposeBox** (256 lines) — Collapsed glass prompt → expanded NoteEditor with char counter (green→amber@900→red@1000), tags, image uploads
- [x] **PostCard** (209 lines) — Author header, note/bloom content, tags (max 4), upvote + bookmark action bar, 44x44px touch targets
- [x] **FeedFilters** (51 lines) — 7 tabs, Following auth-gated, frosted glass, `aria-current`
- [x] **ReactionPicker** (64 lines) — 5x2 emoji grid, keyboard navigable, click-outside dismissal
- [x] **ReportModal** (117 lines) — 4 reasons, 500-char detail, proper `<fieldset>`/`<legend>`
- [x] **SEO** — Per-page meta tags

---

## 18. Meadow Server

**Character**: The engine room. Five feed algorithms, rate-limited APIs, community self-moderation.

### Feed Engine (`feed.ts` — 187 lines)

| Algorithm | SQL                               | Philosophy                       |
| --------- | --------------------------------- | -------------------------------- |
| All       | `ORDER BY published_at DESC`      | Chronological truth              |
| Popular   | `ORDER BY score DESC`             | Community consensus              |
| Hot       | `score / (hours+2)^1.5`           | Recent + popular, HN-style decay |
| Top       | Score within day/week/month       | Best of a period                 |
| Following | Chronological from followed blogs | Your people, your pace           |

- [x] Hot uses `x*x*sqrt(x)` for `pow(x, 1.5)` in SQLite (no native power function)
- [x] Count + data queries run in parallel via `Promise.all`

### Notes Service (`notes.ts` — 93 lines)

- [x] `createNote()`: UUID, `note:{id}` GUID, returns client-shape MeadowPost
- [x] `deleteNote()`: Author-only via `WHERE user_id = ? AND post_type = 'note'`

### API Endpoints

| Endpoint                  | Method      | Rate Limit | Purpose               |
| ------------------------- | ----------- | ---------- | --------------------- |
| `/api/notes`              | POST        | 30/hour    | Create a note         |
| `/api/notes/[id]`         | DELETE      | 60/hour    | Delete own note       |
| `/api/feed/[id]/vote`     | POST/DELETE | —          | Toggle upvote         |
| `/api/feed/[id]/bookmark` | POST        | —          | Toggle bookmark       |
| `/api/feed/[id]/reaction` | POST/DELETE | —          | Toggle emoji reaction |
| `/api/feed/[id]/report`   | POST        | 10/hour    | Report a post         |

- [x] All require auth, rate limiting via Threshold SDK
- [x] Report endpoint: atomic D1 batch for auto-hide at 3 reports

### Reactions (`constants/reactions.ts`)

10 warm emojis: ❤️ Love, 💛 Warm, 💚 Growth, 💙 Calm, 💜 Creative, 😂 Joy, 😮 Wow, 😢 Moved, ✨ Magic, 🌱 Growing. No angry, no negative. Encouragement without performance. O(1) validation via Set.

---

## 19. Meadow Post Detail

**Character**: The full view. Where you stop scrolling and actually _read_.

### Safari findings

(`apps/meadow/src/routes/feed/[id]/+page.svelte` — 310 lines)

- [x] Full article in `glass-grove` card with author header, content, tags, reaction counts
- [x] Note view: rich HTML or plain text with `whitespace-pre-wrap`
- [x] Bloom view: title at 2xl serif, full `content_html`
- [x] Action bar: vote, react (popover picker), bookmark
- [x] Delete button for own notes, "Read on {subdomain}.grove.place" for blooms
- [x] Bookmarks page (141 lines): same PostCard pattern, load-more, empty state

---

## 20. Plant — Where New Growth Begins

**Character**: The first gentle handshake with Grove. A complete onboarding pipeline that never feels like a signup form.

### Safari findings

(`apps/plant/` — 7 page routes, 14 API endpoints, ~2,469 lines server code)

**Onboarding flow (linear):**

1. **Home** (385 lines) — Landing pitch, plans preview, login redirect to Heartwood
2. **Profile** (291 lines) — Display name, username (realtime validation, 300ms debounce, suggestions), favorite color (16 presets), interests (9 options)
3. **Verify Email** (292 lines) — 6-digit code (SHA-256 hashed, 15-min expiry, 3 resends max)
4. **Plans** (314 lines) — All tiers with billing toggle (monthly/annual, 15% savings)
5. **Checkout** (170 lines) — Order summary, auto-creates Stripe session, redirects to Stripe
6. **Success** (215 lines) — Polls for tenant creation (1s interval, 30s max), "What's next?" checklist
7. **Tour** (340 lines) — Optional 8-step walkthrough with swipe/keyboard navigation

**Key patterns:**

- [x] No "Sign up" — "Begin your journey". No "Create account" — "Tell us about yourself"
- [x] Auth fully delegated to Heartwood — Plant never sees passwords or tokens
- [x] Free tier creates tenants inline (no webhook delay), IP rate-limited 3/30 days
- [x] Stripe webhook (517 lines) handles `checkout.session.completed`, creates tenant
- [x] Tenant provisioning creates: `tenants`, `platform_billing`, `site_settings`, default Home + About pages
- [x] `submitFormAndGo()` workaround for iOS Safari POST proxy bug (offers file download instead of redirect)
- [x] Webhook security: HMAC-SHA256, constant-time comparison, 5-minute replay window, idempotency via `provider_event_id`
- [x] Email system: Zephyr API wrapper, verification + payment receipt + dunning templates

---

## 21. Clearing — Where You Can See What's Happening

**Character**: Transparent, real-time platform health. A clearing in the forest where you can see everything.

### Safari findings

(`apps/clearing/` — 8 routes, 7 components, ~3,500 lines total)

**What it monitors:**

- [x] 6 platform components: Blog Engine, CDN, Authentication, Meadow, Payments, API
- [x] Incident lifecycle: investigating → identified → monitoring → resolved
- [x] 90-day uptime history with weighted scoring (degraded 75%, partial 25%, major 0%)
- [x] Scheduled maintenance announcements
- [x] Data Protection: backup reliability score from separate `grove-backups-db` D1 (6-hour cache)
- [x] RSS 2.0 feed of incident updates (each status change = 1 item)

**Components:**

- [x] `GlassStatusBanner` (131 lines) — Overall status indicator
- [x] `GlassStatusCard` (94 lines) — Individual component tile
- [x] `GlassUptimeBar` (116 lines) — 90 tiny vertical bars, hover tooltips, color-coded
- [x] `GlassBackupStatus` (233 lines) — Reliability score, recent backups, storage metrics
- [x] `IncidentCard` (185 lines) — Expandable timeline with status icons and duration
- [x] `ScheduledMaintenanceCard` (108 lines) — Maintenance announcements
- [x] Mock data fallback for dev when D1 unavailable

**API:**

- [x] `GET /api/status` — Public status (60s cache, CORS enabled)
- [x] `POST /api/sentinel` — Protected stress test endpoint (auto-updates component status based on error rates)
- [x] `GET /feed` — RSS 2.0 (5-min cache)

**Database:** 6 tables (`status_components`, `status_incidents`, `status_updates`, `status_incident_components`, `status_scheduled`, `status_daily_history`) + 12 indexes. Batch query optimization to prevent N+1, UUID validation before dynamic SQL.

---

## 22. Terrarium — A Sealed World Under Glass

**Character**: A drag-and-drop creative canvas where you compose nature scenes that become blog decorations. The most whimsical thing in Grove.

### Safari findings

(`apps/terrarium/` — 133 lines routing; engine canvas system — ~2,961 lines)

**What's built and working:**

- [x] 62 nature components across 8 categories in the asset palette
- [x] Full canvas: pan (Space+drag), zoom (Ctrl+scroll), rotate (top handle), scale (corner handles), flip X/Y
- [x] Complexity budget: 200 points max (animated: 5, scaled: 2, normal: 1)
- [x] PNG export: 1x/2x/3x scale, background toggle, animation pause during capture
- [x] Keyboard shortcuts: Delete, Cmd+D duplicate, Escape, G grid, A animations, Cmd+S save
- [x] LocalStorage persistence with auto-save (2s debounce, 30s force)
- [x] Mobile guard: friendly "works best on larger screens" message
- [x] Module-level component cache prevents redundant imports

**What's designed but NOT built:**

- [ ] No server persistence — scenes only in localStorage
- [ ] No D1 `decorations` table
- [ ] No Foliage integration (blog templates can't render decorations)
- [ ] Zone system typed (header/sidebar/footer/background with aspect ratios) but not implemented
- [ ] Tier limits defined (seedling: 5, sapling: 20, oak: 100) but not enforced

**Configuration** (`terrarium.ts`, 142 lines): Max 1MB scene JSON, 200px-4000px canvas, 4096x4096 export limit, 60 FPS target, warn at 20+ animated assets.

---

## 23. Heartwood — The Core of the Tree

**Character**: The authentication backbone. ~15,000 lines of Hono-powered Cloudflare Worker handling identity for the entire Grove ecosystem.

### Safari findings

(`services/heartwood/` — 14 route files, 30 unit tests, 4 E2E suites)

**Authentication methods:**

- [x] **Passkeys** (primary) — WebAuthn, `rpID: grove.place`, multi-origin, rate-limited 20/hour register
- [x] **Google OAuth** (fallback) — PKCE, `openid email profile`
- [x] **Magic links** (email) — 10-min expiry, Resend API, 5/hour per IP
- [x] **Device flow** (CLI) — RFC 8628, 8-character user codes, 10-min expiry
- [x] **TOTP 2FA** (optional) — 10 backup codes, 10 chars each

**Dual session system:**

- [x] **Better Auth sessions** — D1 + KV cache (5-min TTL, <5ms validation)
- [x] **SessionDO** — Per-user Durable Object, max 10 sessions (auto-revokes oldest), login rate limiting (5/5min, 15min lockout)
- [x] **Session bridge** — BA session creation hook auto-creates parallel DO session, appends both cookies

**3-layer rate limiting:**

1. Hono middleware (per-endpoint: 30/min tokens, 60/min verify, 5/hour magic links)
2. Better Auth built-in (bridged to D1 `rate_limits` with `ba:` prefix)
3. Cloudflare WAF (1 rule — leaked credential check)

**Security:**

- [x] RS256 JWT access tokens (1-hour, PII excluded — use `/userinfo`)
- [x] 13 D1 tables (BA user/session/account/verification/passkey/2FA + Grove clients/audit/subscriptions/device_codes/rate_limits)
- [x] 90-day audit log retention (16 event types), cron cleanup at midnight
- [x] Admin routes with dual auth (Bearer OR cookie for service binding support)
- [x] Cron keepalive: warms D1 + KV + SessionDOs every minute
- [x] Smart placement: worker runs closer to D1 database

**Integration:**

- [x] Cross-subdomain cookies on `.grove.place`
- [x] Wildcard redirect URI validation against ENGINE_DB tenants table
- [x] Service binding from login/landing/plant packages
- [x] Subscription tiers: seedling (250 posts), sapling (2000), evergreen (10k), canopy/platform (unlimited)

---

## 24. Login — The Front Door

**Character**: The thinnest package in the monorepo. Pure UI + proxy. No database, no secrets, no business logic.

### Safari findings

(`apps/login/` — 9 route files, ~25 total files)

- [x] Glassmorphic card: "Welcome back, Wanderer" with three sign-in options
- [x] Google OAuth (with colors icon), Passkey (with Waystone tooltip), Email magic link
- [x] Loading states per provider, error banners, email-sent confirmation
- [x] All API routes proxy to Heartwood via `platform.env.AUTH.fetch()` (Worker-to-Worker)
- [x] **Proxy hardening**: Response header allowlist (11 headers), 1MB body limit, auth-only cookie filtering
- [x] **Redirect validation**: Allowlist `*.grove.place` + `autumnsgrove.com`, blocks `javascript:/data:/vbscript:` schemes
- [x] Cookie fallback for OAuth redirect drops (`grove_auth_redirect` cookie)
- [x] `/passkey` — Protected registration page, device name auto-detection, WebAuthn error handling
- [x] `/health` — Checks UI + Heartwood connectivity, returns healthy/degraded/unhealthy
- [x] No D1/KV/R2 bindings — only `AUTH` service binding

---

## 25. Grove Router (Passage) — The Hidden Way Through

**Character**: The invisible infrastructure. 313 lines that route all `*.grove.place` wildcard traffic to the right destination.

### Safari findings

(`services/grove-router/src/index.ts` — 313 lines)

- [x] Maps subdomains to service bindings: `plant` → Pages project, `cdn` → R2, `auth` → login hub, `{username}` → tenant blog
- [x] R2 serving with content-type detection and XSS prevention via Content-Disposition headers
- [x] CORS handling for CDN requests
- [x] Two R2 buckets: MEDIA (user uploads), CDN (static assets)

---

## 26. OG Worker — The Portrait Painter

**Character**: 803 lines of Open Graph image generation.

### Safari findings

(`services/og-worker/src/index.ts` — 803 lines)

- [x] `workers-og` (Satori) for image generation
- [x] Multi-layer font caching: memory → KV → CDN → Google Fonts fallback
- [x] 5 visual variants: default, forest, workshop, midnight, knowledge
- [x] `/fetch` endpoint for external OG metadata scraping (LinkPreview component)
- [x] Rate limiting, caching, SSRF protection on fetch endpoint

---

## 27. Post Migrator — The Sleeping Giant (DISABLED)

**Character**: A hot/warm/cold storage tier system. Currently frozen due to a catastrophic timestamp bug.

### Safari findings

(`workers/post-migrator/src/index.ts` — 682 lines)

- [x] Designed to migrate post content D1 → R2 based on view counts and age
- [x] Tier-based thresholds (evergreen posts stay hot longer)
- [x] Recovery endpoint at `/recover` restores R2 content to D1
- **FATAL BUG**: `published_at` stores Unix seconds, passed to `new Date()` without `* 1000`. Every post appeared ~55 years old. One 3 AM cron run migrated ALL posts Hot→Warm→Cold, clearing content from D1. **NEVER re-enable without fixing the timestamp conversion.**

---

## 28. Durable Objects — The Loom

**Character**: The coordination layer. 7 Durable Objects recently migrated to the Loom SDK.

### Safari findings

(`services/durable-objects/` — 45-line index, ~2000+ lines across DOs)

| DO                | Lines | Purpose                                                     |
| ----------------- | ----- | ----------------------------------------------------------- |
| **TenantDO**      | 548   | Tenant coordination — settings, config, multi-request state |
| **PostMetaDO**    | 602   | Post metadata — view counts, reactions, scores              |
| **PostContentDO** | 338   | Post content bodies — markdown, HTML                        |
| **SentinelDO**    | —     | Infrastructure observability                                |
| **ExportDO**      | —     | Export job coordination (zip generation)                    |
| **TriageDO**      | —     | AI triage for Porch conversations                           |
| **ThresholdDO**   | —     | Rate limit tracking                                         |

---

## 29. Workers — The Night Crew

**Character**: Four cron-triggered background jobs that keep the forest healthy while it sleeps.

### Safari findings

(`workers/`)

| Worker               | Schedule     | Job                                                                             |
| -------------------- | ------------ | ------------------------------------------------------------------------------- |
| **clearing-monitor** | 5min + daily | Health checks, creates/resolves incidents, emails alerts, records 90-day uptime |
| **timeline-sync**    | Daily 1 AM   | Nightly timeline summaries via GitHub + OpenRouter                              |
| **meadow-poller**    | Every 15min  | RSS ingestion from opted-in tenants → `meadow_posts` with SSRF prevention       |
| **webhook-cleanup**  | Daily 3 AM   | Expired webhook events (120-day) + zip exports (7-day, R2 + D1)                 |

The **meadow-poller** is how Blooms get into the Meadow feed — it's the RSS ingestion pipeline that powers the community.

---

## 30. Domains (Forage) — The Domain Hunter

**Character**: AI-powered domain search tool. DeepSeek v3.2 via OpenRouter for ZDR compliance.

### Safari findings

(`apps/domains/`)

- [x] Auth via Heartwood SessionDO with D1 session fallback
- [x] AI-powered "vibe check" for domain suggestions
- [x] Cloudflare Registrar API integration
- [x] Admin routes in `/arbor/*`, search/vibe/config APIs
- [x] Available as add-on for Evergreen tier or standalone purchase

---

## 31. Vineyard — The Showcase Pattern

**Character**: A Svelte 5 component library for creating consistent `/vineyard` demo pages.

### Safari findings

(`libs/vineyard/`)

- [x] VineyardLayout (222 lines) — Hero + branding
- [x] FeatureCard — Status badges + demos
- [x] CodeExample — Syntax highlighting
- [x] StatusBadge, TierGate, RoadmapSection, AuthButton/UserMenu
- [x] Inline CSS with custom properties (not Tailwind) for portability
- [x] Self-contained — works outside the Grove ecosystem

---

## Empty Clearings

Three packages with no source code:

- **zig-core** — Placeholder for future Zig performance experiments
- **example-site** — Was a demo SvelteKit site, source files removed
- **ui** — Placeholder (actual UI lives in `libs/engine/src/lib/ui/`)

---

## Expedition Summary

### By the numbers

| Metric                   | Count          |
| ------------------------ | -------------- |
| Total stops              | 31 (+ 3 empty) |
| Packages in monorepo     | 18             |
| Active packages          | 15             |
| Workshop tools cataloged | 47             |
| Tools live or complete   | 21             |
| Tools building           | 7              |
| Tools planned            | 13             |
| Nature SVG components    | 63             |
| Terrarium asset palette  | 62             |
| Curios (blog widgets)    | 22             |
| Feed algorithms          | 5              |
| Warm reaction emojis     | 10             |
| Fonts in editor          | 18             |
| Auth methods (Heartwood) | 5              |
| D1 tables (Heartwood)    | 13             |
| Durable Objects          | 7              |
| Cron workers             | 4              |
| API endpoints (Meadow)   | 6              |
| API endpoints (Plant)    | 14             |
| Lines in Heartwood       | ~15,000        |
| Lines in Bloom editor    | 820            |
| Lines in Image manager   | 2,047          |
| Lines in Settings        | 1,741          |
| Lines in OG Worker       | 803            |
| Lines in Post Migrator   | 682            |

### Terrain condition

**Thriving** — Landing, Manifesto, Vision, Beyond, Nature SVGs, Workshop, Arbor (all pages), Meadow Feed, Heartwood, Login, Grove Router, OG Worker, Clearing, Plant, Durable Objects, Workers (cron jobs)

**Growing** — Meadow Landing (waitlist only), Meadow Components (solid, minor polish), Terrarium (canvas works, no server persistence), Domains/Forage, Vineyard

**Dormant** — Post Migrator (disabled, timestamp bug), zig-core/example-site/ui (empty stubs)

**Not yet built** — Arbor Rings (analytics placeholder), 3 Greenhouse curios, 13 planned Workshop tools (Reeds, Canopy, Forests, Wander, Weave, Nook, Etch, Burrow, Warden, Vista, Centennial, Rings, Amber)

### Cross-cutting themes

**1. Privacy as architecture, not afterthought**

- Votes visible only to the voter, reactions only to the author
- Analytics delayed 24 hours — no refresh-to-check anxiety
- EXIF GPS stripped on every upload
- No algorithm — chronological by default
- Report counts trigger auto-hide, not public shaming
- AI features all flagged ZDR (Zero Data Retention)
- Passkeys as primary auth — no passwords to leak

**2. Optimistic UI everywhere**

Every interaction in Meadow — voting, bookmarking, reacting, deleting — updates the UI instantly and rolls back on failure. The pattern is consistent across feed page and post detail, well-implemented, and the right call for a community feed.

**3. Warmth in every interaction**

- 10 warm emojis, no negative reactions
- "Leave a note in the meadow..." not "Post"
- "Blooms" and "Gardens" not "Posts" and "Blogs"
- "Begin your journey" not "Sign up"
- Character counter turns amber before red, never punishing
- Status page has "Data Protection" section showing backup health
- GlassConfirmDialog instead of browser `confirm()`

**4. Accessibility is structural**

- OpenDyslexic and Atkinson Hyperlegible alongside decorative fonts
- 44x44px touch targets on all interactive elements
- `prefers-reduced-motion` on every animation across all packages
- `aria-label`, `aria-pressed`, `aria-current` throughout
- Proper `<fieldset>`/`<legend>` in forms
- Keyboard navigation on reaction picker, terrarium canvas, tour, feed filters

**5. The Grove metaphor holds**

From package names (meadow, arbor, heartwood, clearing, terrarium) to UI copy (Wanderers, Blooms, Gardens, Rooted, Greenhouse) to error codes (GROVE-API-020) to CSS classes (glass-grove, prose-grove) to tool names in the Workshop (Shade, Patina, Lumen, Firefly, Songbird) — the forest metaphor is consistent across 15 active packages and 47 named tools. This is what gives the whole project its soul.

**6. Engineering quality is production-grade**

- Rate limiting on every write endpoint via Threshold SDK (3 layers in Heartwood)
- HTML sanitization on user-generated content
- SHA-256 dedup on image uploads
- Atomic D1 batches for multi-step operations
- HMAC-SHA256 webhook verification with constant-time comparison and replay prevention
- SSRF protection on RSS polling and OG metadata fetching
- Type-safe throughout with TypeScript, Svelte 5 runes, Drizzle ORM, Zod validation
- 30 unit tests + 4 E2E suites for Heartwood alone
- Pre-commit hooks enforce CSRF, pre-push hooks type-check 6 packages
- Mock data fallbacks for dev in Clearing and other pages

**7. Defense in depth**

Multiple security layers appear repeatedly:

- Auth: Passkeys + OAuth + magic links + device flow + TOTP
- Rate limiting: Hono middleware + Better Auth + Cloudflare WAF
- Session management: Better Auth (D1+KV) + SessionDO (per-user DO)
- Content moderation: User reports + auto-hide threshold + planned Thorn AI
- AI protection: Songbird pattern (Canary + Kestrel + Robin, 3 injection defense layers)
- Scraper protection: Shade (7-layer defense against AI crawlers)
- Proxy hardening: Response header allowlist + body size limit + cookie filtering

### What's remarkable

This is not a weekend project. This is a full publishing platform with:

- A complete auth system (5 methods, dual sessions, 3-layer rate limiting, 15k lines)
- A complete writing experience (editor, drafts, auto-save, 18 fonts, AI assistance, margin notes)
- A complete community feed (5 algorithms, reactions, bookmarks, notes, RSS ingestion, moderation)
- A complete image pipeline (drag-drop, JXL/WebP, AI alt-text, dedup, GPS stripping)
- A complete onboarding flow (profile → verify → plans → Stripe → provisioning → tour)
- A complete status page (6 components, incidents, uptime bars, backup monitoring, RSS, Sentinel)
- A creative canvas (62 nature components, drag/rotate/scale, export, complexity budget)
- A domain search tool (AI-powered, Cloudflare Registrar integration)
- A subdomain router (wildcard `*.grove.place` → service bindings)
- An OG image generator (5 variants, multi-layer font caching)
- 22 blog widgets ranging from nostalgic to genuinely innovative
- 63 hand-drawn nature components
- 7 Durable Objects on a custom framework (Loom SDK)
- 4 background workers for health checks, RSS polling, timeline summaries, and cleanup
- Custom rate limiting (Threshold) and feature flag (Grafts) SDKs
- Philosophy pages that could stand alone as published essays
- An analytics system designed around writer wellbeing
- A showcase pattern (Vineyard) for consistent tool documentation
- 47 named tools, each with a nature metaphor that doubles as documentation

And it all looks like a forest. And it's all built by one person.

---

_The fire dies to embers. The journal is full — 31 stops, every package explored, every creature observed, every clearing documented. The jeep cools under the acacia tree. Stars emerge, impossibly bright, the Southern Cross tilting overhead. The savannah stretches in every direction, vast and quiet. Tomorrow, the work continues — new paths to cut, creatures to tend, tools to sharpen. But tonight? Tonight was the drive. And what a forest you've grown._ 🚙
