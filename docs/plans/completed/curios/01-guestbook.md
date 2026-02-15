# Curio: Guestbook

> *Someone visited and wanted to say hi.*

**Priority:** Tier 1 — Build First
**Complexity:** Medium
**Category:** Social
**Placement:** Dedicated page (`/guestbook/`) + right-vine (mini view)

---

## What

Visitors sign your guestbook. The classic personal web element. No login required — just a name, a message, and maybe an emoji.

## Why Build This First

It's THE defining curio. Everyone knows what a guestbook is. It creates genuine visitor interaction without being social media. It's the most requested feature on indie web platforms, and it immediately signals "this is a personal space, not a corporate product."

---

## Database Schema

### Migration: `{next}_guestbook_curio.sql`

```sql
CREATE TABLE IF NOT EXISTS guestbook_config (
  tenant_id TEXT PRIMARY KEY,
  style TEXT NOT NULL DEFAULT 'cozy',
  entries_per_page INTEGER NOT NULL DEFAULT 20,
  require_approval INTEGER NOT NULL DEFAULT 1,
  allow_emoji INTEGER NOT NULL DEFAULT 1,
  max_message_length INTEGER NOT NULL DEFAULT 500,
  custom_prompt TEXT DEFAULT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS guestbook_entries (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Anonymous Wanderer',
  message TEXT NOT NULL,
  emoji TEXT DEFAULT NULL,
  approved INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_guestbook_entries_tenant ON guestbook_entries(tenant_id);
CREATE INDEX idx_guestbook_entries_approved ON guestbook_entries(tenant_id, approved, created_at);
```

---

## Components

| Component | Purpose |
|-----------|---------|
| `Guestbook.svelte` | Main display — renders entry list with style switching |
| `GuestbookEntry.svelte` | Individual entry (name, message, emoji, date) |
| `GuestbookForm.svelte` | Sign the book (name, message, emoji picker) |
| `GuestbookMini.svelte` | Vine-compatible compact view (latest 3 entries + "sign" link) |
| `GuestbookAdmin.svelte` | Moderation panel (approve/delete/ban) |

### Display Styles

- **Classic** — Bordered entries, old-web feel, visible dates
- **Modern** — Clean cards with subtle shadows
- **Pixel** — Retro pixelated borders and monospace text
- **Cozy** — Warm, rounded, handwriting-feel font (default)

---

## API Endpoints

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| `GET` | `/api/curios/guestbook` | Fetch approved entries (paginated) | Public |
| `POST` | `/api/curios/guestbook` | Submit new entry | Public (rate-limited) |
| `GET` | `/api/curios/guestbook/pending` | Fetch pending entries | Admin |
| `PATCH` | `/api/curios/guestbook/[id]` | Approve/reject entry | Admin |
| `DELETE` | `/api/curios/guestbook/[id]` | Delete entry | Admin |
| `GET` | `/api/curios/guestbook/config` | Get config | Admin |
| `POST` | `/api/curios/guestbook/config` | Update config | Admin |

---

## Key Implementation Details

- **Rate limiting:** 1 entry per IP per 10 minutes via `ip_hash` (SHA-256 of IP, not stored long-term)
- **Spam filtering:** Basic pattern matching (link spam, repeated chars). Thorn integration if available.
- **Default name:** "Anonymous Wanderer"
- **Message limits:** 500 chars default, configurable by tenant
- **Emoji:** Optional single emoji per entry (from a curated set, not full Unicode)
- **Pagination:** 20 entries per page, newest first
- **Approval flow:** Entries require approval by default (configurable to auto-approve)
- **Vine mini-view:** Shows 3 most recent approved entries + "Sign the Guestbook" link to dedicated page

---

## Tier Logic

| Tier | Guestbooks | Entries | Styles |
|------|-----------|---------|--------|
| Seedling | 1 | 50 | Classic only |
| Sapling | 1 | 500 | All 4 styles |
| Oak+ | Multiple | Unlimited | All styles |

---

## Admin Panel

Route: `/arbor/curios/guestbook/`

- Entry moderation queue (approve/delete)
- Style selector with live preview
- Config: approval mode, message length, emoji toggle
- Custom prompt text ("Leave a message!" → configurable)
- Entry count stats

---

## Implementation Steps

1. Migration + types in `index.ts`
2. `GuestbookEntry.svelte` — individual entry rendering
3. `GuestbookForm.svelte` — submission form with rate limit feedback
4. `Guestbook.svelte` — full page component with style switching
5. `GuestbookMini.svelte` — vine-compatible compact view
6. API routes (public GET/POST, admin CRUD)
7. Admin panel page
8. Public page route at `/(site)/guestbook/`
9. Register in curio registry
10. Tests

---

*The first signature in the book. Make it count.*
