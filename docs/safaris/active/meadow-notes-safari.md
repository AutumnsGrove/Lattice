---
title: "Meadow Notes Safari — Dual Content Types for the Community Feed"
status: active
category: safari
---

# Meadow Notes Safari — Dual Content Types for the Community Feed

> Notes and Blooms, growing together in the meadow.
> **Aesthetic principle**: One unified timeline, two distinct voices
> **Scope**: Schema, types, service layer, API, UI, poller — every layer that needs to know about Notes

---

## Ecosystem Overview

**8 stops** across the Meadow content pipeline

Meadow currently supports exactly one content type: RSS-syndicated blog posts ("Blooms") that drift in from individual groves via the poller. Notes — short-form posts written directly on Meadow — don't exist yet. Not in schema, not in types, not in UI.

### Items by condition

**Thriving** (no changes needed): Poller pipeline
**Growing** (needs extension): Schema, types, service layer, feed queries
**Barren** (needs creation): Compose UI, create API, PostCard for Notes

---

## 1. D1 Schema (`meadow_posts` table)

**Character**: The shared soil where both Notes and Blooms take root.

### Safari findings: What exists today

**Migration 076** (`libs/engine/migrations/076_meadow_social.sql`):

- [x] Solid table structure with proper indexes
- [x] `UNIQUE(tenant_id, guid)` constraint for dedup
- [x] Foreign key to tenants with CASCADE
- [x] Denormalized `score` and `reaction_counts` for feed performance
- [ ] **No `post_type` column** — everything is assumed to be a Bloom
- [ ] **No `user_id` column** — author identity comes from `tenant_id` (RSS concept)
- [ ] **No `body` column** — Notes need short text, not `content_html`
- [ ] **`title` is NOT NULL** — Notes don't require a title
- [ ] **`link` is NOT NULL** — Notes don't have an external link
- [ ] **`guid` is NOT NULL** — Notes aren't from RSS, no GUID
- [ ] **`tenant_id` is NOT NULL** — Notes come from users, not tenants

### Design spec (safari-approved)

**New migration 078:** `meadow_notes_support.sql`

```sql
-- Add post_type discriminator: 'bloom' (RSS) or 'note' (native)
ALTER TABLE meadow_posts ADD COLUMN post_type TEXT NOT NULL DEFAULT 'bloom';

-- Add user_id for Note authors (NULL for Blooms, which use tenant_id)
ALTER TABLE meadow_posts ADD COLUMN user_id TEXT;

-- Add body for Note text content (NULL for Blooms, which use content_html)
ALTER TABLE meadow_posts ADD COLUMN body TEXT;

-- Relax NOT NULL constraints for Bloom-specific fields
-- SQLite doesn't support ALTER COLUMN, so these stay as-is.
-- Instead, we'll INSERT Notes with:
--   title = '' (empty string satisfies NOT NULL)
--   link = '' (empty string)
--   guid = 'note:{id}' (synthetic, satisfies NOT NULL + UNIQUE with tenant_id)
--   tenant_id = user's tenant_id (if they have a grove) OR a sentinel value

-- Index for user's own Notes
CREATE INDEX IF NOT EXISTS idx_meadow_posts_user
  ON meadow_posts(user_id, published_at DESC);

-- Index for type filtering
CREATE INDEX IF NOT EXISTS idx_meadow_posts_type
  ON meadow_posts(post_type, published_at DESC);
```

**Key decisions:**

- Notes set `title = ''`, `link = ''`, `guid = 'note:{uuid}'` to satisfy existing NOT NULL constraints without breaking Bloom queries
- `user_id` links to the Heartwood user, not a tenant. Notes can come from users who DON'T have a grove (wanderers with accounts but no blog)
- `body` is plain text, 500 char max (enforced at API layer, not schema)
- `content_html` remains NULL for Notes — no rich HTML in short posts
- `tenant_id` for Notes: use the user's tenant_id if they have a grove, otherwise NULL (relax the FK? Or use a sentinel?)

**Resolved:** Any authenticated user can post a Note, even without a grove. `tenant_id` is NULL for Notes from non-grove users. `user_id` is the primary author identity for Notes. Author display name comes from Heartwood user data, not tenant/subdomain.

---

## 2. Types (`MeadowPost` + `PostRow`)

**Character**: The shape of what flows through the feed — now polymorphic.

### Safari findings: What exists today

**`apps/meadow/src/lib/types/post.ts`** (24 lines):

- [x] Clean interface with user interaction state
- [x] Good separation of engagement data
- [ ] **No `postType` field** — can't distinguish Notes from Blooms
- [ ] **No `body` field** — Notes need short text separate from `contentHtml`
- [ ] **No `userId` field** — Note authors need user-level identity
- [ ] **`title` is non-nullable string** — Notes may have no title

**`apps/meadow/src/lib/server/types.ts`** (127 lines):

- [x] Good `PostRow` → `MeadowPost` transformer
- [x] FeedFilter union covers all algorithms
- [ ] **`PostRow` missing** `post_type`, `user_id`, `body` columns
- [ ] **`rowToPost()` doesn't map** new fields

### Design spec (safari-approved)

**MeadowPost additions:**

```typescript
export interface MeadowPost {
	// ... existing fields ...
	postType: "bloom" | "note";
	body: string | null; // Note text content (null for Blooms)
	userId: string | null; // Note author's user ID (null for Blooms)
	// Make title optional for Notes
	title: string; // Empty string for Notes, real title for Blooms
}
```

**PostRow additions:**

```typescript
export interface PostRow {
	// ... existing fields ...
	post_type: string;
	user_id: string | null;
	body: string | null;
}
```

**rowToPost() additions:**

```typescript
postType: (row.post_type as 'bloom' | 'note') || 'bloom',
body: row.body ?? null,
userId: row.user_id ?? null,
```

### Type fixes

- [ ] Add `postType`, `body`, `userId` to `MeadowPost` interface
- [ ] Add `post_type`, `user_id`, `body` to `PostRow` interface
- [ ] Update `rowToPost()` to map new fields
- [ ] Add `NoteCreatePayload` type: `{ body: string; tags?: string[] }`

---

## 3. Service Layer (`feed.ts`)

**Character**: The query composer that now speaks two languages.

### Safari findings: What exists today

**`apps/meadow/src/lib/server/feed.ts`**:

- [x] 5 feed algorithms working (all, popular, hot, top, following)
- [x] LEFT JOINs for user interaction state
- [x] Parallel count + data queries
- [x] Hot algorithm with HN-style decay
- [ ] **No `post_type` awareness** — queries return everything as Blooms
- [ ] **No Note-specific query** (e.g., "my notes" or "notes only")
- [ ] **No filtering by type** in FeedFilter union

### Design spec (safari-approved)

Feed queries don't need to change for the default "all" view — Notes and Blooms live together chronologically. But we need:

**FeedFilter additions:**

```typescript
export type FeedFilter =
	| "all" // Both Notes and Blooms
	| "notes" // Notes only
	| "blooms" // Blooms only
	| "popular"
	| "hot"
	| "top"
	| "following"
	| "bookmarks";
```

**Query modifications:**

- `WHERE` clause gets optional `AND post_type = ?` when filter is `notes` or `blooms`
- `WHERE visible = 1` already covers both types (good)
- Hot/Popular/Top algorithms work identically for Notes (they have scores too)

### Service layer fixes

- [ ] Add `notes` and `blooms` to FeedFilter union
- [ ] Add `post_type` filter to `getFeed()` WHERE clause
- [ ] Create `createNote(db, userId, body, tags?)` function in new `notes.ts` service file
- [ ] Note creation: generates UUID, sets `post_type = 'note'`, `published_at = now`, `body`, synthetic guid/title/link

---

## 4. API Endpoints

**Character**: The gate where Notes enter the meadow.

### Safari findings: What exists today

- [x] `GET /api/feed` — paginated feed (works for both types, just add filter)
- [x] All interaction endpoints (vote, react, bookmark, report) — work on any post regardless of type
- [ ] **No `POST /api/feed` or `POST /api/notes`** — can't create a Note
- [ ] **No `DELETE /api/notes/[id]`** — can't delete your own Note
- [ ] **No `PATCH /api/notes/[id]`** — can't edit a Note (do we want this?)

### Design spec (safari-approved)

**New endpoints:**

| Route             | Method | Purpose              | Auth                   |
| ----------------- | ------ | -------------------- | ---------------------- |
| `/api/notes`      | POST   | Create a Note        | Required               |
| `/api/notes/[id]` | DELETE | Delete your own Note | Required (author only) |

**POST /api/notes** request body:

```json
{ "body": "Quick thought about the weather today", "tags": ["thoughts"] }
```

**Validation:**

- `body` required, 1-500 characters, trimmed
- `tags` optional, max 5, each tag max 30 chars
- Rate limit: 30 notes per hour (via Threshold)

**No edit endpoint for v1.** Notes are quick thoughts. If you want to fix it, delete and repost. Keeps it simple.

### API fixes

- [ ] Create `POST /api/notes/+server.ts` — create a Note
- [ ] Create `DELETE /api/notes/[id]/+server.ts` — delete own Note
- [ ] Add `filter=notes` and `filter=blooms` support to existing `GET /api/feed`
- [ ] Add Threshold rate limiting to Note creation (30/hr)

---

## 5. PostCard Component

**Character**: The visual card that now shows two faces — long-form Blooms and short Notes.

### Safari findings: What exists today

**`apps/meadow/src/lib/components/PostCard.svelte`** (172 lines):

- [x] GlassCard-based, dark mode support, reduced motion
- [x] Author header with avatar, name, time
- [x] Action bar with vote + bookmark (44px touch targets)
- [x] Featured image with lazy loading
- [x] Tag badges (max 4 shown)
- [ ] **Title links externally** (`target="_blank"`) — Notes have no external link
- [ ] **No `body` rendering** — Notes need inline text display
- [ ] **No type awareness** — renders everything as a Bloom card
- [ ] **Author links to subdomain** — Note authors might not have a grove

### Design spec (safari-approved)

**PostCard should render differently based on `postType`:**

**Bloom card (current behavior, keep as-is):**

```
┌──────────────────────────────────────┐
│  [A] Author · subdomain · 3h ago     │
│                                      │
│  Title (links to external post) →    │
│  Description excerpt (3 lines max)   │
│  [Featured image]                    │
│  [tag] [tag] [tag]                   │
│                                      │
│  ▲ 12          🔖                    │
└──────────────────────────────────────┘
```

**Note card (new):**

```
┌──────────────────────────────────────┐
│  [A] Author · 3h ago                │
│                                      │
│  The body text of the note goes      │
│  here, up to 500 characters. No      │
│  title. No link. Just words.         │
│                                      │
│  [tag] [tag]                         │
│                                      │
│  ▲ 5           🔖                    │
└──────────────────────────────────────┘
```

**Key differences in Note rendering:**

- No title (hidden, not just empty)
- Body text rendered directly (not description excerpt)
- No featured image
- No external link icon
- Author links to profile (not subdomain, unless they have one)
- Slightly different typography — body text larger since it IS the content

### PostCard fixes

- [ ] Add conditional rendering based on `post.postType`
- [ ] Bloom path: keep current behavior exactly
- [ ] Note path: render `post.body` as primary content, no title, no external link
- [ ] Handle author link: subdomain if available, otherwise no link
- [ ] Note body typography: `text-base leading-relaxed` (larger than description excerpt)

---

## 6. Feed Page + Compose UI

**Character**: The meadow clearing where you can now speak, not just listen.

### Safari findings: What exists today

**`apps/meadow/src/routes/feed/+page.svelte`** (251 lines):

- [x] FeedFilters tab bar
- [x] PostCard list with load-more pagination
- [x] Optimistic vote, bookmark, react
- [x] Auth-gated interactions with login redirect
- [ ] **No compose box** — the feed is read-only
- [ ] **No "notes" or "blooms" filter tabs**

### Design spec (safari-approved)

**Compose box** — appears at the top of the feed for authenticated users:

```
┌──────────────────────────────────────┐
│  [A]  Leave a note in the meadow...  │
│                                      │
│                           [0/500] 🌿 │
└──────────────────────────────────────┘
```

- Click to expand into a proper textarea
- Character counter (grows from muted to warning at 450+)
- Optional tag input (pills, max 5)
- Submit button: a small leaf or sprout icon
- Collapsed state: single line, avatar + placeholder text
- Glass surface, matching PostCard styling

**FeedFilters additions:**

Current tabs: All | Popular | Hot | Top | Following

New: All | Notes | Blooms | Popular | Hot | Top | Following

Or keep it simpler: All | Popular | Hot | Top | Following with a type filter dropdown?

Recommendation: Add "Notes" and "Blooms" as filter tabs alongside the existing ones.

### Feed page fixes

- [ ] Create `ComposeBox.svelte` component
- [ ] Add to feed page (above PostCard list, only when logged in)
- [ ] Wire to `POST /api/notes` with optimistic insert
- [ ] Add "Notes" and "Blooms" filter options to FeedFilters
- [ ] Update `+page.server.ts` to pass `filter=notes` / `filter=blooms` to service layer

---

## 7. Feed Detail Page (`/feed/[id]`)

**Character**: The close-up view — different for each species.

### Safari findings: What exists today

**`apps/meadow/src/routes/feed/[id]/+page.svelte`** + `+page.server.ts`:

- [x] Loads single post with full `content_html`
- [x] Renders Bloom content
- [ ] **No awareness of Notes** — would render empty content for a Note
- [ ] **No body rendering** for Notes

### Detail page fixes

- [ ] If `post.postType === 'note'`: render `post.body` as the main content, larger text
- [ ] If `post.postType === 'bloom'`: keep current `content_html` rendering
- [ ] Note detail: show full body, author info, all reactions, delete button (if author)

---

## 8. Poller Pipeline

**Character**: The wind that carries Blooms from groves to the meadow. Untouched by Notes.

### Safari findings: What exists today

- [x] Solid RSS fetch, parse, sanitize, upsert pipeline
- [x] KV poll state with ETag and backoff
- [x] SSRF protection, content size limits, XXE prevention
- [x] Content hash for change detection

**No changes needed.** The poller only handles Blooms. Notes bypass the poller entirely — they're created directly via the API. The only addition is that the poller should set `post_type = 'bloom'` explicitly on upsert, which the DEFAULT clause already handles.

### Poller fix (minimal)

- [ ] Confirm DEFAULT 'bloom' works for existing upserts (it does — migration sets the default)

---

## Expedition Summary

### By the numbers

| Metric                | Count                                      |
| --------------------- | ------------------------------------------ |
| Total stops           | 8                                          |
| Thriving (no changes) | 1 (poller)                                 |
| Growing (extend)      | 4 (schema, types, service, feed queries)   |
| Barren (create new)   | 3 (compose UI, create API, Note rendering) |
| Total fix items       | ~25                                        |

### Recommended trek order

1. **Migration 078** — schema first, everything depends on it
2. **Types** — `MeadowPost`, `PostRow`, `rowToPost()` updates
3. **Service layer** — `createNote()` + feed filter extensions
4. **API** — `POST /api/notes`, `DELETE /api/notes/[id]`, feed filter params
5. **PostCard** — conditional rendering for Note vs Bloom
6. **ComposeBox** — new component
7. **Feed page** — wire ComposeBox + filter tabs
8. **Detail page** — Note-aware rendering

### Cross-cutting themes

1. **Same table, type discriminator** — `post_type = 'bloom' | 'note'` keeps queries simple
2. **Synthetic fields for Notes** — `title=''`, `link=''`, `guid='note:{id}'` satisfy existing NOT NULL constraints without a schema overhaul
3. **User identity for Notes** — `user_id` column maps to Heartwood user, not tenant. First time a meadow_posts row isn't tenant-sourced.
4. **No edit for v1** — Notes are quick thoughts. Delete and repost. Simplicity wins.
5. **Rate limiting** — 30 notes/hour via Threshold on the create endpoint

---

_The fire dies to embers. The journal is full — 8 stops, ~25 fixes sketched, the dual-content meadow mapped from soil to sky. Notes and Blooms, growing together. Tomorrow, the animals go to work. But tonight? Tonight was the drive. And it was glorious._
