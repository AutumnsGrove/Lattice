# Curio: Personal Shrines

> *This is sacred to me and I wanted to share it.*

**Priority:** Tier 4 — When Ready
**Complexity:** High
**Category:** Media / Social
**Placement:** Dedicated page (`/shrines/`), right-vine (mini shrine)

---

## What

Dedicated spaces for the things you love — memorial boards, fandom celebrations, gratitude walls, achievement displays. A fixed-size container where you arrange images, text, decorations, and dedications.

## Why

Deeply personal, emotionally resonant. No other platform offers this. It's the kind of thing that makes someone's site feel genuinely theirs. Pet memorials, fandom shrines, gratitude boards — these are the most human things you can put on a website.

---

## Database Schema

### Migration: `{next}_shrine_curio.sql`

```sql
CREATE TABLE IF NOT EXISTS shrines (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  shrine_type TEXT NOT NULL DEFAULT 'blank',
  title TEXT NOT NULL,
  dedication TEXT DEFAULT NULL,
  frame TEXT NOT NULL DEFAULT 'minimal',
  size TEXT NOT NULL DEFAULT 'medium',
  show_candle INTEGER NOT NULL DEFAULT 0,
  show_flowers INTEGER NOT NULL DEFAULT 0,
  contents TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_shrines_tenant ON shrines(tenant_id);
```

---

## Shrine Types

| Type | Purpose | Example |
|------|---------|---------|
| Memory | Photos, dates, dedications | Pet memorial, loved one |
| Fandom | Celebrate media/characters/creators | Favorite show, artist |
| Achievement | Milestones, accomplishments | NaNoWriMo, graduation |
| Gratitude | Things you're thankful for | People, places, moments |
| Inspiration | Quotes, images, vibes | Mood board |
| Blank | Build from scratch | Anything |

## Frames

Wood, Stone, Crystal, Floral, Cosmic, Minimal — rendered as border/overlay SVG.

## Sizes

- Small: 150x150
- Medium: 250x250
- Large: 400x400

---

## Components

| Component | Purpose |
|-----------|---------|
| `Shrine.svelte` | Main display with frame/type rendering |
| `ShrineContent.svelte` | Positioned items within shrine |
| `ShrineCandle.svelte` | Animated flickering candle (CSS) |
| `ShrineFlowers.svelte` | Decorative edge flowers |
| `ShrineEditor.svelte` | Admin: position content items |
| `ShrineMini.svelte` | Vine: small preview of primary shrine |

---

## Key Implementation Details

- **Contents** are positioned items stored as JSON: `[{type, x, y, data}]`
- **Content types:** image (R2 URL), text, date, icon, decoration
- **Frame SVGs** need to be created as art assets
- **Candle animation:** CSS `@keyframes` with subtle flicker
- **Images** from Gallery curio or Custom Uploads (shares R2 bucket)
- **Editor** is the most complex part — a simple drag/position canvas

---

## Tier Logic

| Tier | Shrines | Sizes | Frames |
|------|---------|-------|--------|
| Seedling | None | — | — |
| Sapling | 3 | Small, Medium | All |
| Oak+ | Unlimited | All sizes | All |

---

## Implementation Steps

1. Design frame SVG assets (blocking creative dependency)
2. Migration + types in `index.ts`
3. `Shrine.svelte` — display with frame rendering
4. `ShrineContent.svelte` — positioned item renderer
5. Candle + flowers decorative components
6. `ShrineEditor.svelte` — content positioning editor (hardest part)
7. API routes
8. Admin page
9. Vine mini component
10. Public page at `/(site)/shrines/`
11. Register in curio registry
12. Tests

---

*A quiet corner, lovingly arranged. Handle with care.*
