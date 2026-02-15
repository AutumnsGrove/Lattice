# Curios Development Plans

> *What curiosities will they find?*

**Date:** 2026-02-06
**Status:** Planning

---

## What Are Curios?

Curios are the interactive, decorative, and personal elements that make a Grove site feel alive and uniquely yours. They're not themes (that's Foliage), not the editor (that's Terrarium) — they're the tchotchkes, the personality, the things that make someone go "oh, this site is *different*."

---

## Current State

### Built & Production-Ready (3)

| Curio | Type | Audience | Notes |
|-------|------|----------|-------|
| **Timeline** | Developer | Niche | AI GitHub summaries. Great architecture reference, narrow appeal. |
| **Journey** | Developer | Niche | Repo evolution tracking. Even narrower. |
| **Gallery** | Visitor | Universal | R2 image gallery. Best reference for visitor-facing curios. |

Timeline and Journey proved the architecture — encryption, multi-tenancy, API design. Gallery is the template for everything we build next.

### To Build (18)

Individual plans in this directory. See [Priority & Sequencing](#priority--sequencing) below.

---

## Curio Placement Philosophy

Curios need to be playable damn near anywhere. Two modes:

### 1. Dedicated Pages (Full-Page Curios)

Some curios warrant their own page:

```
/{curio-name}/     e.g. /gallery/, /guestbook/, /timeline/
```

These are the curios that ARE the content — galleries, guestbooks, timelines. They get a full route, their own layout, and room to breathe.

### 2. Vine Placement (Gutter Curios)

Most curios live in the **vines** — the left or right gutters alongside content in blooms, gardens, and groves.

```
┌──────────────────────────────────────────────────┐
│                    Header                         │
├────────┬──────────────────────────┬───────────────┤
│        │                          │               │
│  Left  │      Blog Content        │    Right      │
│  Vine  │      (untouchable)       │    Vine       │
│        │                          │               │
│ [Now   │   The actual post or     │ [Hit Counter] │
│  Play] │   page content lives     │ [Status]      │
│ [Mood] │   here. Curios NEVER     │ [Guestbook    │
│        │   go in the middle.      │    mini]      │
│        │                          │ [Badges]      │
│        │                          │               │
├────────┴──────────────────────────┴───────────────┤
│                    Footer                         │
│              [Webring Nav Bar]                    │
└──────────────────────────────────────────────────┘
```

**The rule: curios go in the gutters, never in the middle of content.**

Content is sacred. The center column belongs to the Wanderer's words. Curios enhance the margins — they're the ivy on the walls, not furniture blocking the hallway.

### 3. Placement Exceptions

- **Polls** can be embedded inline in blog posts (they ARE content when the author places them)
- **Clip Art** can be positioned anywhere (decorative overlay, pointer-events: none)
- **Custom Cursors** are global (affect the entire page)
- **Ambient Sounds** are global (small player in corner)
- **Status Badges** float (configurable position)

### Placement Slots

Each layout template defines these vine slots:

```typescript
type VinePlacement =
  | 'left-vine'       // Left gutter
  | 'right-vine'      // Right gutter
  | 'header-vine'     // Below header, above content
  | 'footer-vine'     // Above footer, below content
  | 'floating'        // Fixed position (corner)
  | 'global'          // Affects entire page (cursors, ambient)
  | 'dedicated'       // Full page route
  | 'inline'          // Author-placed within content
```

---

## Plan Index

### Shared Infrastructure (Build First)
- [00 — Shared Infrastructure](./00-shared-infrastructure.md) — Registry, placement system, tier enforcement, curio wrapper

### Tier 1: Quick Wins (High impact, low complexity)
- [01 — Guestbook](./01-guestbook.md) — THE curio. Visitor signatures with moderation.
- [02 — Hit Counter](./02-hit-counter.md) — Nostalgic page view counter.
- [03 — Status Badges](./03-status-badges.md) — Site status indicators.
- [04 — Activity Status](./04-activity-status.md) — Discord-style "currently doing" indicator.

### Tier 2: The "Wow" Features (High impact, medium complexity)
- [05 — Link Gardens](./05-link-gardens.md) — Curated link collections with 88x31 buttons.
- [06 — Now Playing](./06-now-playing.md) — Spotify/Last.fm currently listening.
- [07 — Polls](./07-polls.md) — Interactive voting on your site.
- [08 — Webring Hub](./08-webring-hub.md) — Join and navigate webrings.

### Tier 3: Incremental Builds (Ship what's ready)
- [09 — Weird Artifacts](./09-weird-artifacts.md) — Magic 8-Ball, fortune cookies, chaos objects.
- [10 — Custom Cursors](./10-custom-cursors.md) — Cursor themes and trails.
- [11 — Mood Ring](./11-mood-ring.md) — Ambient visual mood indicator.
- [12 — Blogroll](./12-blogroll.md) — RSS-powered blog recommendations.
- [13 — Badges](./13-badges.md) — Collectible achievement and profile badges.

### Tier 4: When the Ecosystem Needs Them
- [14 — Ambient Sounds](./14-ambient-sounds.md) — Optional background audio.
- [15 — Bookmark Shelf](./15-bookmark-shelf.md) — Visual reading list library.
- [16 — Personal Shrines](./16-personal-shrines.md) — Dedication boards for things you love.
- [17 — Clip Art Library](./17-clip-art.md) — Decorative drag-and-drop assets.
- [18 — Custom Uploads](./18-custom-uploads.md) — User image storage for other curios.

---

## Priority & Sequencing

```
Tier 1 (quick wins, immediate value):
  Guestbook → Hit Counter → Status Badges → Activity Status

Tier 2 (the "wow" features):
  Link Gardens → Now Playing → Polls → Webring Hub

Tier 3 (incremental, ship-what's-ready):
  Weird Artifacts (start with 3-4) → Custom Cursors → Mood Ring → Blogroll → Badges

Tier 4 (when the ecosystem needs them):
  Ambient Sounds → Bookmark Shelf → Shrines → Clip Art → Custom Uploads
```

### Build Order Rationale

- **Tier 1** curios are universally understood, low complexity, and give beta testers something to play with immediately
- **Tier 2** curios are the "oh cool" features that differentiate Grove from every other platform
- **Tier 3** curios can ship incrementally (e.g., start Artifacts with just Magic 8-Ball + Marquee)
- **Tier 4** curios either need art assets, depend on other curios, or have higher complexity

---

## Architecture Decisions

### Where do curios live?

All curios live in `packages/engine/src/lib/curios/{name}/`. Engine-first pattern. When we hit 15+ built curios, revisit extraction to a dedicated package.

### Shared patterns

Every curio follows the established pattern from Timeline/Journey/Gallery:

```
packages/engine/src/lib/curios/{name}/
├── index.ts              # Types, constants, validation
├── index.test.ts         # Unit tests
├── {Name}.svelte         # Main display component
└── ...                   # Sub-components as needed

packages/engine/migrations/
└── {NNN}_{name}_curio.sql

packages/engine/src/routes/
├── api/curios/{name}/        # REST API
├── arbor/curios/{name}/      # Admin panel
└── (site)/{name}/            # Public page (if dedicated)
```

### Standard requirements for every curio

- `tenant_id` FK with `ON DELETE CASCADE`
- JSON stored as TEXT (D1/SQLite)
- Isolated try/catch per query
- `Promise.all` for parallel queries
- `prefers-reduced-motion` respect
- Keyboard accessible
- Foliage CSS variable integration
- Vine placement support (left/right/floating/dedicated)

---

*Each plan is its own adventure. Pick one up, build it, ship it, move to the next.*
