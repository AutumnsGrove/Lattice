---
title: "Curio: Shelves"
status: planned
category: features
---

# Curio: Shelves

> Extracted from Curio Safari expedition plan. Agent-handoff ready.
> **Safari status**: Full treatment
> **Source**: `docs/plans/planned/curio-safari.md`, Section 11

---

**Character**: Beautiful furniture for your favorite things. Books, albums, movies, games, recipes, tools — whatever you treasure enough to display. The artisan doesn't care what goes on the shelf. He cares that the shelf is _worthy_ of holding it. A shelf is a shelf. You put what you love on it.

**Emergent system**: When you have 3+ shelves, a **Library** page automatically appears — a dedicated `/library` route where all your shelves live together in one room. The profile shows a preview (1-2 featured shelves), the Library shows everything. The Library's vibe is owner-configurable: warm wood library, cabinet of curiosities, or something else entirely.

### Safari findings: What exists today

**1,593 lines across 9 files** — the bones are solid but book-locked.

**Public component** (`CurioBookmarkshelf.svelte`, 340 lines):

- [x] Fetches from `/api/curios/bookmarkshelf`, renders shelves with nested bookmarks
- [x] Grid layout with cover images (6rem tall), titles, author names
- [x] "Reading" (blue) and "Favorite" (pink) status badges
- [x] Loading skeleton, error state, empty state handling
- [x] Dark mode support, hover lift on cards
- [ ] **One display mode only** — everything is the same flat card grid
- [ ] **No shelf visual** — no shelf line, no wood grain, no sense of furniture
- [ ] **No spine view** — when cover is missing, just an empty placeholder div
- [ ] **Book-only field assumptions** — "Reading" badge only makes sense for books

**Shared lib** (`src/lib/curios/bookmarkshelf/index.ts`, 177 lines):

- Types: `ShelfRecord`, `BookmarkRecord`, `ShelfDisplay`, `BookmarkDisplay`
- Fields per item: url, title, author, description, coverUrl, category, isCurrentlyReading, isFavorite, sortOrder
- 8 hardcoded literary categories: Fiction, Non-Fiction, Technical, Poetry, Zines, Comics, Essays, Tutorials
- Limits: 50 shelves/tenant, 200 char titles, 100 char authors, 500 char descriptions, 2048 char URLs
- Sanitization: HTML stripping, length enforcement, URL validation (http/https only)
- ID format: `shelf_{timestamp36}_{random}` / `bm_{timestamp36}_{random}`

**Admin** (`/arbor/curios/bookmarkshelf/`, 243 + 321 lines):

- [x] Add/delete shelves with name + description
- [x] Add bookmarks with title, URL, author, description, category dropdown, reading/favorite toggles
- [x] Delete individual bookmarks
- [x] GlassCard layout, toast feedback
- [ ] **No edit UI** — PATCH endpoints exist but no forms to use them
- [ ] **No reordering UI** — sort_order fields exist but no drag-and-drop
- [ ] **No cover image auto-fetch** — coverUrl is manual URL entry only

**API** (3 route files, ~490 lines total):

- `GET /api/curios/bookmarkshelf` — public, 2-min cache + 4-min stale-while-revalidate
- `POST /api/curios/bookmarkshelf` — create shelf (admin)
- `PATCH/DELETE /api/curios/bookmarkshelf/shelves/[id]` — update/delete shelf (admin)
- `PATCH/DELETE /api/curios/bookmarkshelf/bookmarks/[id]` — update/delete bookmark (admin)

**Database** (migration 071, 2 tables):

- `bookmark_shelves`: id, tenant_id, name, description, sort_order, created_at
- `bookmarks`: id, tenant_id, shelf_id, url, title, author, description, cover_url, category, is_currently_reading, is_favorite, sort_order, added_at
- Cascade deletes: tenant → shelves → bookmarks

### Design spec (safari-approved)

#### Philosophy: The shelf serves the object

A book shelf and an album shelf shouldn't look the same, because books and albums aren't the same. But they should feel like they belong in the same room. The shelf _tells you something_ about what's on it before you even look.

The preset changes the _language_ — author becomes artist, category becomes genre, "currently reading" becomes "currently playing" — but the _structure_ stays the same. Every shelf has: items with titles, creators, images, statuses, notes. What those fields are _called_ and how they _display_ is what makes a book shelf different from a vinyl shelf.

#### Smart presets + fully custom

Each preset pre-configures field labels, categories, status badges, and default display mode. Custom shelves let you define everything yourself.

| Preset             | Creator label      | Category defaults                                                            | Status 1          | Status 2      | Default display |
| ------------------ | ------------------ | ---------------------------------------------------------------------------- | ----------------- | ------------- | --------------- |
| **Books**          | Author             | Fiction, Non-Fiction, Technical, Poetry, Zines, Comics, Essays, Memoir       | Currently Reading | Favorite      | Spines          |
| **Music / Albums** | Artist             | Rock, Electronic, Jazz, Hip-Hop, Folk, Classical, Ambient, Soundtrack        | Now Playing       | Favorite      | Cover grid      |
| **Movies & Shows** | Director / Creator | Drama, Comedy, Horror, Sci-Fi, Documentary, Animation, Thriller              | Watching          | Favorite      | Poster grid     |
| **Games**          | Studio             | RPG, Platformer, Puzzle, Strategy, Simulation, Adventure, Indie, Multiplayer | Playing           | Favorite      | Cover grid      |
| **Recipes**        | Creator / Source   | Breakfast, Lunch, Dinner, Dessert, Snack, Drink, Baking, Comfort Food        | Want to Make      | Favorite      | Card list       |
| **Links**          | Source             | (owner-defined)                                                              | Featured          | Favorite      | Grid            |
| **Custom**         | (you name it)      | (you define them)                                                            | (you name it)     | (you name it) | (you pick)      |

The preset is a _starting point_. After creating a shelf from a preset, the owner can rename any label, add/remove categories, change display mode. The preset doesn't lock you in.

#### Display modes (owner's choice per shelf)

Each shelf can be displayed differently. One shelf shows spines, another shows cards, another shows a poster grid. The content suggests its form.

| Mode                | Visual                                                                                                                                            | Best for                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Spines**          | Items displayed as colored spines in a row on a shelf. Title text runs vertically. Pull one out (click) to see details.                           | Books, zines, comics. The classic bookshelf.                    |
| **Cover grid**      | Grid of cover images with title overlay on hover. Pinterest/Letterboxd energy.                                                                    | Albums, movies, games. Visual-first content.                    |
| **Card list**       | Vertical stack of cards with cover image, title, creator, description side by side.                                                               | Recipes, tools, articles. Information-dense content.            |
| **Poster wall**     | Large cover images in a masonry-ish layout. Statement pieces.                                                                                     | Movies, art prints, hero images. Gallery energy.                |
| **Buttons (88×31)** | Classic web button wall. Items as 88×31 pixel images in a tight grid. Auto-generated text button if no thumbnail.                                 | Links, retro web collections. Any shelf wanting that aesthetic. |
| **Marquee**         | Horizontally scrolling strip. Pauses on hover/focus. Static with `prefers-reduced-motion`. Owner controls speed (slow/medium/fast) and direction. | Links, short collections, nostalgia mode.                       |

#### Shelf materials (owner picks per shelf)

The shelf itself is furniture. What it's made of says something.

| Material            | Visual                                                                                  | Feel                                                                     |
| ------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Warm wood**       | Visible grain texture, warm brown tones, subtle depth shadow. Bracket supports visible. | Classic bookshelf. Library warmth. The default.                          |
| **Frosted glass**   | Grove glassmorphism. Items float on a translucent surface. Blurred depth beneath.       | Modern, clean, ties into the glass system. For vinyl or art.             |
| **Dark metal**      | Sleek industrial shelf. Thin lines, cool tones, precise.                                | Tools, tech, games. Functional beauty.                                   |
| **Natural stone**   | Warm gray with subtle texture. Heavy, grounded, museum pedestal energy.                 | Artifacts, treasures, things with weight.                                |
| **None / floating** | Items just... are. No visible shelf surface. They exist in space.                       | Minimal. For people who want the content without the furniture metaphor. |

#### Item texture (rating + notes, both optional)

Same texture layer pattern as Now Playing. Some items get a star, some get a love letter, some just sit there and look pretty.

- **Rating**: 1-5 stars (or hearts, or leaves — owner picks the icon). Optional per item.
- **Personal note**: Free text, max ~500 chars. "This changed how I think about cooking" / "Read this in one sitting on a train to Portland" / "The soundtrack is better than the game." Expandable on click/tap.
- **Both are optional per item** — the default is neither. You add texture when you feel like it.

#### Spine view: When there's no cover image

In spine mode, items without cover images aren't blank — they show a colored "spine" with:

- Title text running vertically (or horizontally if short)
- Spine color auto-assigned from a warm palette (or chosen by owner per item)
- Slightly varied heights for organic feel (like real books on a real shelf)
- Pull a spine (click/tap) → expand to detail card showing all metadata

#### The Library (emergent at 3+ shelves)

When a tenant has 3+ shelves, a `/library` route auto-generates:

- **Profile curio**: Shows 1-2 "featured" shelves inline (owner picks which ones to feature). A warm "Visit my library" link appears below.
- **Library page** (`/library`): All shelves displayed in their chosen modes, organized by the owner's sort order.
- **Library atmosphere** (owner-configurable):

| Atmosphere                 | Feel                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------- |
| **Warm library**           | Wood paneling, warm light, organized sections. The library with leather chairs.       |
| **Cabinet of curiosities** | Eclectic, personal, surprising. Each shelf is a different world. Wunderkammer energy. |
| **Clean gallery**          | White walls, breathing room, each shelf as an exhibit. Museum meets home.             |

- **Shelf navigation**: If 5+ shelves, add a small table of contents / sidebar for jumping between shelves.
- **Library is optional**: Owner can disable the auto-generated page if they prefer shelves only as inline curios.

### Public component fixes

- [ ] **Generalize from books to "anything"** — field labels driven by shelf preset, not hardcoded
- [ ] **Implement all 6 display modes** (spines, cover grid, card list, poster wall, 88×31 buttons, marquee) — see Section 8 for absorption details
- [ ] **Implement shelf materials** (wood, glass, metal, stone, floating) with actual visual treatment
- [ ] **Spine view**: colored spines with vertical title text, varied heights, click-to-expand
- [ ] **Cover grid**: hover to reveal title/creator, click for detail card
- [ ] **Buttons (88×31) view**: tight grid of 88×31 pixel images. Auto-generated text button when no thumbnail. Absorbed from Link Garden.
- [ ] **Marquee view**: horizontal scroll strip, pauses on hover/focus, static with `prefers-reduced-motion`, owner speed control (slow/medium/fast), direction (LTR/RTL). Absorbed from Link Garden.
- [ ] **Item detail expansion**: click any item to see full metadata, notes, rating
- [ ] **Rating display**: stars/hearts/leaves with owner's chosen icon
- [ ] **Personal notes**: expandable on click, warm styling
- [ ] **Status badges**: dynamic labels from preset ("Reading" / "Playing" / "Watching" / "Featured" / custom)
- [ ] **Category grouping toggle**: per-shelf "Group by category" option. Off by default. When on, items grouped under category headers.
- [ ] **Thumbnail display**: show item thumbnails (favicon-sized) in list/grid modes when available. Auto-favicon from Google service for items with URLs (on by default for Links preset, off for others).
- [ ] **Warm empty state per shelf type**: "The shelf awaits..." with contextual illustration
- [ ] **Replace hardcoded rgba colors** with grove palette
- [ ] **Respect `prefers-reduced-motion`**: no hover lifts, instant transitions, marquee becomes static

### Library page fixes

- [ ] **Build `/library` route** — auto-generated when tenant has 3+ shelves
- [ ] **Featured shelf selection** in admin (which 1-2 shelves appear on profile curio)
- [ ] **Library atmosphere picker** (warm library / cabinet / clean gallery)
- [ ] **Shelf navigation** sidebar/TOC for 5+ shelves
- [ ] **"Visit my library" link** on profile curio when Library exists
- [ ] **Library disable toggle** — owner can opt out of the auto-generated page

### API fixes

- [ ] **Generalize field labels**: Add `preset` field to shelf (books/music/movies/games/recipes/links/custom)
- [ ] **Custom field labels**: Add `creatorLabel`, `status1Label`, `status2Label` to shelf config
- [ ] **Custom categories**: Allow owner-defined categories per shelf (not just the 8 literary defaults)
- [ ] **Category grouping**: Add `group_by_category INTEGER DEFAULT 0` to shelf config
- [ ] **Rating field**: Add `rating` (INTEGER 1-5, nullable) to bookmarks
- [ ] **Personal note field**: Add `note` (TEXT, max 500 chars) to bookmarks
- [ ] **Display mode field**: Add `display_mode` to shelf — expanded to 6 modes: "spines" | "cover-grid" | "card-list" | "poster-wall" | "buttons" | "marquee"
- [ ] **Marquee config**: Add `marquee_speed TEXT DEFAULT 'slow'` and `marquee_direction TEXT DEFAULT 'ltr'` to shelf config
- [ ] **Material field**: Add `material` to shelf ("wood" | "glass" | "metal" | "stone" | "floating")
- [ ] **Thumbnail field**: Add `thumbnail_url` to bookmarks — general small image (favicon, 88×31 button, icon). Separate from `cover_url`.
- [ ] **Auto-favicon toggle**: Add `auto_favicon INTEGER DEFAULT 0` to shelf config (default 1 for Links preset)
- [ ] **Featured flag**: Add `is_featured` to shelf (for Library preview on profile)
- [ ] **Smart fetch endpoint**: New API route that accepts a URL and returns scraped metadata (title, description, OG image, favicon, site name) via Lumen/Shutter. Used by "Fetch from URL" button in admin.
- [ ] **Track URL for Hum integration**: If an item has a music URL, could render a mini Hum card in detail view

### Admin fixes

- [ ] **Shelf creation wizard**: Pick preset → get smart defaults → customize from there
- [ ] **Per-shelf display mode picker** with visual previews
- [ ] **Per-shelf material picker** with visual previews
- [ ] **Edit bookmark form** — wire up existing PATCH endpoints to actual UI
- [ ] **Drag-and-drop reorder** for shelves and items within shelves
- [ ] **"Fetch from URL" button** — opt-in smart fetch via Lumen/Shutter. Paste URL, click fetch, auto-populate title/description/cover/thumbnail/creator. Universal across all presets.
- [ ] **Links preset lightweight form** — add-item shows URL only by default, progressive disclosure for title/description/category/notes. "Fetch details" button auto-fills from URL.
- [ ] **Cover image auto-fetch** from URL (Open Graph) or upload via Custom Uploads picker
- [ ] **Rating input** (clickable stars/hearts/leaves)
- [ ] **Personal note textarea** per item
- [ ] **Featured shelf toggle** (for Library profile preview)
- [ ] **Library atmosphere picker** in a new "Library Settings" section
- [ ] **Custom category management** per shelf (add/remove/rename)

### Migration needs

- [ ] New columns on `bookmark_shelves`:
  - `preset TEXT DEFAULT 'custom'` — books, music, movies, games, recipes, links, custom
  - `display_mode TEXT DEFAULT 'cover-grid'` — spines, cover-grid, card-list, poster-wall, buttons, marquee
  - `material TEXT DEFAULT 'wood'` — wood, glass, metal, stone, floating
  - `creator_label TEXT DEFAULT 'Author'` — custom label for the creator field
  - `status1_label TEXT DEFAULT 'In Progress'` — custom label for status 1
  - `status2_label TEXT DEFAULT 'Favorite'` — custom label for status 2
  - `is_featured INTEGER DEFAULT 0` — appears on profile Library preview
  - `group_by_category INTEGER DEFAULT 0` — group items under category headers
  - `auto_favicon INTEGER DEFAULT 0` — auto-generate favicon for items with URLs (default 1 for Links preset)
  - `marquee_speed TEXT DEFAULT 'slow'` — slow, medium, fast (only used in marquee mode)
  - `marquee_direction TEXT DEFAULT 'ltr'` — ltr, rtl (only used in marquee mode)
- [ ] New columns on `bookmarks`:
  - `rating INTEGER` — 1-5, nullable
  - `note TEXT` — personal note, max 500 chars
  - `thumbnail_url TEXT` — small secondary image (favicon, 88×31 button, icon). Separate from cover_url.
- [ ] Drop Link Garden tables (fresh start):
  - `DROP TABLE IF EXISTS link_garden_items`
  - `DROP TABLE IF EXISTS link_gardens`
- [ ] New table `library_config`:
  - `tenant_id TEXT PRIMARY KEY` — FK to tenants
  - `atmosphere TEXT DEFAULT 'warm-library'` — warm-library, cabinet, clean-gallery
  - `enabled INTEGER DEFAULT 1` — owner can disable auto-generated Library
  - `rating_icon TEXT DEFAULT 'star'` — star, heart, leaf

### Renaming consideration

The curio is currently called "bookmarkshelf" everywhere — file names, route paths, DB tables, API routes. A full rename to "shelves" would be a significant migration. Options:

- **Keep internal name as `bookmarkshelf`**, update display name to "Shelves" in UI only
- **Rename everything** — files, routes, tables — in a dedicated migration (high churn, clean result)
- **New system alongside** — build "Shelves" as a new curio, migrate data from bookmarkshelf, deprecate old

This is a decision for implementation time, not safari time. Noted for future.
