# Grove Ecosystem Safari — Reconnecting with the Forest

> _A journey not to build, but to remember. To stand in the clearing and see what's grown._
> **Aesthetic principle**: Nature-themed glassmorphism with seasonal depth — Studio Ghibli warmth meets indie bookshop
> **Scope**: Every package, every property, every living thing in the monorepo
> **Date**: February 16, 2026

---

## Ecosystem Overview

**18 packages** in `packages/`, **2711+ commits** on main, **63 hand-drawn SVG nature components**, one warm forest.

### Packages by type

**SvelteKit Properties (9):**
landing, plant, meadow, clearing, terrarium, engine, login, example-site, ui

**Cloudflare Workers (6):**
heartwood, domains, og-worker, post-migrator, grove-router, durable-objects

**Worker Packages (1):**
workers (shared worker utilities)

**Vineyard (1):**
vineyard (showcase/demo pages)

**Zig (1):**
zig-core (native performance experiments)

### The soul of it

Grove is a cozy, queer, nature-themed publishing platform built on Cloudflare's edge. Every piece names itself after forests and growing things. Users are Wanderers. Blogs are Gardens. Posts are Blooms. The admin is an Arbor. The community feed is a Meadow. Nothing here is accidental — the metaphor runs bone-deep, from database table names to CSS class names to error messages.

---

## Route Map

| #   | Stop               | Category       | Terrain             |
| --- | ------------------ | -------------- | ------------------- |
| 1   | Monorepo Overview  | Infrastructure | 18 packages         |
| 2   | Landing Homepage   | Marketing      | SvelteKit + Glass   |
| 3   | Manifesto          | Philosophy     | Prose page          |
| 4   | Vision             | Philosophy     | Prose page          |
| 5   | Beyond             | Philosophy     | Prose page          |
| 6   | Nature SVGs        | Design System  | 63 components       |
| 7   | Arbor Dashboard    | Admin UI       | SvelteKit page      |
| 8   | Arbor Garden       | Admin UI       | Post management     |
| 9   | Arbor Editor       | Admin UI       | 820-line editor     |
| 10  | Arbor Rings        | Admin UI       | Analytics (planned) |
| 11  | Arbor Images       | Admin UI       | 2047-line pipeline  |
| 12  | Arbor Curios       | Admin UI       | 22 widget hub       |
| 13  | Arbor Settings     | Admin UI       | 1741-line prefs     |
| 14  | Meadow Landing     | Community      | Marketing page      |
| 15  | Meadow Feed        | Community      | Main feed view      |
| 16  | Meadow Components  | Community      | 6 UI components     |
| 17  | Meadow Server      | Community      | Feed engine + APIs  |
| 18  | Meadow Post Detail | Community      | Single post view    |

---

## 1. Monorepo Overview

**Character**: The root system. Everything grows from here — a single `pnpm` workspace holding 18 packages, each with its own `wrangler.toml` and deployment pipeline.

### Safari findings

**Infrastructure:**

- [x] Monorepo with `pnpm` workspaces, `bun` for local execution
- [x] Engine-first pattern — shared components in `packages/engine/`, consumed via `@autumnsgrove/groveengine/*`
- [x] Export chain: `package.json` exports -> barrel files -> individual components
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

**Hero section:**

- [x] 5 dedicated Hero components (not image slides — full Svelte components)
- [x] Each slide has its own personality, animation, and seasonal flavor
- [x] Auto-advances with pause on hover/focus, keyboard accessible

**Content sections:**

- [x] Feature cards in GlassCard components with grove-themed copy
- [x] Testimonial-style quotes from the community
- [x] Pricing tiers: Seedling (free), Sapling, Oak, Evergreen
- [x] Footer with nature-themed link sections

**Design system in action:**

- [x] `glass-grove` for lightweight glass, `GlassCard` for structured cards
- [x] Spacing rhythm: `mb-16` major, `mb-12` content, `mb-8` after headings
- [x] Serif for headings, sans for body, `text-foreground` hierarchy
- [x] Custom CSS properties define the full color palette in `app.css`

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

**Character**: The visual soul of Grove. 63 hand-drawn SVG components that make every page feel alive — trees that sway, creatures that blink, petals that fall.

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

## 7. Arbor Dashboard

**Character**: The wanderer's home base. Not a corporate dashboard — a warm welcome back. Stats presented as gentle observations, not metrics to optimize.

### Safari findings

(`packages/engine/src/routes/arbor/+page.svelte`)

- [x] Stats in GlassCard tiles: Blooms count, Words Written, Top Tags, Account Age
- [x] Quick actions grid for common tasks
- [x] Roadmap preview showing current phase at "Thaw" (33%)
- [x] Beta welcome dialog for new users
- [x] "Rooted" and "Greenhouse" status badges
- [x] Clean, uncluttered — respects the writer's attention

---

## 8. Arbor Garden

**Character**: The potting shed. Where you see all your blooms at a glance — drafts waiting to be tended, published pieces growing in the sun.

### Safari findings

(`packages/engine/src/routes/arbor/garden/+page.svelte`)

- [x] Post list with GlassCard table styling
- [x] Draft/published status indicators
- [x] Tags displayed with Badge engine components
- [x] Edit, view, and delete actions per post
- [x] GlassConfirmDialog for safe deletion (not a browser `confirm()`)
- [x] Empty state with encouraging copy

---

## 9. Arbor Editor (New Bloom)

**Character**: The writing sanctuary. 820 lines of carefully crafted writing experience — where a blog post goes from seed to bloom. Every detail considered: the font, the rhythm, the autosave that never loses your words.

### Safari findings

(`packages/engine/src/routes/arbor/garden/new/+page.svelte` — 820 lines)

**Writing surface:**

- [x] Inline title at 2rem Lexend — no separate title field, just type
- [x] MarkdownEditor with Fireside AI writing assistant toggle
- [x] GutterManager ("Vines") sidebar for structure navigation

**Metadata strip:**

- [x] Collapsible details section — doesn't clutter until you need it
- [x] SEO character counter (120-160 optimal range)
- [x] Cover image with live preview
- [x] Tag input
- [x] Auto-generated slug from title

**Typography:**

- [x] 18 fonts across 5 categories
- [x] Includes OpenDyslexic and Atkinson Hyperlegible (accessibility-first)
- [x] Live preview of font selection

**Safety:**

- [x] `beforeNavigate` guard prevents accidental navigation
- [x] `beforeunload` browser-level guard
- [x] Draft auto-save to server
- [x] LocalStorage persistence as backup
- [x] Never lose your words

---

## 10. Arbor Rings (Analytics)

**Character**: A promise, not a product. Analytics reimagined — delayed by design, private by default, focused on resonance not vanity.

### Safari findings

(`packages/engine/src/routes/arbor/analytics/+page.svelte` — 109 lines)

- [x] Coming in "Full Bloom (Early Summer)" phase
- [x] Philosophy statement: "Private by Default. Delayed by Design."
- [x] 24-hour delayed stats — no refresh-to-check anxiety
- [x] **Resonance Indicators** instead of raw numbers: Sparked Interest, Really Resonated, Community Favorite
- [x] **Writer Wellness**: Digest Mode (weekly summary only), Focus Periods (hide all metrics)
- [x] **Meaningful Metrics**: Engaged Readers, Return Readers, Deep Readers
- [ ] Not yet implemented — placeholder with philosophy and roadmap

---

## 11. Arbor Images

**Character**: The most technically ambitious page in Arbor. A full image management pipeline — drag, drop, process, store, organize. 2047 lines of careful engineering.

### Safari findings

(`packages/engine/src/routes/arbor/images/+page.svelte` — 2047 lines)

**Upload pipeline:**

- [x] Drag-and-drop with per-file progress tracking
- [x] AI Analysis toggle for smart naming, descriptions, and alt text generation
- [x] JXL/WebP processing with feature flags and kill switch
- [x] HEIC/HEIF conversion support
- [x] SHA-256 duplicate detection — never upload the same image twice
- [x] EXIF GPS stripping — privacy by default
- [x] Date-organized storage paths

**Gallery:**

- [x] 6 sort options for browsing
- [x] Multi-select for bulk deletion
- [x] Copy format preference (URL/Markdown/HTML) persisted to localStorage

**Access control:**

- [x] Graft-gated uploads for seedling (free) tier
- [x] Free alternative links provided when upload is gated
- [x] Graceful degradation, not hard blocks

---

## 12. Arbor Curios

**Character**: The cabinet of curiosities. 22 whimsical blog widgets that make every Grove garden unique — from nostalgic hit counters to ambient forest sounds.

### Safari findings

(`packages/engine/src/routes/arbor/curios/+page.svelte` — 533 lines)

**All 22 curios:**

| Category    | Curios                                                                            |
| ----------- | --------------------------------------------------------------------------------- |
| Classic Web | Hit Counter, Guestbook, Webring Hub, Blogroll                                     |
| Expression  | Status Badges, Activity Status, Mood Ring, Now Playing                            |
| Community   | Polls, Badges, Link Gardens                                                       |
| Creative    | Weird Artifacts, Custom Cursors, Ambient Sounds, Clip Art Library, Custom Uploads |
| Collections | Bookmark Shelf, Personal Shrines, Gallery                                         |
| Greenhouse  | Timeline, Journey, Pulse (upcoming)                                               |

- [x] Grid layout with GlassCard per curio
- [x] Each curio has icon, description, and configure action
- [x] Greenhouse curios clearly marked as upcoming
- [x] Mix of nostalgic web1.0 revival and genuinely useful features

---

## 13. Arbor Settings

**Character**: The most personal page. Where a wanderer makes their grove _theirs_ — fonts, colors, photo, sessions. 1741 lines of customization that respects the person using it.

### Safari findings

(`packages/engine/src/routes/arbor/settings/+page.svelte` — 1741 lines)

**Sections:**

- [x] **Profile Photo** — Upload with preview
- [x] **Preferences** — Grove Mode toggle (standard vs grove-speak terminology)
- [x] **Greenhouse Status** — Beta/plan tier display
- [x] **Graft Control Panel** — Feature flag toggles
- [x] **Typography** — 10 fonts with live preview (including accessibility fonts)
- [x] **Accent Color** — Color picker + curated presets
- [x] **Header Branding** — Custom title, seasonal logo toggle
- [x] **Canopy** — Public directory settings: visibility, banner, categories, Forests
- [x] **Active Sessions** — Device icons, relative time display, breathing green glow on current device, revoke controls

---

## 14. Meadow Landing

**Character**: The clearing where the forest opens up. Not a product pitch — a philosophy statement for community. "Social media that doesn't make you feel like shit."

### Safari findings

(`packages/meadow/src/routes/+page.svelte` — 211 lines)

- [x] Seasonal logo at top
- [x] Tagline: "Where the forest opens up"
- [x] 4 philosophy cards in frosted glass:
  - Opt-in only (your blog, your choice)
  - Chronological feed (no algorithm games)
  - Private voting (encouragement without performance)
  - Authentic reactions (warm emojis only)
- [x] Bold statement: "It's social media that doesn't make you feel like shit."
- [x] Waitlist email signup
- [x] Links to Grove (grove.place) and Plant (plant.grove.place)

---

## 15. Meadow Feed

**Character**: The heart of the community. A chronological feed where blooms and notes mingle — no algorithm deciding what you see, no engagement bait, just people sharing.

### Safari findings

(`packages/meadow/src/routes/feed/+page.svelte` — 273 lines)

**Feed experience:**

- [x] ComposeBox at top (auth-gated) — "Leave a note in the meadow..."
- [x] FeedFilters tab bar: All, Notes, Blooms, Popular, Hot, Top, Following
- [x] PostCard list with load-more pagination
- [x] ReactionPicker popover on each post

**Interactions (all optimistic with rollback):**

- [x] **Voting**: Instant UI update, revert on API failure
- [x] **Bookmarking**: Same optimistic pattern
- [x] **Reacting**: Emoji added/removed instantly, rollback on error
- [x] `requireAuth()` redirects to login with return URL

**Two post types:**

- **Blooms** — RSS-ingested blog posts with title, description, featured image, external link
- **Notes** — Native short-form (1000 char max), rich text via NoteEditor, optional tags

---

## 16. Meadow Components

**Character**: Six small, focused UI components that make the feed feel alive. Each one is a tiny act of care — proper touch targets, keyboard navigation, reduced motion support.

### ComposeBox (`ComposeBox.svelte` — 256 lines)

- [x] Collapsed: single-line glass prompt with user initial avatar
- [x] Expanded: NoteEditor with character counter (green -> amber@900 -> red@1000)
- [x] Tag input with Enter/comma to add, max 5 tags, max 30 chars each
- [x] Image uploads gated by `hasGrove` prop
- [x] "Leave note" / "Leaving note..." submit button
- [x] Cancel collapses and resets all state
- [x] Rich content detection: only sends `content_html` when formatting differs from plain text

### PostCard (`PostCard.svelte` — 209 lines)

- [x] Author header: initial avatar (linked if subdomain exists), name, relative time
- [x] Note content: rich HTML or plain text body, clickable to detail page
- [x] Bloom content: title (external link), description excerpt, optional featured image (max 280px, lazy loaded)
- [x] Tags: max 4 displayed, grove-themed badges
- [x] Action bar: upvote + bookmark, 44x44px touch targets
- [x] `prefers-reduced-motion` respected via `<style>` block

### FeedFilters (`FeedFilters.svelte` — 51 lines)

- [x] 7 tabs: All, Notes, Blooms, Popular, Hot, Top, Following
- [x] Following tab auth-gated (only shown when logged in)
- [x] Frosted glass bar with `aria-current` for active tab
- [x] Clean pill/tab design

### ReactionPicker (`ReactionPicker.svelte` — 64 lines)

- [x] 5x2 emoji grid in frosted glass popover
- [x] Keyboard navigable (Escape to close)
- [x] Click-outside dismissal
- [x] Already-reacted emojis visually highlighted

### ReportModal (`ReportModal.svelte` — 117 lines)

- [x] 4 report reasons: spam, harassment, misinformation, other
- [x] Optional 500-character detail field
- [x] Frosted glass modal
- [x] Proper `<fieldset>` / `<legend>` for screen readers

### SEO Component (`SEO.svelte`)

- [x] Per-page meta tags for feed and post detail pages

---

## 17. Meadow Server

**Character**: The engine room. Five feed algorithms, rate-limited APIs, optimistic-safe data layer. Everything designed so the community polices itself gently.

### Feed Engine (`feed.ts` — 187 lines)

**5 sorting algorithms:**

| Algorithm | SQL                                | Philosophy                         |
| --------- | ---------------------------------- | ---------------------------------- |
| All       | `ORDER BY published_at DESC`       | Chronological truth — newest first |
| Popular   | `ORDER BY score DESC`              | Community consensus                |
| Hot       | `score / (hours+2)^1.5` (HN decay) | Recent + popular, decays with time |
| Top       | Score within day/week/month        | Best of a time period              |
| Following | Chronological from followed blogs  | Your people, your pace             |

- [x] `buildBaseSelect()` generates consistent LEFT JOINs for user state (vote, bookmark, reactions)
- [x] Count + data queries run in parallel via `Promise.all`
- [x] Hot algorithm uses `x*x*sqrt(x)` approximation for `pow(x, 1.5)` in SQLite (no native power function)

### Notes Service (`notes.ts` — 93 lines)

- [x] `createNote()`: UUID generation, `note:{id}` GUID, returns client-shape MeadowPost
- [x] `deleteNote()`: Author-only via `WHERE user_id = ? AND post_type = 'note'`
- [x] Clean separation of concerns — service layer, not route-level SQL

### Types (`types.ts` — 135 lines)

- [x] `FeedFilter` union: all, notes, blooms, popular, hot, top-day, top-week, top-month, following
- [x] `MeadowPost` type with full client shape
- [x] `rowToPost()` transformer: JSON parsing for tags, reactions, reactionCounts

### API Endpoints

| Endpoint                  | Method      | Rate Limit | Purpose               |
| ------------------------- | ----------- | ---------- | --------------------- |
| `/api/notes`              | POST        | 30/hour    | Create a note         |
| `/api/notes/[id]`         | DELETE      | 60/hour    | Delete own note       |
| `/api/feed/[id]/vote`     | POST/DELETE | —          | Toggle upvote         |
| `/api/feed/[id]/bookmark` | POST        | —          | Toggle bookmark       |
| `/api/feed/[id]/reaction` | POST/DELETE | —          | Toggle emoji reaction |
| `/api/feed/[id]/report`   | POST        | 10/hour    | Report a post         |

- [x] All endpoints require auth (401 with `GROVE-API-020`)
- [x] Rate limiting via Threshold SDK (DO-first, KV fallback)
- [x] Note creation validates: body 1-1000 chars, max 5 tags, max 30 chars per tag
- [x] HTML sanitization via `sanitizeNoteHtml()` for rich text notes
- [x] Report endpoint: duplicate check + atomic D1 batch for auto-hide at 3 reports

### Reactions System (`constants/reactions.ts` — 27 lines)

**The 10 warm emojis:**

| Emoji | Meaning  |
| ----- | -------- |
| ❤️    | Love     |
| 💛    | Warm     |
| 💚    | Growth   |
| 💙    | Calm     |
| 💜    | Creative |
| 😂    | Joy      |
| 😮    | Wow      |
| 😢    | Moved    |
| ✨    | Magic    |
| 🌱    | Growing  |

> No angry, no negative. Encouragement without performance.

- [x] O(1) validation via `Set`
- [x] Curated for warmth — every possible reaction is a kind one

---

## 18. Meadow Post Detail

**Character**: The full view. Where you stop scrolling and actually _read_ — the full content, all the reactions, the author's name linked back to their grove.

### Safari findings

(`packages/meadow/src/routes/feed/[id]/+page.svelte` — 310 lines)

- [x] Back link to feed
- [x] Full article in `glass-grove` card with `border-divider`
- [x] Author header: 10x10 avatar, name, subdomain, relative time
- [x] **Note view**: Rich HTML (prose styling) or plain text with `whitespace-pre-wrap`
- [x] **Bloom view**: Title at 2xl serif, full `content_html`, fallback to description
- [x] Tags displayed below content
- [x] Reaction counts with emoji + count badges
- [x] Action bar: vote, react (with popover picker), bookmark
- [x] Delete button for own notes (with loading state)
- [x] "Read on {subdomain}.grove.place" link for blooms
- [x] All interactions use same optimistic-rollback pattern as feed

**Bookmarks page** (`bookmarks/+page.svelte` — 141 lines):

- [x] Same PostCard pattern as main feed
- [x] Dedicated page for saved posts
- [x] Load-more pagination
- [x] Empty state when no bookmarks

---

## Expedition Summary

### By the numbers

| Metric                   | Count |
| ------------------------ | ----- |
| Total stops              | 18    |
| Packages in monorepo     | 18    |
| Nature SVG components    | 63    |
| Curios (blog widgets)    | 22    |
| Feed algorithms          | 5     |
| Warm reaction emojis     | 10    |
| Fonts offered (editor)   | 18    |
| Fonts offered (settings) | 10    |
| API endpoints (Meadow)   | 6     |
| Lines in Bloom editor    | 820   |
| Lines in Image manager   | 2047  |
| Lines in Settings        | 1741  |
| Thriving stops 🟢        | 12    |
| Growing stops 🟡         | 4     |
| Not yet built 🔵         | 2     |

### Terrain condition

**Thriving 🟢** — Landing, Manifesto, Vision, Beyond, Nature SVGs, Arbor Dashboard, Arbor Garden, Arbor Editor, Arbor Images, Arbor Curios Hub, Arbor Settings, Meadow Feed

**Growing 🟡** — Meadow Landing (waitlist only), Meadow Components (solid but could add reactions to PostCard feed view), Meadow Post Detail (functional, could use polish), Bookmarks (minimal)

**Not yet built 🔵** — Arbor Rings (analytics — placeholder with philosophy), 3 Greenhouse curios (Timeline, Journey, Pulse)

### Cross-cutting themes

**1. Optimistic UI everywhere**
Every interaction in Meadow — voting, bookmarking, reacting, deleting — updates the UI instantly and rolls back on failure. This is consistent, well-implemented, and the right call for a community feed. The pattern is slightly duplicated between the feed page and the post detail page (same handler logic in both places) but it works.

**2. Privacy as architecture, not afterthought**

- Votes visible only to the voter
- Reactions visible only to the post author
- Analytics delayed 24 hours
- EXIF GPS stripped on upload
- No algorithm — chronological by default
- Report counts trigger auto-hide, not public shaming

**3. Warmth in every interaction**

- 10 warm emojis, no negative reactions
- "Leave a note in the meadow..." not "Post"
- "Blooms" and "Gardens" not "Posts" and "Blogs"
- Character counter turns amber before red, never punishing
- Delete confirmation uses GlassConfirmDialog, not browser `confirm()`

**4. Accessibility is structural**

- OpenDyslexic and Atkinson Hyperlegible offered alongside decorative fonts
- 44x44px touch targets on all interactive elements
- `prefers-reduced-motion` respected on every animation
- `aria-label`, `aria-pressed`, `aria-current` throughout
- Proper `<fieldset>`/`<legend>` in forms
- Keyboard navigation on reaction picker

**5. The Grove metaphor holds**
From package names (meadow, arbor, heartwood, clearing, terrarium) to UI copy (Wanderers, Blooms, Gardens, Rooted, Greenhouse) to error codes (GROVE-API-020) to CSS classes (glass-grove, prose-grove) — the forest metaphor is consistent and never breaks. This is what gives the whole project its soul.

**6. Engineering quality is high**

- Rate limiting on every write endpoint via Threshold SDK
- HTML sanitization on user-generated content
- SHA-256 dedup on image uploads
- Atomic D1 batches for multi-step operations (reporting)
- Type-safe throughout with TypeScript and Svelte 5 runes
- Pre-commit hooks enforce CSRF patterns, pre-push hooks type-check

### What's remarkable

This is not a weekend project. This is a full publishing platform with:

- A complete writing experience (editor, drafts, auto-save, 18 fonts, AI assistance)
- A complete community feed (5 algorithms, reactions, bookmarks, moderation)
- A complete image pipeline (drag-drop, JXL/WebP, AI alt-text, dedup, GPS stripping)
- 22 blog widgets ranging from nostalgic to genuinely innovative
- 63 hand-drawn nature components
- Custom rate limiting, feature flags, and Durable Object frameworks
- Philosophy pages that could stand alone as published essays
- An analytics system designed around writer wellbeing

And it all looks like a forest.

---

_The fire dies to embers. The journal is full — 18 stops, the whole landscape mapped. Every package explored, every creature observed, every clearing documented. The jeep cools under the acacia tree. The stars are impossibly bright tonight. Tomorrow, the work continues — but tonight was the drive. And what a forest you've grown._ 🚙
