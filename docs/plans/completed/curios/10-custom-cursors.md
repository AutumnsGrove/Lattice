# Curio: Custom Cursors

> *Even your mouse knows this place is special.*

**Priority:** Tier 3 — Ship When Ready
**Complexity:** Medium
**Category:** Decoration
**Placement:** Global (affects entire page)

---

## What

Custom cursor themes for your site — leaf, butterfly, sparkle trails. Replace the default pointer with something that matches your vibe. Optional trail effects for extra flair.

## Why

Immediately noticeable, visceral delight. Cursor customization was a staple of personal web culture. It's one of those things that makes a visitor go "oh wow this site is *different*." Blocked on cursor asset creation but straightforward to implement.

---

## Database Schema

### Migration: `{next}_cursor_curio.sql`

```sql
CREATE TABLE IF NOT EXISTS cursor_config (
  tenant_id TEXT PRIMARY KEY,
  cursor_type TEXT NOT NULL DEFAULT 'preset',
  preset TEXT DEFAULT 'leaf',
  custom_url TEXT DEFAULT NULL,
  trail_enabled INTEGER NOT NULL DEFAULT 0,
  trail_effect TEXT DEFAULT 'sparkle',
  trail_length INTEGER NOT NULL DEFAULT 8,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
```

---

## Components

| Component | Purpose |
|-----------|---------|
| `CursorProvider.svelte` | Wraps the page, applies cursor globally via CSS |
| `CursorTrail.svelte` | Trail effect renderer (lightweight Canvas overlay) |

### Cursor Assets

```
static/curios/cursors/
├── nature/       leaf, flower, butterfly, ladybug, raindrop
├── whimsical/    sparkle, wand, mushroom
├── classic/      hourglass, rainbow-pointer
└── seasonal/     snowflake, pumpkin, blossom, falling-leaf
```

All assets are 32x32 PNG or SVG with hotspot metadata.

---

## Key Implementation Details

- **Static cursors:** Applied via CSS `cursor: url(/curios/cursors/leaf.png) 4 4, auto`
- **Trail effects:** Lightweight Canvas overlay (`pointer-events: none`, recycled element pool)
- **Custom uploads:** Stored in R2, served via CDN, 32x32 max
- **All effects disabled** when `prefers-reduced-motion: reduce`
- **Trail element pool:** Max `trail_length` elements, recycled (no DOM bloat)
- **Live preview** in admin (hover over preview area to see cursor)

---

## Tier Logic

| Tier | Presets | Trail | Custom |
|------|---------|-------|--------|
| Seedling | 5 nature presets | No | No |
| Sapling | All presets | Yes | No |
| Oak+ | All presets | Yes | 1 custom upload |

---

## Implementation Steps

1. Create cursor SVG/PNG assets (blocking dependency)
2. Migration + types in `index.ts`
3. `CursorProvider.svelte` — CSS cursor application
4. `CursorTrail.svelte` — Canvas trail renderer
5. Admin page with live preview
6. API routes for config
7. Register in curio registry
8. Tests

---

*The cursor changes. You've entered somewhere new.*
