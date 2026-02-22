---
title: "Curio Enhancement Roadmap"
status: active
category: features
---

# Curio Enhancement Roadmap

> **Ordering**: Complexity-first (easiest wins → hardest builds)
> **Scope**: Full safari treatment per curio
> **Source**: `docs/plans/planned/curio-safari.md` + individual files in `docs/plans/planned/curios/`
> **Created**: 2026-02-20

---

## Phase 0 — Cross-Cutting Foundation

**Standalone PR. Clean the soil before planting.**

### 0A. Shared `.sr-only` utility (11 components)

Extract the duplicated `.sr-only` CSS class from 11 curio components into a shared utility. Every public curio component defines the identical 9-line class.

**Files to touch:**

- CurioNowplaying.svelte (line ~236)
- CurioStatusbadges.svelte (line ~144)
- CurioBlogroll.svelte (line ~168)
- CurioArtifacts.svelte (line ~143)
- CurioHitcounter.svelte (line ~497)
- CurioMoodring.svelte (line ~104)
- CurioLinkgarden.svelte (line ~282)
- CurioWebring.svelte (line ~143)
- CurioBadges.svelte (line ~190)
- CurioActivitystatus.svelte (line ~96)
- CurioBookmarkshelf.svelte (line ~298)
- CurioGuestbook.svelte (line ~138)
- CurioPoll.svelte (line ~216)

**Approach**: Tailwind already provides `sr-only` utility. If not available via engine preset, add a shared CSS class in engine globals.

### 0B. Hardcoded `#4ade80` → grove CSS vars (3 components)

| File                   | Line | Context                                |
| ---------------------- | ---- | -------------------------------------- |
| CurioNowplaying.svelte | ~182 | `.bar { background: #4ade80 }`         |
| CurioWebring.svelte    | ~97  | Link `color: #4ade80`                  |
| CurioBadges.svelte     | ~46  | Rarity color map `uncommon: '#4ade80'` |

**Replace with**: `rgb(var(--grove-500))` or the appropriate Tailwind grove color token.

### 0C. Shared skeleton shimmer animation

13 curio components each define their own skeleton loading states with static gray rectangles. Create a shared `CurioSkeleton` component or CSS animation that provides a consistent shimmer/pulse effect.

**Scope**: Create the shared utility now, migrate individual components as we touch them during their full treatment.

---

## Phase 1 — Low Complexity (Tier 1)

### 1. Webring

**Plan file**: `docs/plans/planned/curios/07-webring.md`
**Character**: Retro web solidarity — circular navigation between chosen sites.

**What's broken**:

- Only renders "classic" style — 3 other styles in data model ignored
- Hardcoded `#4ade80` everywhere (fixed in Phase 0)
- No ring identity (icon, member count, position)
- Position field ignored

**Full treatment**:

- [ ] Render all 4 styles: classic bar, 88x31 badge, compact, floating
- [ ] Ring identity: icon, member count ("1 of 42"), description on hover
- [ ] Ring accent color per membership (owner-configurable)
- [ ] Position support (footer, header, right-vine, floating)
- [ ] Grove palette throughout
- [ ] Admin: accent color picker, position preview

**Complexity**: LOW — CSS + conditional rendering from existing data

---

### 2. Status Badge

**Plan file**: `docs/plans/planned/curios/10-status-badge.md`
**Character**: Garden signs — wooden/slate signs planted in the soil of your grove.

**What's broken**:

- Gray pills with no character or color system
- Only one visual style — no garden signs, no enamel pins
- Position field ignored (4 positions in model)
- No category grouping
- No edit form (PATCH endpoint exists)

**Full treatment**:

- [ ] 3 badge styles: garden sign (wooden plank), enamel pin (glossy), clean pill (current, improved)
- [ ] Color per badge type — warm defaults, owner-override
- [ ] Position rendering (floating, header, right-vine, footer-vine)
- [ ] Category grouping visual
- [ ] Expanded preset library (construction, seasonal, personal, custom)
- [ ] Auto-trigger support (new post → "Fresh Post" badge auto-appears)
- [ ] Admin: edit form, color picker, style picker

**Complexity**: LOW-MEDIUM — mostly CSS, small admin additions

---

### 3. Activity Status

**Plan file**: `docs/plans/planned/curios/09-activity-status.md`
**Character**: A living indicator — a tiny candle in the window.

**What's broken**:

- No pulse/shimmer animation
- No freshness system (status glow fading over time)
- Flat fallback text
- Unicode symbols render inconsistently

**Full treatment**:

- [ ] Living indicator: shimmer for "doing", muted for "away", warm for "vibes"
- [ ] Freshness system: glow fades over 24h, hover reveals "set 5m ago"
- [ ] Lucide icons replace Unicode symbols
- [ ] Owner-configurable color per status
- [ ] Expanded preset library (creative, social, cozy categories)
- [ ] Custom status with any emoji
- [ ] Admin: expanded presets, color picker per status

**Complexity**: LOW-MEDIUM — CSS animations + minor data enrichment

---

### 4. Now Playing (Quick Fix)

**Plan file**: `docs/plans/planned/curios/03-now-playing.md` (quick portion only)
**Character**: Your music, your way, your story.

**Quick fixes only** (full treatment in Phase 3):

- [ ] Replace hardcoded `#4ade80` equalizer bars with grove CSS var (done in Phase 0)
- [ ] Warm up fallback music note SVG (grove-green instead of plain gray)
- [ ] Warm up fallback text styling

**Complexity**: LOW — CSS swap

---

## Phase 2 — Medium Complexity (Tier 2)

### 5. Hit Counter

**Plan file**: `docs/plans/planned/curios/01-hit-counter.md`
**Character**: Grove-ified retro. Retro shapes, nature palette.

**What's broken**:

- Only classic style renders — 3 other styles ignored
- No label system (presets + custom text)
- No dedup strategy

**Full treatment**:

- [ ] Render all 4 styles: Classic (frosted glass), Odometer (brass flip), LCD (seven-segment), Minimal
- [ ] Label system: presets ("You are visitor", "Wanderer #", etc.) + custom text
- [ ] Since-date display (footnote vs. integrated styles)
- [ ] Count mode: every visit vs. unique daily (SHA-256 dedup)
- [ ] Night mode character per style
- [ ] Entrance animations per style (respecting prefers-reduced-motion)
- [ ] Migration: `hit_counter_visitors` table for dedup, `countMode` + since-date style fields
- [ ] Admin: label presets, count mode toggle, since-date style picker, live preview

**Complexity**: MEDIUM — 4 distinct CSS renderers + migration + dedup logic

---

### 6. Guestbook

**Plan file**: `docs/plans/planned/curios/04-guestbook.md`
**Character**: Mountain lodge book meets coffee shop sticky wall. Two layers: the Room (owner's surface) and the Pen (visitor's expression).

**What's broken**:

- All entries look identical — gray boxes, no individual voice
- No signing styles for visitors
- No color expression
- No wall backing texture

**Full treatment**:

- [ ] 4 wall styles (room): Corkboard, Notebook, Garden wall, Clean glass
- [ ] 5 signing styles (pen): Sticky note, Letter, Postcard, Typewriter card, Leaf
- [ ] Color palette per entry (visitor picks from 8 nature colors)
- [ ] Organic scatter layout (slight rotation, overlap) for cozy/pixel styles
- [ ] Ink/handwriting font option per signing style
- [ ] Pinned entries (owner highlights favorites)
- [ ] Admin: wall style picker, pin/unpin entries

**Complexity**: MEDIUM — visitor-facing form changes + CSS variety + layout engine

---

### 7. Blogroll

**Plan file**: `docs/plans/planned/curios/06-blogroll.md`
**Character**: A declaration of taste — your neighborhood, the corners of the internet you vouch for.

**What's broken**:

- Only one display style (flat list)
- Ignores `lastPostTitle`, `lastPostUrl`, `lastPostDate` from API
- Favicon fallback is empty gray square
- No personal notes, no categories
- No edit form (PATCH exists but no UI)

**Full treatment**:

- [ ] 4 display modes: Warm list (default), Card grid, Compact tiles, 88x31 button wall
- [ ] Show latest post per blog (title, date, link)
- [ ] Personal notes per blog ("Why I read this")
- [ ] Category grouping (owner-defined tags)
- [ ] Warm favicon fallback (first letter in grove-green circle)
- [ ] RSS auto-fetch wiring (feed URL → latest post)
- [ ] OPML import/export
- [ ] Admin: edit form, category management, display mode picker, import/export

**Complexity**: MEDIUM — multiple display modes + RSS integration + admin forms

---

### 8. Mood Ring

**Plan file**: `docs/plans/planned/curios/02-mood-ring.md`
**Character**: Mystical artifact — liquid aurora trapped in crystal.

**What's broken**:

- Public component ignores `displayStyle` — always renders plain 2rem circle
- Crude `{color}22` fill instead of glow/translucency
- Time mode snaps between 7 colors (no interpolation)
- Random mode changes every ~10s (jarring)
- Uses own season logic instead of Grove's

**Full treatment**:

- [ ] 7 display shapes: Ring, Gem, Orb, Crystal, Flame, Leaf, Moon
- [ ] Aurora animated gradient effect per shape
- [ ] Smooth color interpolation for time-based mode
- [ ] Mood-mapped color palettes (5 schemes × 5 moods)
- [ ] Optional dot constellation mood log (public display)
- [ ] Fix random mode → slow continuous drift
- [ ] Fix seasonal mode → use Grove's season system
- [ ] Proper glow/shadow/glass effects
- [ ] prefers-reduced-motion: static gradient, no animation
- [ ] Admin: 7-shape picker, mood vocabulary, mood log toggle

**Complexity**: MEDIUM-HIGH — 7 shapes with unique CSS + interpolation math + animation system

---

### 9. Polls

**Plan file**: `docs/plans/planned/curios/13-polls.md`
**Character**: Community voice — the town square question box.

**What's broken**:

- **No voting UI at all** — component is read-only
- Type mismatch on `resultsVisibility`
- No description rendered
- `rgba(0,0,0,0.02)` backgrounds

**Full treatment**:

- [ ] Voting UI: clickable glass chip options, "Cast vote" confirm
- [ ] Vote-then-reveal animation (bars grow from 0, numbers tick up)
- [ ] Pre-vote ghost bars (~5% opacity hint)
- [ ] 3 container styles: glass card, bulletin board pin, clean minimal
- [ ] Rich options: emoji + color per option
- [ ] Multiple choice support (checkbox-style)
- [ ] Results visibility: live, after vote, after close, hidden
- [ ] Inline embed in blog posts (`[curio:poll:id]`)
- [ ] Grove-green glass result bars with nature fill
- [ ] Admin: poll builder with options, style picker, close/archive

**Complexity**: MEDIUM-HIGH — full interactive voting flow + animation + embed system

---

### 10. Badges

**Plan file**: `docs/plans/planned/curios/05-badges.md`
**Character**: Glass ornaments — translucent, precious, catches the light.

**What's broken**:

- 24px pills with no collectible feel
- No showcase vs. collection distinction
- Rarity colors are generic (gray/green/blue)
- No hover detail, no empty state personality

**Full treatment**:

- [ ] Glass ornament badges: frosted glass panes with icon + label
- [ ] Category shapes: rectangle (retro), shield/heart (pride), leaf/circle (nature), star/medal (achievement)
- [ ] 3 size options: small (48-64px), medium (80-96px), large (120-140px)
- [ ] Showcase shelf (featured badges, glass case effect)
- [ ] Rarity glow: common (bark), uncommon (leaf), rare (sky), epic (amethyst), legendary (amber)
- [ ] Hover detail card: description + earned date + rarity
- [ ] Pre-built badge library: retro web, pride & identity, seasonal, achievements
- [ ] Badge wall/grid display (replace pill row)
- [ ] Custom badge upload via Custom Uploads
- [ ] Admin: size picker, showcase management, custom badge builder

**Complexity**: MEDIUM-HIGH — new rendering system + badge library + showcase

---

### 11. Ambient

**Plan file**: `docs/plans/planned/curios/16-ambient.md`
**Character**: The atmosphere engine — turns a page into a room.

**What's broken**:

- Sound set mismatch (type system ≠ component)
- No actual audio files
- Characterless button
- No sound label, no visitor volume control
- No visualization, no crossfade, no seasonal logic, no localStorage persistence

**Full treatment**:

- [ ] Fix sound set mapping (align type system with component)
- [ ] Audio files: source/create ambient loops for all 7 sets
- [ ] Warm button with sound wave animation when playing
- [ ] Sound label on hover/tap (what's playing)
- [ ] Visitor volume slider (remembers via localStorage)
- [ ] Play state persistence (localStorage)
- [ ] Crossfade between sounds (300ms)
- [ ] Seasonal mode: auto-select sound based on Grove season
- [ ] Visual feedback: subtle sound wave or breathing circle
- [ ] Admin: sound preview in selector

**Complexity**: MEDIUM — mostly wiring + UI but audio sourcing is a blocker

---

### 12. Shelves (Bookmark Shelf + Link Garden merge)

**Plan file**: `docs/plans/planned/curios/11-shelves.md` + `08-link-garden-merged.md`
**Character**: Beautiful furniture for your favorite things.

**What's broken**:

- Book-only field assumptions ("Reading" badge)
- No physical shelf visual
- No spine view for missing covers
- One display mode only
- Link Garden exists separately but should merge in

**Full treatment**:

- [ ] Universal preset system: Books, Music, Movies, Games, Recipes, Tools, Links
- [ ] Each preset: custom field labels, status labels, category defaults
- [ ] Physical shelf visual: wood grain line, shadow, sense of furniture
- [ ] Spine view: colored book spines when no cover image
- [ ] 5 display modes: Shelf (physical), Grid (cards), List (compact), Buttons (88x31), Marquee (scrolling)
- [ ] Library page: auto-appears at `/library` when 3+ shelves exist
- [ ] Smart fetch: auto-pull metadata from URL (Open Graph, ISBN)
- [ ] Link Garden migration: map existing data to Shelves "Links" preset
- [ ] Admin: preset picker, edit forms, reorder UI, cover auto-fetch

**Complexity**: MEDIUM-HIGH — universal system + migration + multiple display modes

---

## Phase 3 — High Complexity (Tier 3)

### 13. Now Playing (Full Treatment)

**Plan file**: `docs/plans/planned/curios/03-now-playing.md`
**Character**: Every style is a different room — record shop, late-night radio booth, living room stereo, boombox on a stoop.

**What's needed**:

- [ ] 8 display styles: Compact, Card, Vinyl (spinning record), Minimal, Cassette, Radio, Boombox, Hum Card
- [ ] Each style is a fully realized component with unique animation
- [ ] Hum Card integration: render actual HumCard component from engine
- [ ] Personal touch fields: "Why I'm listening", "Where I found this", genre tags
- [ ] History display: timeline or scatterplot of recent listens
- [ ] Provider integration: Spotify API, Last.fm API (currently stubs)

**Complexity**: HIGH — 8 distinct component renderers + API integrations

---

### 14. Cursors

**Plan file**: `docs/plans/planned/curios/15-cursors.md`
**Character**: Enchanted forest meets cozy companion — a leaf drifting after your mouse.

**What's needed**:

- [ ] Build SVGs for all 13+ presets (only 3 exist: leaf, paw, star)
- [ ] Cursor categories: Nature, Whimsical, Classic, Seasonal, Cozy
- [ ] Subtle animation: butterfly wings, candle flicker, leaf sway
- [ ] Trail canvas rendering (currently a comment)
- [ ] Trail effects: sparkle trail, leaf trail, fade trail
- [ ] Seasonal mode: auto-swap based on Grove season
- [ ] prefers-reduced-motion check
- [ ] Custom URL sanitization
- [ ] Admin: trail effect picker, seasonal toggle

**Complexity**: HIGH — SVG creation + canvas rendering + animation system

---

### 15. Custom Uploads

**Plan file**: `docs/plans/planned/curios/18-custom-uploads.md`
**Character**: The invisible backbone powering all curio images.

**What's needed**:

- [ ] Upload dropzone UI (drag-and-drop + file picker)
- [ ] Wire `imageProcessor.ts` (exists but unused): auto-resize, EXIF strip, thumbnail gen
- [ ] Wire `upload-validation.ts` (exists but unused): magic byte checking, strategy detection
- [ ] Actual R2 upload (POST currently creates DB record but doesn't upload)
- [ ] Actual R2 delete (DELETE removes DB record but not R2 objects)
- [ ] Upload Picker shared component (for badges, shrines, cursors, etc.)
- [ ] Category tags, search/filter
- [ ] Usage count tracking (which curios use which uploads)
- [ ] Admin: dropzone, gallery view with metadata, usage tracking

**Complexity**: HIGH — R2 pipeline wiring + shared picker component

---

### 16. Clip Art

**Plan file**: `docs/plans/planned/curios/17-clip-art.md`
**Character**: Decorative flair — critters, borders, sparkles on your pages.

**What's needed**:

- [ ] Build `CurioClipArt.svelte` from scratch
- [ ] Positioned overlay rendering system (absolute/relative to page content)
- [ ] Asset library: create/curate clip art assets that ship with Grove
- [ ] Animated options: butterflies, falling leaves
- [ ] Page-targeting: clip art placed per page path
- [ ] Respect z-index so overlays don't block content

**Complexity**: HIGH — new component + asset creation + positioning system

---

### 17. Shrines

**Plan file**: `docs/plans/planned/curios/14-shrines.md`
**Character**: Sacred spaces for things you love — the most emotionally powerful curio.

**What's needed**:

- [ ] Build `CurioShrines.svelte` from scratch (no public component exists)
- [ ] Spatial canvas renderer: position items at x/y coordinates within a frame
- [ ] Content editor: simple mode (templates) + advanced mode (drag-and-drop)
- [ ] 8 content item types: image, text, date, icon, decoration, embed, music, quote
- [ ] 5+ frame styles: wood, stone, crystal, floral, cosmic (CSS borders)
- [ ] 6 shrine types: memorial, fandom, gratitude, collection, mood board, free form
- [ ] 3 sizes: small, medium, large
- [ ] Publish/draft toggle

**Complexity**: VERY HIGH — spatial editor + renderer + 8 item types + frame system

---

### 18. Artifacts

**Plan file**: `docs/plans/planned/curios/12-artifacts.md`
**Character**: A personal cabinet of curiosities — silly toys, personal talismans, chaos objects.

**What's needed**:

- [ ] Replace "Coming soon" placeholder with actual artifact components
- [ ] 21 artifact types, each a self-contained component:
  - Oracular: Magic 8-Ball, Fortune Cookie, Tarot Card, Crystal Ball
  - Games: Dice Roller, Coin Flip, Slot Machine, Rock-Paper-Scissors
  - Atmospheric: Candle, Hourglass, Snow Globe, Lava Lamp, Music Box
  - Retro: Blink New, Rainbow Divider, Marquee Text, Under Construction, Visitor Map
  - Legendary: Glass Cathedral
- [ ] Each artifact: unique visual, interaction, animation
- [ ] Daily seeding for oracular artifacts (consistent per day)
- [ ] Optional glass card container for unified look
- [ ] Placement system (sidebar, floating, inline)

**Complexity**: VERY HIGH — 21 individual mini-components

---

## Status Key

- **Not started**: No work begun
- **In progress**: Active development
- **PR open**: Code written, review needed
- **Shipped**: Merged to main

| Phase | Item                | Status                                                            |
| ----- | ------------------- | ----------------------------------------------------------------- |
| 0A    | Shared `.sr-only`   | Shipped                                                           |
| 0B    | Hardcoded `#4ade80` | Shipped                                                           |
| 0C    | Skeleton shimmer    | In progress — utility defined, components adopt during their wave |
| 1     | Webring             | Not started                                                       |
| 2     | Status Badge        | Not started                                                       |
| 3     | Activity Status     | Not started                                                       |
| 4     | Now Playing (quick) | Not started                                                       |
| 5     | Hit Counter         | Not started                                                       |
| 6     | Guestbook           | Not started                                                       |
| 7     | Blogroll            | Not started                                                       |
| 8     | Mood Ring           | Not started                                                       |
| 9     | Polls               | Not started                                                       |
| 10    | Badges              | Not started                                                       |
| 11    | Ambient             | Not started                                                       |
| 12    | Shelves             | Not started                                                       |
| 13    | Now Playing (full)  | Not started                                                       |
| 14    | Cursors             | Not started                                                       |
| 15    | Custom Uploads      | Not started                                                       |
| 16    | Clip Art            | Not started                                                       |
| 17    | Shrines             | Not started                                                       |
| 18    | Artifacts           | Not started                                                       |
