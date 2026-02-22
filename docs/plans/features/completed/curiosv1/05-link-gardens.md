# Curio: Link Gardens

> *Here are the places and people I love on the web.*

**Priority:** Tier 2 — Build Next
**Complexity:** Medium
**Category:** Social
**Placement:** Dedicated page (`/links/`) + right-vine (compact list)

---

## What

Curated link collections — your blogroll, friends list, cool sites. Multiple display styles from clean lists to the classic 88x31 button wall. The indie web's answer to algorithmic discovery.

## Why

This is how indie web community works. People discover each other through links, not algorithms. A links page says "I vouch for these places." The 88x31 button wall is an iconic format that immediately signals indie web membership.

---

## Database Schema

### Migration: `{next}_linkgarden_curio.sql`

```sql
CREATE TABLE IF NOT EXISTS link_gardens (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Links',
  description TEXT DEFAULT NULL,
  style TEXT NOT NULL DEFAULT 'list',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS link_garden_items (
  id TEXT PRIMARY KEY,
  garden_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  favicon_url TEXT DEFAULT NULL,
  button_image_url TEXT DEFAULT NULL,
  category TEXT DEFAULT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (garden_id) REFERENCES link_gardens(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_link_gardens_tenant ON link_gardens(tenant_id);
CREATE INDEX idx_link_garden_items_garden ON link_garden_items(garden_id);
CREATE INDEX idx_link_garden_items_tenant ON link_garden_items(tenant_id);
```

---

## Components

| Component | Purpose |
|-----------|---------|
| `LinkGarden.svelte` | Main display with style switching |
| `GardenList.svelte` | Vertical list with descriptions + favicons |
| `GardenGrid.svelte` | Icon grid with tooltips |
| `GardenButtons.svelte` | 88x31 button wall (classic web!) |
| `GardenMarquee.svelte` | Scrolling links (the chaos option) |
| `LinkGardenMini.svelte` | Vine-compatible compact list (top 5 links) |
| `LinkGardenAdmin.svelte` | Add/edit/reorder links with drag-and-drop |

---

## API Endpoints

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| `GET` | `/api/curios/linkgarden` | Fetch gardens + links | Public |
| `POST` | `/api/curios/linkgarden` | Create garden | Admin |
| `PUT` | `/api/curios/linkgarden/[id]` | Update garden | Admin |
| `DELETE` | `/api/curios/linkgarden/[id]` | Delete garden | Admin |
| `POST` | `/api/curios/linkgarden/[id]/links` | Add link | Admin |
| `PUT` | `/api/curios/linkgarden/[id]/links/[linkId]` | Update link | Admin |
| `DELETE` | `/api/curios/linkgarden/[id]/links/[linkId]` | Remove link | Admin |

---

## Key Implementation Details

- **Favicon fetching:** Auto-fetch on link add, cache in KV (use Google's favicon API as fallback)
- **88x31 buttons:** Upload custom images OR auto-generate placeholder from site title + colors
- **Marquee:** CSS `animation` with `translateX` keyframes — NOT the HTML `<marquee>` tag
- **Drag-and-drop reorder** in admin (SortableJS or native DnD API)
- **Categories:** Optional grouping (Friends, Cool Sites, Resources, etc.)
- **URL validation:** Basic format check on save
- **Vine mini-view:** Top 5 links as a compact list with favicons

---

## Tier Logic

| Tier | Gardens | Links/Garden | Styles |
|------|---------|-------------|--------|
| Seedling | 1 | 10 | List only |
| Sapling | 3 | 50 | All 4 styles |
| Oak+ | Unlimited | Unlimited | All + custom 88x31 uploads |

---

## Implementation Steps

1. Migration + types in `index.ts`
2. List and grid display components
3. 88x31 button wall component
4. Marquee component
5. Favicon fetching utility
6. API routes (CRUD for gardens + links)
7. Admin page with drag-and-drop reorder
8. Mini vine component
9. Public page at `/(site)/links/`
10. Register in curio registry
11. Tests

---

*A garden of paths, each leading somewhere worth visiting.*
