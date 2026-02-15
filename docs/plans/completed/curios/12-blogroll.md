# Curio: Blogroll

> *Here's who I read and recommend.*

**Priority:** Tier 3 — Ship When Ready
**Complexity:** Medium
**Category:** Social
**Placement:** Dedicated page (`/blogroll/`), right-vine (compact list)

---

## What

A dedicated "sites I read" list with optional live latest-post fetching via RSS/Atom feeds. Different from Link Gardens: blogrolls specifically track blogs and can show what each one published recently.

## Why

Blogrolls were THE original content discovery mechanism. They're making a massive comeback in the indie web community. This creates a web of mutual recommendations that builds community organically.

**Decision:** Could be a Link Garden variant or a standalone curio. Keeping it standalone because RSS feed parsing and live latest-post fetching differentiate it enough.

---

## Database Schema

### Migration: `{next}_blogroll_curio.sql`

```sql
CREATE TABLE IF NOT EXISTS blogroll_items (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  feed_url TEXT DEFAULT NULL,
  favicon_url TEXT DEFAULT NULL,
  last_post_title TEXT DEFAULT NULL,
  last_post_url TEXT DEFAULT NULL,
  last_post_date TEXT DEFAULT NULL,
  last_feed_check TEXT DEFAULT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_blogroll_items_tenant ON blogroll_items(tenant_id);
```

---

## Components

| Component | Purpose |
|-----------|---------|
| `Blogroll.svelte` | Full blogroll display with latest posts |
| `BlogrollItem.svelte` | Individual blog entry (title, desc, latest post) |
| `BlogrollMini.svelte` | Vine-compatible compact list (top 5) |
| `BlogrollAdmin.svelte` | Add/remove blogs, trigger RSS refresh |

---

## Key Implementation Details

- **RSS auto-detection:** When adding a URL, attempt to discover RSS/Atom feed via `<link rel="alternate">` in HTML
- **Feed fetching:** Background Worker cron (hourly) or on-demand, results cached in KV (1hr TTL)
- **Latest post display:** "Latest: [post title]" shown under each blog entry
- **Favicon:** Auto-fetched from site, cached in KV
- **OPML import/export:** Standard blogroll interchange format (Oak+)
- **Vine mini-view:** Top 5 blogs as compact list with latest post titles

---

## Tier Logic

| Tier | Blogs | RSS | OPML |
|------|-------|-----|------|
| Seedling | 5 | No | No |
| Sapling | 25 | Latest post fetching | No |
| Oak+ | Unlimited | Latest post fetching | Import/Export |

---

## Implementation Steps

1. Migration + types in `index.ts`
2. `BlogrollItem.svelte` — individual entry display
3. `Blogroll.svelte` — full list
4. RSS feed discovery utility
5. Feed fetching + KV caching
6. Admin page (add/remove/reorder)
7. `BlogrollMini.svelte` — vine component
8. OPML import/export (Oak+)
9. Public page at `/(site)/blogroll/`
10. Register in curio registry
11. Tests

---

*The blogs I love, the voices I return to.*
