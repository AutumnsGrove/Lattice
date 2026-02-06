# Curios Development Plans — Full Audit & Individual Roadmaps

> *What curiosities will they find?*

**Date:** 2026-02-06
**Status:** Planning
**Context:** Pre-public-beta curios expansion. These are not launch features, but the goal is to have plans ready so we can knock them out one by one, side-quest style.

---

## Table of Contents

1. [Current State Audit](#current-state-audit)
2. [Architecture Patterns](#architecture-patterns)
3. [Spec'd Curios (Not Yet Built)](#specced-curios-not-yet-built)
   - [Guestbook](#1-guestbook)
   - [Hit Counter](#2-hit-counter)
   - [Status Badges](#3-status-badges)
   - [Link Gardens](#4-link-gardens)
   - [Custom Cursors](#5-custom-cursors)
   - [Personal Shrines](#6-personal-shrines)
   - [Weird Artifacts](#7-weird-artifacts)
   - [Clip Art Library](#8-clip-art-library)
   - [Custom Uploads](#9-custom-uploads)
4. [New Curio Ideas (Not Yet Spec'd)](#new-curio-ideas-not-yet-specced)
   - [Now Playing](#10-now-playing)
   - [Polls](#11-polls)
   - [Activity Status](#12-activity-status)
   - [Mood Ring (Live)](#13-mood-ring-live)
   - [Webring Hub](#14-webring-hub)
   - [Blogroll](#15-blogroll)
   - [Bookmark Shelf](#16-bookmark-shelf)
   - [Ambient Sounds](#17-ambient-sounds)
5. [Priority & Sequencing](#priority--sequencing)
6. [Honest Assessment of Existing Curios](#honest-assessment-of-existing-curios)
7. [Architecture Decisions](#architecture-decisions)

---

## Current State Audit

### Built & Production-Ready

| Curio | Type | Location | DB Migration | Admin UI | Public Page | Tests |
|-------|------|----------|-------------|----------|-------------|-------|
| **Timeline** | Developer | `curios/timeline/` | `024` | `/arbor/curios/timeline/` | `/timeline/` | Yes |
| **Journey** | Developer | `curios/journey/` | `025` | `/arbor/curios/journey/` | `/journey/` | Yes |
| **Gallery** | Visitor | `curios/gallery/` | `031` | `/arbor/curios/gallery/` | `/gallery/` | Yes |

**Key observations:**
- All three follow the same architecture pattern (good for consistency)
- Timeline & Journey are developer-focused (GitHub integration, AI summaries)
- Gallery is the only visitor-focused curio so far, and it's the closest to what the planned curios will look like
- Token encryption (AES-256-GCM) is proven and reusable
- Multi-tenant patterns are solid across all three

### Not Yet Built (Spec'd in `docs/specs/curios-spec.md`)

9 curios designed with full schemas, tier access, and display examples. Zero lines of implementation code.

### Not Yet Spec'd (Ideas from brainstorming + research)

8 additional curio concepts identified during this audit.

---

## Architecture Patterns

Every curio follows this pattern (established by Timeline/Journey/Gallery):

```
packages/engine/src/lib/curios/{name}/
├── index.ts              # Types, constants, validation utilities
├── index.test.ts         # Unit tests
├── {Name}.svelte         # Main display component
├── {Sub}.svelte          # Sub-components as needed
└── SECURITY.md           # If handling secrets

packages/engine/migrations/
└── {NNN}_{name}_curio.sql    # Database schema

packages/engine/src/routes/
├── api/curios/{name}/        # REST API endpoints
├── arbor/curios/{name}/      # Admin panel pages
└── (site)/{name}/            # Public-facing page
```

**Standard patterns to follow:**
- `tenant_id` foreign key with `ON DELETE CASCADE` on every table
- JSON stored as TEXT (D1/SQLite limitation)
- Isolated try/catch per query (never batch independent queries)
- Parallel queries via `Promise.all` where possible
- Lazy-loading for below-fold curios
- `prefers-reduced-motion` respect on all animations
- Keyboard accessibility on all interactive elements
- Foliage CSS variable integration (`var(--surface)`, `var(--foreground)`, etc.)

---

## Spec'd Curios (Not Yet Built)

### 1. Guestbook

**What:** Visitors sign your guestbook. The classic personal web element.
**Vibe:** "someone visited and wanted to say hi"
**Why build this one:** It's THE defining curio. Everyone knows what a guestbook is. It's the most requested feature on indie web platforms. It creates genuine visitor interaction without being social media.

#### Development Plan

**Migration:** `{next}_guestbook_curio.sql`

```
Tables: guestbook_entries (id, tenant_id, guestbook_id, name, message, emoji,
        approved, ip_hash, created_at)
Indexes: tenant+guestbook, approved+created_at
```

**Components:**
- `Guestbook.svelte` — Main display (4 styles: classic, modern, pixel, cozy)
- `GuestbookEntry.svelte` — Individual entry rendering
- `GuestbookForm.svelte` — Sign the book (name, message, emoji picker)
- `GuestbookAdmin.svelte` — Moderation panel (approve/delete)

**API Endpoints:**
- `GET /api/curios/guestbook` — Fetch entries (paginated, approved only)
- `POST /api/curios/guestbook` — Submit new entry (rate-limited)
- `DELETE /api/curios/guestbook/[id]` — Admin delete
- `PATCH /api/curios/guestbook/[id]` — Approve/reject

**Key Implementation Details:**
- Rate limiting: 1 entry per IP per 10 minutes (via ip_hash, not stored long-term)
- Spam filtering: Integrate with Thorn if available, else basic pattern matching
- Default name: "Anonymous Wanderer"
- Max message length: 500 chars
- Emoji: Optional single emoji reaction per entry
- Pagination: 20 entries per page, newest first

**Tier Logic:**
- Seedling: 1 guestbook, 50 entries, classic style only
- Sapling: 1 guestbook, 500 entries, all 4 styles
- Oak+: Multiple guestbooks, unlimited entries, all styles

**Estimated complexity:** Medium
**Dependencies:** None (self-contained)

---

### 2. Hit Counter

**What:** "You are visitor #1,247!" — the nostalgic page view counter.
**Vibe:** "this site has been visited and that's delightful"
**Why build this one:** Simple to implement, universally recognized, pure charm. Zero complexity, maximum nostalgia.

#### Development Plan

**Migration:** `{next}_hitcounter_curio.sql`

```
Tables: hit_counters (id, tenant_id, page_path, count, style, config, started_at)
Indexes: unique tenant+page_path
```

**Components:**
- `HitCounter.svelte` — Main component with style switching
- `CounterClassic.svelte` — Green digits on black (slot machine look)
- `CounterOdometer.svelte` — Flip-style mechanical counter
- `CounterMinimal.svelte` — Plain text "You are visitor #1247"
- `CounterLCD.svelte` — Calculator/LCD display
- `CounterCustom.svelte` — User-themed colors

**API Endpoints:**
- `GET /api/curios/hitcounter` — Get count (and increment)
- `GET /api/curios/hitcounter/config` — Admin config
- `POST /api/curios/hitcounter/config` — Update config

**Key Implementation Details:**
- Increment on page load (no unique visitor tracking — privacy first)
- No IP logging whatsoever
- Count stored in D1, optionally cached in KV for speed
- Animated digit transitions (CSS only, respects reduced-motion)
- "since [date]" label optional
- Multiple counters per page for Oak+ (track different pages)

**Tier Logic:**
- Seedling: 1 counter, classic style
- Sapling: 1 counter, all styles
- Oak+: Per-page counters, custom colors

**Estimated complexity:** Low
**Dependencies:** None

---

### 3. Status Badges

**What:** Site status indicators — "Under Construction," "Just Planted," etc.
**Vibe:** "here's what's happening with my corner of the internet"
**Why build this one:** Tiny effort, huge personality. Free for all tiers. Instant delight.

#### Development Plan

**Migration:** `{next}_statusbadge_curio.sql`

```
Tables: status_badges (id, tenant_id, type, position, animated, custom_text,
        show_date, created_at)
Indexes: tenant_id
```

**Components:**
- `StatusBadge.svelte` — Main component with badge type switching
- `BadgeUnderConstruction.svelte` — Animated worker/tape
- `BadgeJustPlanted.svelte` — Sprouting seedling
- `BadgeComingSoon.svelte` — Crystal ball
- `BadgeNewShiny.svelte` — Sparkle burst
- `BadgeOnHiatus.svelte` — Sleeping moon
- `BadgeGrandOpening.svelte` — Confetti
- `BadgeNightOwl.svelte` — Auto-detection from post times
- `BadgeLastUpdated.svelte` — Auto-updates with last post date

**API Endpoints:**
- `GET /api/curios/statusbadge` — Get active badges
- `POST /api/curios/statusbadge` — Set/update badge
- `DELETE /api/curios/statusbadge/[id]` — Remove badge

**Key Implementation Details:**
- Badges render as small floating elements (configurable position: header/sidebar/footer/floating)
- Animated variants use CSS animations only (lightweight)
- "Night Owl" badge auto-detects from post timestamps
- "Last Updated" badge queries most recent post date
- All badges are purely decorative SVG/CSS — no external dependencies

**Tier Logic:**
- All tiers: Full access (these are fun and free!)

**Estimated complexity:** Low
**Dependencies:** None

---

### 4. Link Gardens

**What:** Curated link collections — your blogroll, friends list, cool sites.
**Vibe:** "here are the places and people I love on the web"
**Why build this one:** This is how indie web community works. It's how people discover each other. It's the antithesis of algorithmic discovery.

#### Development Plan

**Migration:** `{next}_linkgarden_curio.sql`

```
Tables: link_gardens (id, tenant_id, title, description, style, created_at, updated_at)
        link_garden_items (id, garden_id, tenant_id, url, title, description,
        favicon, button_image, sort_order, added_at)
Indexes: tenant_id, garden_id
```

**Components:**
- `LinkGarden.svelte` — Main component with style switching
- `GardenList.svelte` — Vertical list with descriptions
- `GardenGrid.svelte` — Icon grid with tooltips
- `GardenButtons.svelte` — 88x31 button wall (classic web!)
- `GardenMarquee.svelte` — Scrolling links (the chaos option)
- `LinkGardenAdmin.svelte` — Add/edit/reorder links

**API Endpoints:**
- `GET /api/curios/linkgarden` — Fetch gardens + links
- `POST /api/curios/linkgarden` — Create garden
- `PUT /api/curios/linkgarden/[id]` — Update garden
- `DELETE /api/curios/linkgarden/[id]` — Delete garden
- `POST /api/curios/linkgarden/[id]/links` — Add link
- `PUT /api/curios/linkgarden/[id]/links/[linkId]` — Update link
- `DELETE /api/curios/linkgarden/[id]/links/[linkId]` — Remove link

**Key Implementation Details:**
- Auto-fetch favicons from URLs (background worker, cache in KV)
- 88x31 button support: upload custom button images OR auto-generate from site colors
- Marquee uses CSS `animation` with `marquee` keyframes (not the HTML `<marquee>` tag)
- Drag-and-drop reordering in admin
- Categorizable (Friends, Cool Sites, Resources, etc.)
- Links validated on save (basic URL format check)

**Tier Logic:**
- Seedling: 1 garden, 10 links, list style only
- Sapling: 3 gardens, 50 links each, all styles
- Oak+: Unlimited gardens/links, all styles, custom 88x31 button uploads

**Estimated complexity:** Medium
**Dependencies:** Favicon fetching (could use Google's favicon API or self-hosted)

---

### 5. Custom Cursors

**What:** Custom cursor themes for your site — leaf, butterfly, sparkle trails.
**Vibe:** "even your mouse knows this place is special"
**Why build this one:** Immediately noticeable, visceral delight. People LOVE cursor customization. It's one of those things that makes you go "oh wow this site is different."

#### Development Plan

**Migration:** `{next}_cursor_curio.sql`

```
Tables: cursor_config (tenant_id PRIMARY KEY, type, preset, custom_url,
        trail_effect, trail_length, updated_at)
```

**Components:**
- `CursorProvider.svelte` — Wraps the page, applies cursor globally
- `CursorTrail.svelte` — Trail effect renderer (Canvas-based)
- Cursor assets: SVG/PNG files for each preset in `static/curios/cursors/`

**Implementation:**
- Apply cursor via CSS `cursor: url(...)` for static cursors
- Trail effects via a lightweight Canvas overlay (pointer events: none)
- Trail elements are recycled (object pool, max `trail_length` elements)
- Custom uploads stored in R2, served via CDN
- All cursor effects disabled when `prefers-reduced-motion: reduce`

**API Endpoints:**
- `GET /api/curios/cursor/config` — Get cursor config
- `POST /api/curios/cursor/config` — Update config
- Admin UI: Live preview of cursor on hover

**Preset Cursors (SVG/PNG assets to create):**
- Nature: leaf, flower, butterfly, ladybug, raindrop
- Whimsical: sparkle, wand, mushroom
- Classic Web: hourglass, rainbow, pointer-leaf
- Seasonal: snowflake, pumpkin, blossom, falling-leaf

**Tier Logic:**
- Seedling: 5 nature presets only
- Sapling: All presets
- Oak+: All presets + 1 custom upload (32x32 max)

**Estimated complexity:** Medium
**Dependencies:** Cursor asset creation (SVG/PNG art), R2 for custom uploads

---

### 6. Personal Shrines

**What:** Dedicated spaces for the things you love — memorial, fandom, gratitude boards.
**Vibe:** "this is sacred to me and I wanted to share it"
**Why build this one:** Deeply personal, emotionally resonant. No other platform offers this. It's the kind of thing that makes someone's site feel genuinely theirs.

#### Development Plan

**Migration:** `{next}_shrine_curio.sql`

```
Tables: shrines (id, tenant_id, type, title, dedication, frame, size,
        contents, candle, flowers, created_at, updated_at)
Indexes: tenant_id
```

**Components:**
- `Shrine.svelte` — Main component with frame/type switching
- `ShrineFrame.svelte` — Frame rendering (wood, stone, crystal, floral, cosmic, minimal)
- `ShrineContent.svelte` — Content placement within shrine
- `ShrineCandle.svelte` — Animated flickering candle (CSS)
- `ShrineFlowers.svelte` — Decorative edge flowers
- `ShrineEditor.svelte` — Admin: drag content items into shrine layout

**Shrine Types:**
- Memory — Photos, dates, dedications (pet memorial, loved ones)
- Fandom — Celebrate favorite media, characters, creators
- Achievement — NaNoWriMo, milestones, accomplishments
- Gratitude — Things you're thankful for
- Inspiration — Quotes, images, vibes
- Blank — Build from scratch

**Key Implementation Details:**
- Shrine is a fixed-size container (150x150, 250x250, or 400x400)
- Contents are positioned via x/y coordinates within the container
- Content items: image (R2), text, date, icon (from icon set), decoration
- Frame renders as border/overlay SVG
- Candle animation: CSS `@keyframes` with subtle flicker
- Images pulled from Gallery curio or new uploads (shares R2 bucket)

**Tier Logic:**
- Seedling: No shrines
- Sapling: 3 shrines, small/medium only
- Oak+: Unlimited shrines, all sizes, all frames

**Estimated complexity:** High (content editor, positioned layout, multiple frames)
**Dependencies:** R2 for images, asset creation for frames

---

### 7. Weird Artifacts

**What:** Interactive chaos objects — Magic 8-Ball, fortune cookies, dice, tarot, marquee text.
**Vibe:** "click the thing and something unexpected happens"
**Why build this one:** Pure delight. These are the conversation starters, the things people share screenshots of. "Look, their site has a magic 8-ball!"

#### Development Plan

**Migration:** `{next}_artifact_curio.sql`

```
Tables: artifacts (id, tenant_id, type, page_path, position, config, created_at)
Indexes: tenant+page_path
```

**Components — Mystical:**
- `CrystalBall.svelte` — Swirling animated mist (Canvas/CSS)
- `Magic8Ball.svelte` — Click to shake, get answer (customizable answer pool)
- `TarotCard.svelte` — Random daily card draw with meaning
- `GlowingRunes.svelte` — Decorative animated symbols

**Components — Interactive:**
- `FortuneCookie.svelte` — Crack open for daily fortune
- `DiceRoller.svelte` — Click to roll (configurable: d4, d6, d8, d12, d20)
- `CoinFlip.svelte` — Heads or tails with flip animation
- `MoodRing.svelte` — Color changes with time of day

**Components — Classic Web:**
- `MarqueeText.svelte` — Scrolling messages (CSS animation)
- `BlinkingNew.svelte` — The "NEW!" blinker
- `RainbowDivider.svelte` — Colorful separator lines
- `EmailButton.svelte` — Retro "Email Me!" button
- `AsciiArt.svelte` — Text art display blocks

**Key Implementation Details:**
- Each artifact is a self-contained Svelte component
- Artifacts store per-tenant config as JSON
- Position data for Terrarium drag-and-drop integration (future)
- Daily draws (tarot, fortune) seeded by date so they stay consistent per day
- Magic 8-Ball supports custom answer pools
- Marquee uses CSS `animation`, NOT HTML `<marquee>`
- All interactive artifacts keyboard-accessible (Enter/Space to activate)
- Reduced motion: static fallbacks for all animations

**Tier Logic:**
- Seedling: 2 artifacts (non-interactive only — runes, dividers, ASCII)
- Sapling: 5 artifacts, all types
- Oak+: Unlimited

**Estimated complexity:** Medium (many small components, but each is simple)
**Dependencies:** Tarot card data set, fortune text corpus

---

### 8. Clip Art Library

**What:** Decorative assets you can drop onto pages — borders, critters, sparkles, signs.
**Vibe:** "the craft drawer of your digital scrapbook"
**Why build this one:** Enables visual creativity without design skills. Combined with Terrarium, this becomes the "sticker book" for your site.

#### Development Plan

**Migration:** `{next}_clipart_curio.sql`

```
Tables: clipart_placements (id, tenant_id, page_path, asset_id, position,
        scale, rotation, created_at)
Indexes: tenant+page_path
```

**Asset Organization:**
```
static/curios/clipart/
├── foliage/       # Borders, corners, dividers (vine, flower, mushroom, stream)
├── critters/      # Butterflies, bees, ladybugs, birds, woodland silhouettes
├── effects/       # Sparkles, fairy dust, light rays, weather
├── labels/        # Signposts, stone markers, banners, speech bubbles, nameplates
└── decorative/    # Ribbons, lanterns, fairy lights, garden stakes, birdhouses
```

**Components:**
- `ClipArtLayer.svelte` — Renders all placed clip art on a page
- `ClipArtPicker.svelte` — Browse/search asset library (admin)
- `ClipArtItem.svelte` — Individual placed item with transform

**Key Implementation Details:**
- Assets are SVG where possible (scalable, theme-colorable)
- Animated assets (butterflies, sparkles) use CSS animations
- Placement data stored per page_path
- Scale: 0.25x - 3x, Rotation: 0-360 degrees
- Assets inherit Foliage color variables where appropriate
- No server-side rendering needed — pure client-side overlay

**Tier Logic:**
- Seedling: 5 items per page
- Sapling: 25 items per page
- Oak+: Unlimited

**Estimated complexity:** Medium (asset creation is the big effort, code is straightforward)
**Dependencies:** Art assets need to be created/sourced (significant creative effort)

---

### 9. Custom Uploads

**What:** Upload your own images to use as decorations, shrine contents, etc.
**Vibe:** "make it truly yours"
**Why build this one:** Enables everything else. Shrines need images. Cursors can be custom. This is the infrastructure curio.

#### Development Plan

**Migration:** `{next}_customupload_curio.sql`

```
Tables: custom_uploads (id, tenant_id, filename, cdn_url, thumbnail_url,
        file_size, dimensions, usage_count, uploaded_at)
Indexes: tenant_id
```

**Components:**
- `UploadManager.svelte` — Admin: upload, browse, delete images
- `UploadDropzone.svelte` — Drag-and-drop upload area
- `ImagePicker.svelte` — Select from uploads (used by other curios)
- `QuotaBar.svelte` — Visual storage quota indicator

**API Endpoints:**
- `POST /api/curios/uploads` — Upload file (multipart)
- `GET /api/curios/uploads` — List uploads with pagination
- `DELETE /api/curios/uploads/[id]` — Delete upload
- `GET /api/curios/uploads/quota` — Check storage usage

**Key Implementation Details:**
- Files stored in R2 under `curios/{tenant_id}/uploads/`
- Auto-resize to max 512x512 on upload (server-side via Workers)
- Auto-convert to WebP for storage efficiency
- Generate thumbnails at 128x128
- Formats accepted: PNG, GIF, WEBP, SVG (SVG sanitized server-side)
- Content moderation: hash-based NSFW detection
- Quota enforcement checked before upload, not after

**Tier Logic:**
- Seedling: 10 uploads, 50MB total
- Sapling: 25 uploads, 500MB total
- Oak+: Unlimited uploads, 5GB total

**Estimated complexity:** Medium
**Dependencies:** R2 storage (already used by Gallery), image processing in Workers

---

## New Curio Ideas (Not Yet Spec'd)

These emerged from brainstorming and research. They represent the next wave of curios beyond the original spec.

### 10. Now Playing

**What:** Display what you're currently listening to — Spotify, Last.fm, Apple Music integration.
**Vibe:** "we're listening to music together right now"
**Why this matters:** This is the #1 thing people add to Discord profiles, Notion pages, and personal sites. It's a real-time signal that says "a human is here, living their life." It's the modern equivalent of the "what I'm listening to" sidebar on LiveJournal.

#### Development Plan

**Migration:** `{next}_nowplaying_curio.sql`

```
Tables: nowplaying_config (tenant_id PRIMARY KEY, provider, access_token_encrypted,
        refresh_token_encrypted, display_style, show_album_art, show_progress,
        fallback_text, updated_at)
        nowplaying_history (id, tenant_id, track_name, artist, album,
        album_art_url, played_at)
Indexes: tenant_id, played_at
```

**Providers (pick one per tenant):**
- **Spotify** — OAuth2 PKCE flow, Web API for currently playing
- **Last.fm** — API key, recent tracks endpoint
- **Manual** — Set a "currently vibing to" text manually

**Components:**
- `NowPlaying.svelte` — Main display component
- `NowPlayingCompact.svelte` — Small inline version (for sidebar/footer)
- `NowPlayingCard.svelte` — Full card with album art, progress bar
- `NowPlayingHistory.svelte` — Recent listens log
- `NowPlayingAdmin.svelte` — Connect provider, configure display

**Display Styles:**
- **Compact** — "Now Playing: Song — Artist" (one line)
- **Card** — Album art + song + artist + progress bar (Discord-style)
- **Vinyl** — Spinning record animation with track info
- **Minimal** — Just the song name, subtle

**Key Implementation Details:**
- Spotify: OAuth2 with PKCE, store encrypted refresh token, poll every 30s via client
- Last.fm: API key (simpler), poll recent tracks
- Fallback: When nothing playing, show custom text ("silence is golden" / "the forest rests")
- Album art: Proxy through R2/CDN to avoid hotlinking
- History: Store last 50 tracks for "recently played" display
- Client-side polling (not server-side cron) — reduces infrastructure cost
- Token encryption: Reuse existing AES-256-GCM pattern from Timeline

**Tier Logic:**
- Seedling: Manual mode only
- Sapling: Spotify OR Last.fm integration, compact style
- Oak+: All providers, all display styles, history log

**Estimated complexity:** Medium-High (OAuth flows, token refresh, real-time polling)
**Dependencies:** Spotify Developer App registration, Last.fm API key

---

### 11. Polls

**What:** Run interactive polls on your site — ask visitors questions, see live results.
**Vibe:** "I'm curious what you think"
**Why this matters:** Your friend Arturo asked about it, and he's not wrong — polls are one of the most engaging interactive elements on the web. Twitter/X made them mainstream. Having them as a curio means they live on YOUR site, not someone else's platform. Data stays with the Wanderer.

#### Development Plan

**Migration:** `{next}_poll_curio.sql`

```
Tables: polls (id, tenant_id, question, description, poll_type, options,
        multiple_choice, show_results, close_at, created_at, updated_at)
        poll_votes (id, poll_id, tenant_id, option_index, voter_hash,
        created_at)
Indexes: tenant+poll, poll_id+voter_hash (unique, prevents double-voting)
```

**Components:**
- `Poll.svelte` — Main poll display
- `PollOptions.svelte` — Render options with radio/checkbox
- `PollResults.svelte` — Bar chart / pie chart results view
- `PollAdmin.svelte` — Create/edit/close polls
- `PollEmbed.svelte` — Inline-able version for blog posts

**Poll Types:**
- **Single choice** — Pick one
- **Multiple choice** — Pick up to N
- **Ranked** — Drag to rank (stretch goal)

**Display Styles:**
- **Card** — Standalone poll card
- **Inline** — Embedded within blog post content
- **Sidebar** — Compact sidebar widget

**Key Implementation Details:**
- One vote per visitor per poll (hashed IP + user agent, NOT stored as PII)
- Vote hash: `sha256(poll_id + ip + user_agent)` — prevents double-voting without tracking
- Show results: configurable (always, after voting, after close, never/admin only)
- Optional close date for time-limited polls
- Animated result bars (CSS transitions)
- No login required to vote (low friction)
- Results cached in KV (update on vote, expire in 60s)

**Tier Logic:**
- Seedling: 1 active poll, single choice only
- Sapling: 5 active polls, single + multiple choice
- Oak+: Unlimited polls, all types, ranked choice

**Estimated complexity:** Medium
**Dependencies:** None (self-contained)

---

### 12. Activity Status

**What:** A customizable status indicator — "Currently: writing a blog post" / "Away: touching grass"
**Vibe:** "I'm a real person and here's what I'm up to"
**Why this matters:** Discord popularized custom statuses. Having one on your personal site humanizes it. It tells visitors "someone is actually behind this." Could integrate with other curios (Now Playing, etc.) for auto-statuses.

#### Development Plan

**Migration:** `{next}_activitystatus_curio.sql`

```
Tables: activity_status (tenant_id PRIMARY KEY, status_text, status_emoji,
        status_type, auto_source, expires_at, updated_at)
```

**Components:**
- `ActivityStatus.svelte` — Display component (multiple layouts)
- `ActivityStatusAdmin.svelte` — Set/update status
- `ActivityStatusInline.svelte` — Tiny version for header bar

**Status Types:**
- **Manual** — Set your own text + emoji
- **Presets** — "Writing," "Coding," "Reading," "Away," "Sleeping"
- **Auto** — Derived from other sources:
  - Now Playing curio → "Listening to [song]"
  - Recent post → "Just published: [title]"
  - Time-based → "Night owl mode" (late hours)
- **Timed** — Auto-expire after X hours

**Key Implementation Details:**
- Stored in D1, cached in KV (edge-fast reads)
- Expiration: optional, auto-clears after set time
- Auto-source integration: reads from other curio data if available
- Display: emoji + text, small and unobtrusive
- Position: header bar, sidebar, or floating badge

**Tier Logic:**
- Seedling: Manual presets only
- Sapling: Manual custom text + emoji
- Oak+: Auto-sources, timed statuses

**Estimated complexity:** Low
**Dependencies:** Optional integration with Now Playing

---

### 13. Mood Ring (Live)

**What:** A visual mood indicator that changes throughout the day — time-based, weather-based, or manually set.
**Vibe:** "the site reflects how I'm feeling"
**Why this matters:** Different from Activity Status — this is ambient and visual. The ring/gem changes color based on mood, time of day, or season. It's decorative but personal. The spec already mentions a "Mood Ring" artifact that changes with time of day — this expands it into a first-class curio.

#### Development Plan

**Migration:** Shares artifact table OR `{next}_moodring_curio.sql`

```
Tables: mood_ring_config (tenant_id PRIMARY KEY, mode, manual_mood,
        color_scheme, display_style, updated_at)
        mood_ring_log (id, tenant_id, mood, note, logged_at)
```

**Modes:**
- **Time-based** — Dawn (calm blue), Morning (warm yellow), Afternoon (bright), Evening (purple), Night (deep blue)
- **Manual** — Set your mood with emoji + color
- **Seasonal** — Follows the Grove season system
- **Random** — Changes subtly every visit (within a palette)

**Components:**
- `MoodRing.svelte` — The ring/gem itself (animated color transitions)
- `MoodRingAdmin.svelte` — Set mode, manual mood, optional daily logging
- `MoodLog.svelte` — Optional: display mood history as a color timeline

**Key Implementation Details:**
- Pure CSS/SVG for the ring (gradient transitions)
- Smooth color transitions between states
- Optional: daily mood logging (creates a beautiful color timeline over time)
- Pairs well with seasonal themes from Foliage

**Tier Logic:**
- Seedling: Time-based only
- Sapling: Manual + time-based
- Oak+: All modes, mood logging

**Estimated complexity:** Low-Medium
**Dependencies:** None

---

### 14. Webring Hub

**What:** Join and create webrings — a curated navigation element linking related sites.
**Vibe:** "we're all connected, and clicking through is the adventure"
**Why this matters:** Webrings are THE defining feature of the indie web revival. They're how people discover sites organically without algorithms. Grove is perfectly positioned to offer native webring support across all `*.grove.place` sites.

#### Development Plan

**Migration:** `{next}_webring_curio.sql`

```
Tables: webring_memberships (id, tenant_id, webring_id, ring_name,
        prev_url, next_url, home_url, badge_style, joined_at, updated_at)
```

**Components:**
- `WebringNav.svelte` — The classic [← Prev | Hub | Next →] navigation bar
- `WebringBadge.svelte` — Small badge/button for sidebar
- `WebringAdmin.svelte` — Manage webring memberships

**Key Implementation Details:**
- Phase 1: Support external webrings (user inputs prev/next/home URLs manually)
- Phase 2 (future): Grove-native webrings where `*.grove.place` sites can form rings
- Badge styles: text, 88x31 button, compact bar, floating
- Position: footer (classic), sidebar, or floating
- Multiple ring memberships supported
- Phase 2 would require a separate service (webring.grove.place) to manage ring membership and routing — that's a bigger project and should be its own spec

**Tier Logic:**
- Seedling: 1 webring membership
- Sapling: 3 memberships
- Oak+: Unlimited

**Estimated complexity:** Low (Phase 1), High (Phase 2 native rings)
**Dependencies:** None for Phase 1

---

### 15. Blogroll

**What:** A dedicated "sites I read" list — different from Link Gardens in that it's specifically about RSS/blog recommendations.
**Vibe:** "here's who I read and recommend"
**Why this matters:** Blogrolls were the original content discovery mechanism. They're making a huge comeback in the indie web community. This could eventually integrate with Meadow (community feed) for cross-pollination.

#### Development Plan

**Note:** This could be implemented as a Link Garden preset/variant rather than a separate curio. The difference is that blogrolls specifically track blogs/feeds and could show latest post titles.

**Migration:** Extend link_gardens table OR `{next}_blogroll_curio.sql`

```
Tables: blogroll_items (id, tenant_id, url, title, description, feed_url,
        last_post_title, last_post_date, sort_order, added_at, updated_at)
Indexes: tenant_id, feed_url
```

**Components:**
- `Blogroll.svelte` — Display recommended blogs
- `BlogrollItem.svelte` — Individual blog with optional latest post
- `BlogrollAdmin.svelte` — Add/remove blogs, auto-detect RSS

**Special Feature: Live Latest Post**
- Auto-fetch RSS/Atom feeds periodically (KV-cached, 1hr refresh)
- Show "Latest: [post title]" under each blog
- Background Worker cron to refresh feed data

**Tier Logic:**
- Seedling: 5 blogs, no RSS fetching
- Sapling: 25 blogs, RSS latest post
- Oak+: Unlimited, RSS fetching, OPML import/export

**Estimated complexity:** Medium (RSS parsing adds complexity)
**Dependencies:** RSS/Atom parser (could use a lightweight library)
**Decision needed:** Separate curio or Link Gardens variant?

---

### 16. Bookmark Shelf

**What:** A curated collection of links organized as a visual bookshelf — books, articles, resources you want to share.
**Vibe:** "browse my shelf, take what interests you"
**Why this matters:** Different from Link Gardens (which are directories) and Blogrolls (which are feeds). This is more like a digital library or reading list with visual flair — think "books on a shelf" aesthetic.

#### Development Plan

**Migration:** `{next}_bookmarkshelf_curio.sql`

```
Tables: bookmark_shelves (id, tenant_id, title, description, created_at)
        bookmarks (id, shelf_id, tenant_id, url, title, author, cover_image,
        category, note, is_favorite, sort_order, added_at)
Indexes: shelf_id, tenant_id, category
```

**Components:**
- `BookmarkShelf.svelte` — Visual bookshelf display
- `BookmarkSpine.svelte` — Individual "book spine" on the shelf
- `BookmarkDetail.svelte` — Expanded view when clicked
- `BookmarkAdmin.svelte` — Add/organize bookmarks

**Display Style:**
- Horizontal "bookshelf" with spines showing titles
- Click to expand and see details/notes
- Categories as different shelf rows
- Favorites get a special "starred" spine

**Key Implementation Details:**
- Book spines auto-colored based on category (or custom)
- Cover images optional (fetched from Open Graph or manual upload)
- "Currently Reading" section at top
- Export as JSON or shareable list

**Tier Logic:**
- Seedling: 1 shelf, 10 bookmarks
- Sapling: 3 shelves, 50 bookmarks
- Oak+: Unlimited

**Estimated complexity:** Medium
**Dependencies:** Open Graph fetching for covers (optional)

---

### 17. Ambient Sounds

**What:** Optional background audio — nature sounds, lo-fi vibes, seasonal ambiance.
**Vibe:** "step into the grove and hear it"
**Why this matters:** This is the most immersive curio. Imagine landing on someone's Grove site and hearing gentle rain, birdsong, or lo-fi beats. It turns a website visit into an experience. Critical: MUST be opt-in (never autoplay).

#### Development Plan

**Migration:** `{next}_ambient_curio.sql`

```
Tables: ambient_config (tenant_id PRIMARY KEY, enabled, sound_set,
        volume_default, autoplay, custom_url, updated_at)
```

**Sound Sets (bundled):**
- Forest Rain — Gentle rainfall with distant thunder
- Morning Birds — Dawn chorus
- Creek — Running water over stones
- Night — Crickets, owls, wind
- Lo-fi — Royalty-free lo-fi beats
- Fireplace — Crackling fire
- Seasonal — Auto-selects based on Grove season

**Components:**
- `AmbientPlayer.svelte` — Small toggle + volume control
- `AmbientAdmin.svelte` — Select sound set, configure defaults

**Key Implementation Details:**
- **NEVER autoplay** — Always requires explicit user click to start
- Small, unobtrusive player icon (speaker icon in corner)
- Audio files stored in R2, served via CDN
- Seamless looping (audio files designed for it)
- Remembers user preference in localStorage (if they turned it on/off)
- Volume slider with reasonable default (30%)
- Custom sound support for Oak+ (upload your own ambient track)
- Audio files should be compressed (128kbps max, mono is fine for ambiance)
- File size budget: ~2-5MB per sound set (1-3 minute loops)

**Tier Logic:**
- Seedling: 2 sound sets (Forest Rain, Morning Birds)
- Sapling: All bundled sound sets
- Oak+: All bundled + custom upload

**Estimated complexity:** Low-Medium
**Dependencies:** Audio asset creation/sourcing, R2 storage

---

## Priority & Sequencing

Based on impact, complexity, and how well they serve the public beta audience:

### Tier 1: Build First (High impact, lower complexity, universal appeal)

| # | Curio | Why First | Complexity |
|---|-------|-----------|------------|
| 1 | **Guestbook** | THE curio. Everyone gets it. Creates visitor interaction. | Medium |
| 2 | **Hit Counter** | Dead simple, pure nostalgia, instant charm. | Low |
| 3 | **Status Badges** | Tiny effort, free for all tiers, immediate personality. | Low |
| 4 | **Activity Status** | Humanizes the site, simple to build. | Low |

### Tier 2: Build Next (High impact, medium complexity)

| # | Curio | Why Next | Complexity |
|---|-------|----------|------------|
| 5 | **Link Gardens** | Core indie web feature, community building. | Medium |
| 6 | **Now Playing** | People LOVE this. The "oh cool" factor is huge. | Medium-High |
| 7 | **Polls** | Interactive, engaging, Arturo-approved. | Medium |
| 8 | **Webring Hub** | Phase 1 is simple. Connects the Grove community. | Low |

### Tier 3: Build When Ready (High impact, higher complexity or dependency-heavy)

| # | Curio | Why Later | Complexity |
|---|-------|-----------|------------|
| 9 | **Weird Artifacts** | Fun but many components. Can ship incrementally (start with 3-4). | Medium |
| 10 | **Custom Cursors** | Needs art assets. Great impact but blocked on cursor SVGs. | Medium |
| 11 | **Mood Ring** | Cool concept, lower urgency. | Low-Medium |
| 12 | **Blogroll** | RSS parsing adds complexity. Could ship as Link Garden variant first. | Medium |

### Tier 4: Build Last (High effort or dependency chains)

| # | Curio | Why Last | Complexity |
|---|-------|----------|------------|
| 13 | **Ambient Sounds** | Needs audio assets. Incredible when done but big creative effort. | Low-Medium |
| 14 | **Bookmark Shelf** | Nice to have, more niche appeal. | Medium |
| 15 | **Personal Shrines** | Content editor complexity, needs multiple frame assets. | High |
| 16 | **Clip Art Library** | Blocked on having a library of assets to offer. | Medium |
| 17 | **Custom Uploads** | Infrastructure for other curios. Build as needed by dependents. | Medium |

### Suggested Build Order

```
Tier 1 (quick wins, immediate value):
  Guestbook → Hit Counter → Status Badges → Activity Status

Tier 2 (the "wow" features):
  Link Gardens → Now Playing → Polls → Webring Hub

Tier 3 (incremental, ship-what's-ready):
  Artifacts (start with Magic 8-Ball + Marquee + Fortune Cookie)
  → Custom Cursors → Mood Ring → Blogroll

Tier 4 (when the ecosystem needs them):
  Ambient Sounds → Bookmark Shelf → Shrines → Clip Art → Custom Uploads
```

---

## Honest Assessment of Existing Curios

You mentioned this and it's worth being direct about it:

**Timeline and Journey are developer curios.** They're great reference implementations — they proved the architecture, the encryption pattern, the multi-tenant approach, and the API design. But they're niche:
- Timeline: Developers who want AI summaries of their GitHub activity. Cool, but narrow.
- Journey: Developers tracking repo evolution. Even narrower.
- Neither is something most beta testers will enable or care about.

**Gallery is the closest to universal appeal.** Photo galleries are something anyone can use. It's the best reference for how visitor-facing curios should work.

**For beta testers, the curios that matter are the visitor-facing ones** — Guestbook, Hit Counter, Link Gardens, Status, Now Playing. Those are what make someone go "oh this is different from WordPress/Tumblr/Squarespace."

The developer curios aren't bad — they're just personal projects that got folded into the platform. They serve as excellent architectural references and they're legitimately cool for the right audience. Keep them, but don't lead with them.

---

## Architecture Decisions

### Where do curios live?

**Current state:** All three built curios are in `packages/engine/src/lib/curios/`.

**Options:**

1. **Keep in engine** (current approach)
   - Pros: Single package, easy imports, shared utilities
   - Cons: Engine grows large, every curio adds to bundle

2. **Separate `packages/curios/` package**
   - Pros: Isolates curio code, separate versioning
   - Cons: Cross-package imports, more build complexity

3. **Separate repository** (`GrovesCurios` or similar)
   - Pros: Independent development, could be community-contributed
   - Cons: Coordination overhead, harder to share engine utilities

**Recommendation:** Stay in the engine for now. The engine-first pattern is working. When/if curios reach 15+ implementations, revisit extraction to a dedicated package. The Svelte components tree-shake well, so bundle size isn't a real concern until there are many curios with many assets.

### How are curios registered?

**Proposed system for new curios:**

```typescript
// packages/engine/src/lib/curios/registry.ts
export const CURIO_REGISTRY = {
  guestbook: { name: 'Guestbook', category: 'interactive', tier: 'seedling' },
  hitcounter: { name: 'Hit Counter', category: 'decoration', tier: 'seedling' },
  // ...
} as const;
```

This gives us a single source of truth for what curios exist, their categories, and minimum tier requirements.

### Shared infrastructure to build first

Before diving into individual curios, these shared pieces will benefit all of them:

1. **Curio settings table** — Already designed in spec (`curio_settings` with `enabled_curios` JSON array)
2. **Tier enforcement middleware** — Check tenant tier before rendering/enabling a curio
3. **Curios hub page** — `/arbor/curios/` admin page listing all available curios with enable/disable
4. **Curio wrapper component** — `<CurioWrapper>` that handles loading state, error boundary, and reduced-motion

---

## Next Steps

1. **Review this document** and confirm priority ordering
2. **Create GitHub issues** for each curio (or batch via `grove-issues` skill)
3. **Build shared infrastructure** (registry, tier enforcement, curios hub)
4. **Start with Guestbook** — it's the flagship visitor curio
5. **Ship Tier 1 curios** one by one, side-quest style

Each curio is its own adventure. Pick one up, build it, ship it, move to the next. The plans are here — now it's about execution.

---

*"What curiosities will they find?" — Whatever we build next.*
