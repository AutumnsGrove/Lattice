# Curio: Clip Art Library

> *The craft drawer of your digital scrapbook.*

**Priority:** Tier 4 — When Ready
**Complexity:** Medium
**Category:** Decoration
**Placement:** Inline (overlay on any page)

---

## What

Decorative assets you can drop onto pages — borders, critters, sparkles, signs, fairy lights. A library of Grove-themed art pieces that can be positioned anywhere as decorative overlays.

## Why

Enables visual creativity without design skills. Combined with future Terrarium integration, this becomes the "sticker book" for your site. Blocked on having a library of assets to offer.

---

## Database Schema

### Migration: `{next}_clipart_curio.sql`

```sql
CREATE TABLE IF NOT EXISTS clipart_placements (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  page_path TEXT NOT NULL DEFAULT '/',
  asset_id TEXT NOT NULL,
  position_x REAL NOT NULL DEFAULT 0,
  position_y REAL NOT NULL DEFAULT 0,
  scale REAL NOT NULL DEFAULT 1.0,
  rotation REAL NOT NULL DEFAULT 0,
  z_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_clipart_placements_tenant ON clipart_placements(tenant_id);
CREATE INDEX idx_clipart_placements_page ON clipart_placements(tenant_id, page_path);
```

---

## Asset Library

```
static/curios/clipart/
├── foliage/       Borders, corners, dividers, vines, mushrooms
├── critters/      Butterflies, bees, ladybugs, birds, woodland silhouettes
├── effects/       Sparkles, fairy dust, light rays
├── labels/        Signposts, banners, speech bubbles, nameplates
└── decorative/    Ribbons, lanterns, fairy lights, garden stakes
```

All SVG where possible (scalable, theme-colorable via CSS variables).

---

## Components

| Component | Purpose |
|-----------|---------|
| `ClipArtLayer.svelte` | Renders all placed items on a page (`pointer-events: none`) |
| `ClipArtPicker.svelte` | Browse/search library (admin) |
| `ClipArtItem.svelte` | Individual item with transform |

---

## Key Implementation Details

- **Overlay layer:** `position: absolute`, `pointer-events: none` — decorative only, doesn't block content
- **Per-page placements** stored by `page_path`
- **Scale:** 0.25x - 3x, **Rotation:** 0-360 degrees
- **Assets inherit Foliage color variables** where appropriate
- **Animated assets** (butterflies, sparkles) use CSS animations, respect reduced-motion

This curio is mostly a creative asset challenge. The code is straightforward.

---

## Tier Logic

| Tier | Items/Page |
|------|-----------|
| Seedling | 5 |
| Sapling | 25 |
| Oak+ | Unlimited |

---

## Implementation Steps

1. Create art assets (blocking creative dependency)
2. Migration + types in `index.ts`
3. `ClipArtLayer.svelte` — overlay renderer
4. `ClipArtPicker.svelte` — asset browser
5. Placement editor (admin: drag/drop/resize/rotate)
6. API routes
7. Register in curio registry
8. Tests

---

*Open the craft drawer. See what catches your eye.*
