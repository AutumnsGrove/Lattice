---
title: Canopy — Wanderer Directory
description: 'Opt-in directory where wanderers list themselves for others to discover'
category: specs
specCategory: content-community
icon: book-user
lastUpdated: '2026-02-08'
aliases: []
tags:
  - discovery
  - community
  - directory
  - landing
---

# Canopy — The Visible Grove

```
                         ☀️  ☀️  ☀️
                    ═══════════════════════
                       from up here,
                    every tree is visible.
                    ═══════════════════════

        🌲    🌳    🌲    🌳    🌲    🌳    🌲
       ╔══╗       ╔══╗              ╔══╗
       ║hi║       ║  ║              ║  ║
       ╚══╝       ╚══╝              ╚══╝
      opted in   opted in          opted in

                 some stay below.
                 that's okay too.
```

> *See who's growing here.*

Grove's opt-in wanderer directory. Browse who's here, discover other writers, and find your people — without algorithms, without ranking, without performance metrics. Just trees, reaching up, visible to anyone who looks.

**Public Name:** Canopy
**Internal Name:** GroveDirectory
**Domain:** `grove.place/canopy`
**Location:** Landing app (`packages/landing/`)

The canopy is what you see when you look at a forest from above. Every tree's crown is visible — distinct shapes, different colors, each one reaching toward the light in its own way. Canopy is the first rung of discovery: before Forests group people by interest, before Meadow lets you follow their words, Canopy simply shows you who's here.

---

## Overview

Canopy is a public directory page on the Landing site (`grove.place/canopy`) that lists every wanderer who has opted in. It pulls from the shared `grove-engine-db` D1 database, joining tenant and settings data to render a browseable, filterable grid of Grove members.

### The Discovery Trilogy

```
  Canopy  →  Forests  →  Meadow
  (who)      (where)     (what)

  See who     Find your    Follow
  is here     community    their words
```

Canopy is the foundation. You can't discover communities if you can't first discover *people*.

---

## Architecture

### Tech Stack
- **Runtime:** Cloudflare Pages (Landing SvelteKit app)
- **Database:** Cloudflare D1 (`grove-engine-db` — shared with all apps)
- **Cache:** None initially (server-rendered on every request)
- **Auth:** Not required to browse; Heartwood auth required to manage your own listing

### Where It Lives

Canopy is a **route in Landing**, not a standalone property:

```
packages/landing/
  src/routes/canopy/
    +page.server.ts    # Server load: query directory from D1
    +page.svelte       # Directory grid with search/filter UI
```

Settings controls live in the **engine admin** (Arbor):

```
packages/engine/
  src/routes/arbor/settings/
    # New section: "Canopy" with opt-in toggle, tagline, categories
```

### Data Flow

```
Wanderer enables Canopy in Arbor settings
        ↓
Settings saved to tenant_settings (D1)
        ↓
grove.place/canopy queries D1:
  SELECT tenants + settings WHERE canopy_visible = true
        ↓
Server-rendered directory page
        ↓
Visitor browses, filters, clicks through to groves
```

---

## Data Model

All Canopy data lives in the existing `tenant_settings` key-value table. No new tables needed.

### Settings Keys

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `canopy_visible` | `"true"` / `"false"` | `"false"` | Opt-in: show this grove in the Canopy |
| `canopy_tagline` | string (max 160 chars) | `""` | Custom text: why should someone visit your grove? |
| `canopy_categories` | JSON string array | `"[]"` | Selected categories (from predefined list + custom) |
| `canopy_show_forests` | `"true"` / `"false"` | `"true"` | Show which Forests this wanderer is active in |

### Predefined Categories

```typescript
const CANOPY_CATEGORIES = [
  'writing',
  'photography',
  'art',
  'code',
  'music',
  'poetry',
  'gaming',
  'food',
  'travel',
  'science',
  'queer',
  'journal',
  'other'
] as const;
```

When a wanderer selects "other", they provide a custom tag. Custom tags submitted by other wanderers are displayed as suggestions before creating a new one — this lets the community self-sort organically while preventing tag soup.

### Eligibility Requirements

A grove appears in the Canopy when ALL of:
1. `canopy_visible` is `"true"` (opt-in)
2. Tenant is `active = 1` (not suspended)
3. Tenant has at least **1 published bloom** (post_count >= 1)

---

## Directory Page

### URL
`grove.place/canopy`

### Query

```sql
SELECT
  t.subdomain,
  t.display_name,
  t.plan,
  t.post_count,
  ts_tagline.setting_value AS tagline,
  ts_categories.setting_value AS categories
FROM tenants t
LEFT JOIN tenant_settings ts_tagline
  ON t.id = ts_tagline.tenant_id AND ts_tagline.setting_key = 'canopy_tagline'
LEFT JOIN tenant_settings ts_categories
  ON t.id = ts_categories.tenant_id AND ts_categories.setting_key = 'canopy_categories'
INNER JOIN tenant_settings ts_visible
  ON t.id = ts_visible.tenant_id
  AND ts_visible.setting_key = 'canopy_visible'
  AND ts_visible.setting_value = 'true'
WHERE t.active = 1
  AND t.post_count >= 1
ORDER BY RANDOM()
```

### Daily Shuffle

The directory order is randomized daily using a seeded random:

```typescript
// Seed based on date — consistent within a day, shuffles at midnight
const seed = new Date().toISOString().slice(0, 10); // "2026-02-08"

// Use seed to generate deterministic shuffle
// This prevents any one person from always being at the top
// while keeping pagination stable within a single day
```

D1 doesn't support seeded `RANDOM()`, so the shuffle happens server-side after the query. For small directory sizes (< 1000 entries), this is fine. If the directory grows large, pagination + cursor-based queries with a daily seed will be needed.

### Card Layout

Each directory listing shows:

```
┌──────────────────────────────────┐
│  [avatar]  Display Name          │
│            @subdomain.grove.place│
│                                  │
│  "Their tagline text here"       │
│                                  │
│  [photography] [queer] [journal] │
│                                  │
│  12 blooms                       │
│  🌲 The Prism · The Terminal     │
└──────────────────────────────────┘
```

- **Avatar:** From Heartwood (user table `avatar_url`)
- **Display name:** From `tenants.display_name`
- **Subdomain link:** Links to `{subdomain}.grove.place`
- **Tagline:** The custom text from `canopy_tagline`
- **Category badges:** From `canopy_categories`
- **Bloom count:** From `tenants.post_count`
- **Forests:** Optional, from `canopy_show_forests` (when Forests ship)

### Search & Filter

- **Search bar:** Filters by display name and tagline text (client-side for V1)
- **Category tabs/pills:** Click a category to filter the grid
- **Combined:** Search within a category

---

## Settings UI (in Arbor)

A new "Canopy" section in the blog settings page:

```
┌─ Canopy ─────────────────────────────────────┐
│                                               │
│  ☐ Rise into the Canopy                       │
│    When enabled, your grove appears in the    │
│    Canopy — Grove's public directory where     │
│    wanderers discover each other.             │
│                                               │
│  Your [tagline term] ─────────────────────    │
│  │ What brings you to the grove?          │    │
│  └────────────────────────────────────────┘    │
│  A short line about you or your writing.       │
│  This is what others see in the directory.     │
│                                               │
│  Categories ──────────────────────────         │
│  [x] photography  [x] queer  [ ] code         │
│  [ ] writing  [ ] art  [ ] music  ...          │
│  [x] other: "film reviews"                     │
│                                               │
│  ☑ Show my Forests (when available)            │
│                                               │
└───────────────────────────────────────────────┘
```

The toggle, tagline field, and categories are saved as individual keys in `tenant_settings` via the existing settings API.

---

## API Endpoints

### GET /api/canopy

Returns the directory listing for the Canopy page.

**Query params:**
- `category` (optional): Filter by category
- `q` (optional): Search query (matches display_name and tagline)

**Response:**
```json
{
  "wanderers": [
    {
      "subdomain": "autumn",
      "display_name": "Autumn",
      "avatar_url": "https://cdn.grove.place/avatars/...",
      "tagline": "Building a forest, one tree at a time.",
      "categories": ["code", "queer"],
      "bloom_count": 47,
      "forests": ["The Prism", "The Terminal"]
    }
  ],
  "total": 1,
  "categories": [
    { "name": "writing", "count": 12 },
    { "name": "photography", "count": 8 },
    { "name": "queer", "count": 6 }
  ]
}
```

### PUT /api/settings (existing)

Canopy settings are saved through the existing tenant settings API. No new endpoints needed — just new setting keys.

---

## Privacy & Safety

### Opt-In by Design

- Canopy visibility is **OFF by default**. You must explicitly enable it.
- The toggle language is clear: "When enabled, your grove appears in the Canopy — Grove's public directory."
- Disabling removes you from the directory immediately (next page load).

### What's Visible

Only information the wanderer explicitly provides:
- Display name (already public on their grove)
- Subdomain (already public)
- Avatar (already public)
- Tagline (new — they write it)
- Categories (new — they choose them)
- Bloom count (already public)

No email addresses. No real names unless the wanderer chooses to use one as their display name. No location data. No activity metrics beyond bloom count.

### Moderation

- Taglines pass through Thorn (content moderation) before appearing
- Custom category tags pass through Loam for offensive content
- The Wayfinder can remove a listing from the Canopy without disabling the grove itself

---

## Migration Path

### Phase 1: MVP (this spec)
- Opt-in toggle, tagline, predefined categories in settings
- Static directory page at `grove.place/canopy`
- Search and category filtering
- Daily random shuffle

### Phase 2: Forests Integration
- Show Forest memberships on directory cards
- "Also in: The Prism, The Terminal" badges
- Link between Canopy and Forest directory pages

### Phase 3: Meadow Integration
- "Follow" button on Canopy cards (when Meadow exists)
- Canopy cards link to Meadow profiles

### Phase 4: Rich Profiles
- Optional: show latest bloom title on card
- Optional: show Terrarium scene thumbnail
- Optional: seasonal decoration on card based on theme

---

## Implementation Plan

### Database Changes
No migrations needed — uses existing `tenant_settings` key-value table.

### Files to Create/Modify

**New files:**
```
packages/landing/src/routes/canopy/+page.server.ts
packages/landing/src/routes/canopy/+page.svelte
packages/engine/src/lib/config/canopy-categories.ts
```

**Modified files:**
```
packages/engine/src/routes/arbor/settings/   # Add Canopy section
packages/engine/src/routes/api/settings/     # Handle new setting keys
```

### Settings API Changes

The existing settings API already handles arbitrary key-value pairs. The only change is adding validation for the new keys:

```typescript
const CANOPY_SETTINGS = {
  canopy_visible: { type: 'boolean', default: 'false' },
  canopy_tagline: { type: 'string', maxLength: 160, default: '' },
  canopy_categories: { type: 'json', default: '[]' },
  canopy_show_forests: { type: 'boolean', default: 'true' },
} as const;
```

---

## Design Notes

### Emotional Goal

When someone opens the Canopy, they should feel: "Oh! There are people here! Real people. Let me see who they are."

Not a sterile directory. Not a social media feed. Just a warm, browseable collection of people who chose to be found.

### Visual Direction

- Glass cards over nature background (consistent with Landing aesthetic)
- Category badges in soft, organic colors
- Avatar circles with subtle border glow
- Randomized nature decorations (falling leaves, etc.) — respects `prefers-reduced-motion`
- Empty state when directory is small: "The canopy is growing. Be one of the first to rise into it."

### Accessibility

- All category filtering works without JavaScript (server-side fallback)
- Screen reader: "Directory of Grove members" with card landmarks
- Touch targets 44x44px minimum on all interactive elements
- Category badges have sufficient color contrast
- Search input has proper label and aria-describedby

---

## Relationship to Existing Features

| Feature | Relationship |
|---------|-------------|
| **Forests** | Canopy shows ALL trees; Forests show themed groups. Canopy cards can display Forest memberships. |
| **Meadow** | Canopy is browse/discover; Meadow is follow/read. Canopy is the entry point that leads to Meadow follows. |
| **Wander** | Canopy is a flat directory; Wander is an immersive 3D walk. Both are discovery, different modalities. |
| **Foliage** | A wanderer's Foliage theme could influence how their Canopy card looks (future). |
| **Arbor** | Settings live in Arbor. The "Canopy" section is a new tab/section in blog settings. |

---

*See who's growing here.* 🌲
