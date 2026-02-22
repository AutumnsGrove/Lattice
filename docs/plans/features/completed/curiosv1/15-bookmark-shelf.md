# Curio: Bookmark Shelf

> *Browse my shelf, take what interests you.*

**Priority:** Tier 4 — When Ready
**Complexity:** Medium
**Category:** Social
**Placement:** Dedicated page (`/shelf/`), right-vine (featured picks)

---

## What

A curated collection of links organized as a visual bookshelf — books, articles, resources displayed as spines on a shelf. Click to expand details. Different from Link Gardens (directories) and Blogrolls (feeds) — this is a personal library with visual flair.

## Why

For Wanderers who are readers, curators, collectors of interesting things. The bookshelf metaphor is warm and inviting. It says "here's what I'm reading and recommending."

---

## Database Schema

### Migration: `{next}_bookmarkshelf_curio.sql`

```sql
CREATE TABLE IF NOT EXISTS bookmark_shelves (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'My Shelf',
  description TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  shelf_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT DEFAULT NULL,
  cover_image_url TEXT DEFAULT NULL,
  category TEXT DEFAULT NULL,
  note TEXT DEFAULT NULL,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  is_current INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (shelf_id) REFERENCES bookmark_shelves(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_bookmark_shelves_tenant ON bookmark_shelves(tenant_id);
CREATE INDEX idx_bookmarks_shelf ON bookmarks(shelf_id);
CREATE INDEX idx_bookmarks_tenant ON bookmarks(tenant_id);
```

---

## Components

| Component | Purpose |
|-----------|---------|
| `BookmarkShelf.svelte` | Visual bookshelf display with spine rendering |
| `BookmarkSpine.svelte` | Individual "book spine" on the shelf |
| `BookmarkDetail.svelte` | Expanded view: cover, description, notes |
| `BookmarkShelfMini.svelte` | Vine: "Currently Reading" + 2-3 featured |
| `BookmarkAdmin.svelte` | Add/organize/categorize bookmarks |

---

## Key Implementation Details

- **Book spines** auto-colored by category (or custom color)
- **Cover images** fetched from Open Graph tags (optional, fallback to colored spine)
- **"Currently Reading"** section at top (flagged with `is_current`)
- **Categories** rendered as different shelf rows
- **Favorites** get a star/highlight on their spine
- **Click to expand** — full details with notes and link
- **Vine mini-view** shows "Currently Reading" item + 2 recent additions

---

## Tier Logic

| Tier | Shelves | Bookmarks |
|------|---------|-----------|
| Seedling | 1 | 10 |
| Sapling | 3 | 50 |
| Oak+ | Unlimited | Unlimited |

---

## Implementation Steps

1. Migration + types in `index.ts`
2. `BookmarkSpine.svelte` — individual spine component
3. `BookmarkShelf.svelte` — shelf layout with category rows
4. `BookmarkDetail.svelte` — expanded view
5. Open Graph cover image fetcher
6. Admin page (add/edit/categorize/reorder)
7. Vine mini component
8. Public page at `/(site)/shelf/`
9. Register in curio registry
10. Tests

---

*A shelf of things worth knowing. Pull one out and see.*
