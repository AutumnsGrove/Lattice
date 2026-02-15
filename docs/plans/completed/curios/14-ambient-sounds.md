# Curio: Ambient Sounds

> *Step into the grove and hear it.*

**Priority:** Tier 4 — When Ready
**Complexity:** Low-Medium
**Category:** Media
**Placement:** Global (small floating player)

---

## What

Optional background audio — nature sounds, lo-fi vibes, seasonal ambiance. A small, unobtrusive player that visitors can toggle on. Turns a website visit into an experience.

## Why

The most immersive curio. Imagine landing on someone's Grove site and hearing gentle rain or distant birdsong. It's the final layer of "this place is alive." Blocked on audio asset creation but technically simple.

**Critical: NEVER autoplay. Always requires explicit user click.**

---

## Database Schema

### Migration: `{next}_ambient_curio.sql`

```sql
CREATE TABLE IF NOT EXISTS ambient_config (
  tenant_id TEXT PRIMARY KEY,
  sound_set TEXT NOT NULL DEFAULT 'forest-rain',
  volume_default REAL NOT NULL DEFAULT 0.3,
  custom_url TEXT DEFAULT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
```

---

## Sound Sets

| Set | Description | File Size |
|-----|-------------|-----------|
| Forest Rain | Gentle rainfall, distant thunder | ~3MB |
| Morning Birds | Dawn chorus, birdsong | ~3MB |
| Creek | Running water over stones | ~2MB |
| Night | Crickets, owls, gentle wind | ~3MB |
| Lo-fi | Royalty-free lo-fi beats | ~4MB |
| Fireplace | Crackling fire | ~2MB |
| Seasonal | Auto-selects based on Grove season | Varies |

Audio: 128kbps, mono, 1-3 minute seamless loops. Stored in R2, served via CDN.

---

## Components

| Component | Purpose |
|-----------|---------|
| `AmbientPlayer.svelte` | Small floating toggle + volume slider |
| `AmbientAdmin.svelte` | Select sound set, configure defaults |

---

## Key Implementation Details

- **NEVER autoplay** — Speaker icon in corner, click to start
- **Remembers preference** in `localStorage` (on/off state persists across pages)
- **Volume slider** with reasonable default (30%)
- **Seamless looping** — Audio files designed for it, crossfade at loop point
- **Custom sounds** for Oak+ — upload your own ambient track to R2
- **Compressed audio** — 128kbps max, mono (ambiance doesn't need stereo)
- **Seasonal auto-select** reads from Foliage season context

---

## Tier Logic

| Tier | Sound Sets | Custom |
|------|-----------|--------|
| Seedling | 2 (Forest Rain, Morning Birds) | No |
| Sapling | All bundled | No |
| Oak+ | All bundled + 1 custom upload | Yes |

---

## Implementation Steps

1. Source/create audio assets (blocking creative dependency)
2. Migration + types in `index.ts`
3. `AmbientPlayer.svelte` — player with toggle + volume
4. Audio loading + seamless loop logic
5. localStorage preference persistence
6. Admin page (sound set picker, volume default)
7. Seasonal auto-selection
8. API routes
9. Register in curio registry
10. Tests

---

*Close your eyes. Listen. The grove is alive.*
