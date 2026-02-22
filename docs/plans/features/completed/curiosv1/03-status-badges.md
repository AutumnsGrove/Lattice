# Curio: Status Badges

> *Here's what's happening with my corner of the internet.*

**Priority:** Tier 1 — Build First
**Complexity:** Low
**Category:** Decoration
**Placement:** Floating, header-vine, right-vine

---

## What

Site status indicators — "Under Construction," "Just Planted," "Grand Opening." Small, expressive badges that signal the state of your site. Free for all tiers.

## Why

Tiny effort, huge personality. These are the equivalent of a hand-written sign on a shop door. They communicate without demanding attention.

---

## Database Schema

### Migration: `{next}_statusbadge_curio.sql`

```sql
CREATE TABLE IF NOT EXISTS status_badges (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  badge_type TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT 'floating',
  animated INTEGER NOT NULL DEFAULT 1,
  custom_text TEXT DEFAULT NULL,
  show_date INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_status_badges_tenant ON status_badges(tenant_id);
```

---

## Badge Types

| Badge | Visual | Auto? |
|-------|--------|-------|
| Under Construction | Animated worker/caution tape | Manual |
| Just Planted | Sprouting seedling | Auto (new site, < 7 days) |
| Coming Soon | Crystal ball | Manual |
| New & Shiny | Sparkle burst | Auto (new site, < 30 days) |
| On Hiatus | Sleeping moon | Manual |
| Grand Opening | Confetti | Manual |
| Night Owl | Owl/moon | Auto (detected from post times) |
| Last Updated | Calendar | Auto (updates with last post date) |
| Fresh Post | Pen/paper | Auto (appears for 48h after new post) |

---

## Components

| Component | Purpose |
|-----------|---------|
| `StatusBadge.svelte` | Main component — type switching, position |
| `Badge{Type}.svelte` | Individual badge renderers (SVG/CSS) |

All badges are self-contained SVG + CSS. No external dependencies. Animations are CSS `@keyframes` only.

---

## API Endpoints

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| `GET` | `/api/curios/statusbadge` | Get active badges | Public |
| `POST` | `/api/curios/statusbadge` | Set/update badge | Admin |
| `DELETE` | `/api/curios/statusbadge/[id]` | Remove badge | Admin |

---

## Key Implementation Details

- **Position options:** floating (corner), header-vine, right-vine, footer-vine
- **Animated variants** respect `prefers-reduced-motion` (static fallback)
- **Auto-badges** detect conditions and show/hide automatically:
  - Night Owl: > 50% of posts published between 10pm-4am
  - Last Updated: queries most recent post `updated_at`
  - Fresh Post: appears within 48h of any new post
  - Just Planted / New & Shiny: based on tenant `created_at`
- **Multiple badges allowed** — they stack in a column
- **Floating badges** use `position: fixed` with configurable corner

---

## Tier Logic

**All tiers: full access.** Status badges are free. They're fun and they cost nothing to serve.

---

## Implementation Steps

1. Migration + types in `index.ts`
2. Individual badge SVG/CSS components
3. `StatusBadge.svelte` — main renderer with position logic
4. Auto-detection utilities for Night Owl, Fresh Post, etc.
5. API routes
6. Admin toggle page (pick badges, set position)
7. Register in curio registry
8. Tests

---

*A small sign on the door. Come on in.*
