---
title: "Meadow Notes — Dual Content Types for the Community Feed"
status: planned
category: features
---

# Meadow Notes — Dual Content Types for the Community Feed

## Context

Meadow v1 is live on `feat/meadow-v1-community-feed`: auth, service layer, 5 feed algorithms, API endpoints (vote/bookmark/react/report/follow), PostCard, FeedFilters, feed page with pagination + optimistic updates, detail page, and the RSS poller. Everything works for Blooms (RSS-syndicated blog posts).

Notes are short-form posts written directly on Meadow. Up to 500 characters, no title, no external link. Just words left in the meadow for others to find. This plan adds Notes alongside Blooms in one unified timeline.

**Safari journal:** `docs/plans/active/meadow-notes-safari.md` (full design spec)

---

## Phase 1: Migration 078 — Schema

**New file:** `libs/engine/migrations/078_meadow_notes_support.sql`

```sql
ALTER TABLE meadow_posts ADD COLUMN post_type TEXT NOT NULL DEFAULT 'bloom';
ALTER TABLE meadow_posts ADD COLUMN user_id TEXT;
ALTER TABLE meadow_posts ADD COLUMN body TEXT;

CREATE INDEX IF NOT EXISTS idx_meadow_posts_user
  ON meadow_posts(user_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_meadow_posts_type
  ON meadow_posts(post_type, published_at DESC);
```

**Key decisions:**

- `post_type` discriminator: `'bloom'` (RSS) or `'note'` (native)
- `user_id` links to Heartwood user (not tenant). First non-tenant-sourced row in this table.
- `body` is plain text, 500 char max enforced at API layer
- Notes set `title = ''`, `link = ''`, `guid = 'note:{uuid}'` to satisfy existing NOT NULL constraints
- `tenant_id` is NULL for Notes from users without a grove

---

## Phase 2: Types

**Modify:** `apps/meadow/src/lib/types/post.ts`

Add to `MeadowPost` interface:

```typescript
postType: "bloom" | "note";
body: string | null;
userId: string | null;
```

**Modify:** `apps/meadow/src/lib/server/types.ts`

Add to `PostRow` interface:

```typescript
post_type: string;
user_id: string | null;
body: string | null;
```

Add to `FeedFilter` union: `"notes" | "blooms"`

Update `rowToPost()` to map new fields:

```typescript
postType: (row.post_type as 'bloom' | 'note') || 'bloom',
body: row.body ?? null,
userId: row.user_id ?? null,
```

**New type:** `NoteCreatePayload = { body: string; tags?: string[] }`

---

## Phase 3: Service Layer

**Modify:** `apps/meadow/src/lib/server/feed.ts`

- Add `post_type` filter to `getFeed()` WHERE clause when filter is `"notes"` or `"blooms"`
- Pattern: `AND post_type = ?` with bind param

**New file:** `apps/meadow/src/lib/server/notes.ts`

```typescript
export async function createNote(db, userId, body, tags?): Promise<MeadowPost>;
export async function deleteNote(db, userId, noteId): Promise<boolean>;
```

`createNote` generates UUID, inserts with:

- `post_type = 'note'`
- `guid = 'note:{uuid}'`
- `title = ''`, `link = ''`, `content_html = null`
- `body = trimmed input`
- `user_id = userId`
- `tenant_id = null` (or user's tenant_id if they have a grove)
- `published_at = Math.floor(Date.now() / 1000)`
- `tags = JSON.stringify(tags || [])`

`deleteNote` verifies `user_id = userId` before DELETE.

---

## Phase 4: API Endpoints

**New file:** `apps/meadow/src/routes/api/notes/+server.ts`

- **POST** — Create a Note
  - Auth required (`locals.user`)
  - Rate limit: `meadow/notes:${userId}`, 30/hour, failMode "open"
  - Validate: `body` required, 1-500 chars trimmed, `tags` optional max 5 items each max 30 chars
  - Returns `{ success: true, post: MeadowPost }`

**New file:** `apps/meadow/src/routes/api/notes/[id]/+server.ts`

- **DELETE** — Delete your own Note
  - Auth required
  - Rate limit: `meadow/notes/delete:${userId}`, 60/hour
  - Verify ownership (user_id match)
  - Returns `{ success: true, deleted: true }`

**Modify:** `apps/meadow/src/routes/api/feed/+server.ts`

- Accept `filter=notes` and `filter=blooms` query params (already handled by FeedFilter union change in Phase 2)

---

## Phase 5: PostCard — Conditional Rendering

**Modify:** `apps/meadow/src/lib/components/PostCard.svelte`

Add conditional rendering based on `post.postType`:

**Bloom path** (current behavior, unchanged):

- Title links externally, description excerpt, featured image, subdomain in author line

**Note path** (new):

- No title section
- `post.body` rendered as primary content with `text-base leading-relaxed` (larger since it IS the content)
- No featured image
- No external link icon
- Author links to profile if they have a subdomain, otherwise just shows name
- Same action bar (vote, bookmark, react)

---

## Phase 6: ComposeBox + Feed Page

**New file:** `apps/meadow/src/lib/components/ComposeBox.svelte`

Compose box for authenticated users at top of feed:

- Collapsed: avatar + "Leave a note in the meadow..." placeholder (single line, glass surface)
- Expanded on click: textarea, character counter (muted -> warning at 450+), optional tag pills (max 5), submit button
- Wires to `POST /api/notes`
- On success: collapses, prepends new Note to feed optimistically

**Modify:** `apps/meadow/src/routes/feed/+page.svelte`

- Import and render ComposeBox above PostCard list (only when `data.user` exists)
- Handle `oncreated` event from ComposeBox to prepend new post to feed array

**Modify:** `apps/meadow/src/lib/components/FeedFilters.svelte`

- Add "Notes" and "Blooms" tabs to the filter list

**Modify:** `apps/meadow/src/routes/feed/+page.server.ts`

- Pass `filter=notes` / `filter=blooms` through to service layer (already works if FeedFilter union is extended)

---

## Phase 7: Detail Page

**Modify:** `apps/meadow/src/routes/feed/[id]/+page.svelte`

- If `post.postType === 'note'`: render `post.body` as main content (large text, no HTML), show delete button if `post.userId === data.user?.id`
- If `post.postType === 'bloom'`: keep current `{@html post.contentHtml}` rendering

**Modify:** `apps/meadow/src/routes/feed/[id]/+page.server.ts`

- Include new columns in SELECT query (`post_type`, `user_id`, `body`)

---

## Phase 8: Poller (verify only)

**No changes needed.** The `DEFAULT 'bloom'` on `post_type` handles existing RSS upserts. Confirm with a read of the poller's INSERT/UPSERT statement.

---

## File Summary

| Action     | File                                                      | Phase |
| ---------- | --------------------------------------------------------- | ----- |
| **Create** | `libs/engine/migrations/078_meadow_notes_support.sql` | 1     |
| **Modify** | `apps/meadow/src/lib/types/post.ts`                   | 2     |
| **Modify** | `apps/meadow/src/lib/server/types.ts`                 | 2     |
| **Modify** | `apps/meadow/src/lib/server/feed.ts`                  | 3     |
| **Create** | `apps/meadow/src/lib/server/notes.ts`                 | 3     |
| **Create** | `apps/meadow/src/routes/api/notes/+server.ts`         | 4     |
| **Create** | `apps/meadow/src/routes/api/notes/[id]/+server.ts`    | 4     |
| **Modify** | `apps/meadow/src/routes/api/feed/+server.ts`          | 4     |
| **Modify** | `apps/meadow/src/lib/components/PostCard.svelte`      | 5     |
| **Create** | `apps/meadow/src/lib/components/ComposeBox.svelte`    | 6     |
| **Modify** | `apps/meadow/src/routes/feed/+page.svelte`            | 6     |
| **Modify** | `apps/meadow/src/lib/components/FeedFilters.svelte`   | 6     |
| **Modify** | `apps/meadow/src/routes/feed/+page.server.ts`         | 6     |
| **Modify** | `apps/meadow/src/routes/feed/[id]/+page.svelte`       | 7     |
| **Modify** | `apps/meadow/src/routes/feed/[id]/+page.server.ts`    | 7     |

**New files:** 4 | **Modified files:** 11 | **Estimated new lines:** ~500

---

## Key Patterns to Reuse

| Pattern                   | Source File                                                |
| ------------------------- | ---------------------------------------------------------- |
| Auth check + 401 response | `apps/meadow/src/routes/api/feed/[id]/vote/+server.ts` |
| Threshold rate limiting   | Same file — `createThreshold()` + `thresholdCheck()`       |
| Service layer D1 queries  | `apps/meadow/src/lib/server/votes.ts`                  |
| `rowToPost()` transform   | `apps/meadow/src/lib/server/types.ts:88`               |
| Feed query builder        | `apps/meadow/src/lib/server/feed.ts:65`                |
| Optimistic UI updates     | `apps/meadow/src/routes/feed/+page.svelte:80`          |
| Glass card styling        | `apps/meadow/src/lib/components/PostCard.svelte`       |
| `api.post()` client calls | `@autumnsgrove/lattice/utils/api`                          |

---

## Verification

1. `pnpm install` (no new deps)
2. Apply migration 078 locally (or verify schema via wrangler d1)
3. Type check: `npx svelte-check --tsconfig ./tsconfig.json` in `apps/meadow/`
4. Manual test flow:
   - Visit `/feed` logged in -> ComposeBox visible
   - Write a note -> appears in feed optimistically
   - Filter to "Notes" -> only notes shown
   - Filter to "Blooms" -> only blooms shown
   - Click note in feed -> detail page renders body
   - Delete own note -> removed from feed
   - Visit `/feed` logged out -> no ComposeBox, notes still visible in feed
5. `gw ci --affected --fail-fast --diagnose`
