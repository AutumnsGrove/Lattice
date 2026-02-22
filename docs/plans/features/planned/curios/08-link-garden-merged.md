---
title: "Curio: Link Garden (Merged into Shelves)"
status: planned
category: features
---

# Curio: Link Garden (Merged into Shelves)

> Extracted from Curio Safari expedition plan. Agent-handoff ready.
> **Safari status**: Merged into Shelves
> **Source**: `docs/plans/planned/curio-safari.md`, Section 8

---

**Status**: MERGED INTO SHELVES (Section 11)

**Character**: Link Garden was a curated link collection — personal directories of the internet's best spots. After consultation with Hailu (Arusha village, link curation expert with 10,000+ hand-selected links), we determined that Link Garden and Shelves are fundamentally the same furniture: _containers of items with URLs, titles, descriptions, and categories_. The difference is richness, not kind.

**Decision**: Link Garden merges into Shelves as a **Links preset**. All unique Link Garden features (88×31 buttons, marquee scroll, auto-favicon, lightweight items) are absorbed into the Shelves system. Some features (88×31, marquee, auto-favicon, smart fetch) become universally available to all shelf presets.

### What existed (2,468 lines, 9 files)

- **Migration 061**: `link_gardens` + `link_garden_items` tables
- **Shared lib**: 273 lines — types, 4 styles (list/grid/buttons/marquee), validation, sanitization
- **Public component**: 291 lines — fetches from `/api/curios/linkgarden`, renders list/grid layouts
- **Admin**: 672 lines — full CRUD for gardens and links
- **API**: 571 lines — public GET, admin CRUD across 3 route files
- **Tests**: 274 lines — 42 tests covering all utilities

### What carries over to Shelves

#### New preset: Links

| Field                 | Value                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| **Creator label**     | Source                                                                 |
| **Category defaults** | Owner-defined (no presets)                                             |
| **Status 1**          | Featured                                                               |
| **Status 2**          | Favorite                                                               |
| **Default display**   | Grid                                                                   |
| **Category grouping** | Optional, off by default — owner toggles "group by category" per shelf |

#### New display modes (available to ALL presets)

| Mode                | Visual                                                                                                                                                                             | Best for                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Buttons (88×31)** | Classic web button wall. Items display as 88×31 pixel images in a tight grid. Items without a thumbnail show a auto-generated text button.                                         | Links with retro web energy. But also: any shelf where the owner wants that aesthetic. |
| **Marquee**         | Horizontally scrolling strip of items. Smooth CSS animation. Pauses on hover/focus. Becomes static horizontal list with `prefers-reduced-motion`. Screen readers see a plain list. | Links, album names, short collections. Nostalgia mode for any shelf.                   |

**Marquee controls (owner-configurable):**

- Speed: slow (default) / medium / fast
- Direction: left-to-right (default) / right-to-left
- Pauses on hover/focus (always)
- Static fallback for `prefers-reduced-motion` (always)

#### New field: Thumbnail (all presets)

A general-purpose small secondary image field on all shelf items. Replaces Link Garden's `button_image_url`. Uses:

- **Buttons display mode**: The 88×31 button image
- **List/grid modes**: Optional small icon alongside the item (like a favicon)
- **Cover image takes precedence** in modes that use covers — thumbnail is the _small_ image

Auto-favicon (Google favicon service) is available as a fallback for any shelf item with a URL and no thumbnail. On by default for Links preset, off by default for others.

#### Smart fetch via Lumen/Shutter (universal, opt-in)

**Any shelf item** with a URL can use "Fetch from URL" — a button next to the URL field that auto-populates:

- Title (from `<title>` or OG title)
- Description (from meta description or OG description)
- Cover image (from OG image)
- Thumbnail/favicon (from favicon)
- Creator/source (from site name or OG site_name)

**How it works**: Calls Lumen's Shutter service to scrape metadata. Owner clicks the button explicitly — it's never automatic. Fetched data pre-fills the form but owner can edit before saving. Prevents unwanted overwrites.

**Links preset UX**: The add-item form shows URL only by default. After pasting a URL, the owner can either:

1. Click "Fetch details" to auto-fill everything, or
2. Expand progressive disclosure to manually enter title, description, category, etc.

This makes adding links feel as lightweight as Link Garden was — paste, fetch, done.

#### Category grouping (all presets, optional)

Category field already exists on shelf items. New per-shelf toggle: **"Group by category"**.

- **Off (default)**: Items display in sort order, categories shown as labels but no grouping.
- **On**: Items grouped under category headers within the shelf. Empty-category items appear in an "Uncategorized" group at the end.

### What gets removed

- [ ] **Delete `/arbor/curios/linkgarden/` admin route** — Shelves admin handles everything
- [ ] **Delete `/api/curios/linkgarden/` API routes** — Shelves API handles everything
- [ ] **Delete `CurioLinkgarden.svelte`** — Shelves component renders Links preset
- [ ] **Delete `src/lib/curios/linkgarden/` shared lib** — types/validation absorbed into bookmarkshelf lib
- [ ] **Remove `linkgarden` from curio-status registry** and markdown directives
- [ ] **Drop `link_gardens` and `link_garden_items` tables** — fresh start, no data migration (curio is new enough that no production data exists worth preserving)
- [ ] **Update `:::linkgarden` directive** to render as `:::bookmarkshelf` (or just remove it)

### Updated Shelves display mode table (complete)

With the absorption, Shelves now has **6 display modes**:

| Mode                | Visual                                                                    | Best for                 |
| ------------------- | ------------------------------------------------------------------------- | ------------------------ |
| **Spines**          | Colored spines in a row on a shelf. Title text vertical. Click to expand. | Books, zines, comics     |
| **Cover grid**      | Grid of cover images, title on hover. Pinterest energy.                   | Albums, movies, games    |
| **Card list**       | Vertical cards with cover, title, creator side by side.                   | Recipes, tools, articles |
| **Poster wall**     | Large covers in masonry layout. Statement pieces.                         | Movies, art prints       |
| **Buttons (88×31)** | Classic web button wall. Tight grid of small images.                      | Links, retro collections |
| **Marquee**         | Horizontally scrolling strip. Pauses on hover. Speed configurable.        | Links, short collections |

### Updated Shelves preset table (complete)

| Preset             | Creator label      | Category defaults                                                            | Status 1          | Status 2      | Default display |
| ------------------ | ------------------ | ---------------------------------------------------------------------------- | ----------------- | ------------- | --------------- |
| **Books**          | Author             | Fiction, Non-Fiction, Technical, Poetry, Zines, Comics, Essays, Memoir       | Currently Reading | Favorite      | Spines          |
| **Music / Albums** | Artist             | Rock, Electronic, Jazz, Hip-Hop, Folk, Classical, Ambient, Soundtrack        | Now Playing       | Favorite      | Cover grid      |
| **Movies & Shows** | Director / Creator | Drama, Comedy, Horror, Sci-Fi, Documentary, Animation, Thriller              | Watching          | Favorite      | Poster grid     |
| **Games**          | Studio             | RPG, Platformer, Puzzle, Strategy, Simulation, Adventure, Indie, Multiplayer | Playing           | Favorite      | Cover grid      |
| **Recipes**        | Creator / Source   | Breakfast, Lunch, Dinner, Dessert, Snack, Drink, Baking, Comfort Food        | Want to Make      | Favorite      | Card list       |
| **Links**          | Source             | (owner-defined)                                                              | Featured          | Favorite      | Grid            |
| **Custom**         | (you name it)      | (you define them)                                                            | (you name it)     | (you name it) | (you pick)      |

---
