# Curio: Activity Status

> *Currently: writing a blog post about mushrooms.*

**Priority:** Tier 1 — Build First
**Complexity:** Low
**Category:** Social
**Placement:** Header-vine, right-vine, floating

---

## What

A customizable status indicator — like Discord's custom status, but for your site. "Currently: coding at 2am" or "Away: touching grass." Humanizes your site with a real-time signal that says "a person is behind this."

## Why

It's the simplest way to make a static site feel alive. One line of text + an emoji and suddenly visitors know someone is actually here. Pairs naturally with Now Playing for auto-statuses later.

---

## Database Schema

### Migration: `{next}_activitystatus_curio.sql`

```sql
CREATE TABLE IF NOT EXISTS activity_status (
  tenant_id TEXT PRIMARY KEY,
  status_text TEXT DEFAULT NULL,
  status_emoji TEXT DEFAULT NULL,
  status_type TEXT NOT NULL DEFAULT 'manual',
  preset TEXT DEFAULT NULL,
  auto_source TEXT DEFAULT NULL,
  expires_at TEXT DEFAULT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
```

---

## Components

| Component | Purpose |
|-----------|---------|
| `ActivityStatus.svelte` | Display component (emoji + text) |
| `ActivityStatusInline.svelte` | Tiny vine version (single line) |
| `ActivityStatusAdmin.svelte` | Set/update status with presets |

---

## Status Types

### Manual
Set your own text + emoji. Full freedom.

### Presets
Quick-set common statuses:
- Writing, Coding, Reading, Gaming, Cooking
- Away, Sleeping, On Vacation
- Listening to music, Watching something
- Touching grass, Out for a walk

### Auto (future, pairs with other curios)
- Now Playing curio → "Listening to [song]"
- Recent post → "Just published: [title]"
- Time-based → "Night owl mode" (late hours)

### Timed
Set a status that auto-clears after X hours. "Away for the weekend" → gone Monday.

---

## API Endpoints

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| `GET` | `/api/curios/activitystatus` | Get current status | Public |
| `POST` | `/api/curios/activitystatus` | Set status | Admin |
| `DELETE` | `/api/curios/activitystatus` | Clear status | Admin |

---

## Key Implementation Details

- **Stored in D1, cached in KV** for edge-fast reads (status is read on every page load)
- **Expiration:** Optional, checked on read (lazy cleanup)
- **Auto-source:** Reads from other curio data if available (Now Playing, last post)
- **Display:** Small and unobtrusive — emoji + text, never more than one line
- **Empty state:** When no status set, component doesn't render (no "no status" placeholder)
- **KV cache key:** `status:{tenant_id}` with 60s TTL

---

## Tier Logic

| Tier | Features |
|------|----------|
| Seedling | Presets only |
| Sapling | Custom text + emoji |
| Oak+ | Auto-sources, timed statuses |

---

## Implementation Steps

1. Migration + types in `index.ts`
2. `ActivityStatus.svelte` — display component
3. `ActivityStatusInline.svelte` — compact vine version
4. API routes with KV caching
5. Admin page with preset buttons + custom input
6. Expiration logic (check on read)
7. Register in curio registry
8. Tests

---

*A whisper from the other side of the screen: I'm here.*
