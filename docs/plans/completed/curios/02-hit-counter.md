# Curio: Hit Counter

> *You are visitor #1,247!*

**Priority:** Tier 1 — Build First
**Complexity:** Low
**Category:** Decoration
**Placement:** Footer-vine, left-vine, right-vine, floating

---

## What

The nostalgic page view counter. Simple, charming, universally recognized. Zero complexity, maximum nostalgia.

## Why

Everyone who had a website in the 90s/2000s remembers hit counters. They're instant personality, dead simple to build, and satisfying to watch go up. Privacy-first: no visitor tracking, just a number.

---

## Database Schema

### Migration: `{next}_hitcounter_curio.sql`

```sql
CREATE TABLE IF NOT EXISTS hit_counters (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  page_path TEXT NOT NULL DEFAULT '/',
  count INTEGER NOT NULL DEFAULT 0,
  style TEXT NOT NULL DEFAULT 'classic',
  label TEXT DEFAULT 'You are visitor',
  show_since_date INTEGER NOT NULL DEFAULT 1,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, page_path)
);

CREATE INDEX idx_hit_counters_tenant ON hit_counters(tenant_id);
```

---

## Components

| Component | Purpose |
|-----------|---------|
| `HitCounter.svelte` | Main component — style switching, count display |
| `CounterClassic.svelte` | Green digits on black (slot machine look) |
| `CounterOdometer.svelte` | Flip-style mechanical counter animation |
| `CounterMinimal.svelte` | Plain text "You are visitor #1,247" |
| `CounterLCD.svelte` | Calculator/LCD display aesthetic |
| `CounterCustom.svelte` | User-themed colors |

---

## API Endpoints

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| `GET` | `/api/curios/hitcounter` | Get count + increment | Public |
| `GET` | `/api/curios/hitcounter/config` | Get config | Admin |
| `POST` | `/api/curios/hitcounter/config` | Update config | Admin |

---

## Key Implementation Details

- **Increment on page load** — No unique visitor tracking (privacy first)
- **No IP logging** whatsoever
- **Count in D1**, optional KV cache for edge-fast reads
- **Animated digit transitions** — CSS only, respects `prefers-reduced-motion`
- **"Since" label** — Optional "since [date]" below the counter
- **Number formatting** — Commas for thousands (1,247 not 1247)
- **Per-page counters** — Oak+ can track different pages
- **Vine-native** — Designed to fit in any vine slot, no dedicated page needed

---

## Tier Logic

| Tier | Counters | Styles |
|------|----------|--------|
| Seedling | 1 (site-wide) | Classic only |
| Sapling | 1 (site-wide) | All styles |
| Oak+ | Per-page | All styles + custom colors |

---

## Implementation Steps

1. Migration + types in `index.ts`
2. Style sub-components (Classic, Odometer, LCD, Minimal, Custom)
3. `HitCounter.svelte` — main component with style switching
4. API route with atomic increment
5. Admin config page (style picker, label, since date toggle)
6. Register in curio registry
7. Tests

---

*The counter ticks up. Someone was here.*
