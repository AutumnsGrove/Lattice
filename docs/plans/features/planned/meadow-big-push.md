---
title: "Meadow v1 — The Big Push Forward"
status: planned
category: features
---

# Meadow v1 — The Big Push Forward

## Context

The RSS infrastructure is deployed and running: engine feed serves `content:encoded` from D1, meadow-poller runs every 15 minutes, PostCard component is built with glassmorphism + a11y, and migration 076 created all 6 social tables. Meadow currently renders a "coming soon" landing page.

This plan transforms Meadow from a landing page into a living community feed — the place where the forest opens up.

---

## What Exists (Infrastructure — COMPLETE)

| Component                                                                   | Status            |
| --------------------------------------------------------------------------- | ----------------- |
| Engine `/api/feed` with D1 + content:encoded + ETag                         | Deployed          |
| Migration 076 (meadow_posts, votes, reactions, bookmarks, follows, reports) | Ready             |
| meadow-poller worker (cron + parse + upsert)                                | Deployed, running |
| PostCard.svelte (glassmorphism, a11y, dark mode)                            | Built, not wired  |
| MeadowPost type + formatRelativeTime util                                   | Built             |
| wrangler.toml (DB, CACHE_KV, AUTH bindings)                                 | Configured        |
| app.d.ts (Locals.user, CACHE_KV, AUTH)                                      | Updated           |
| Deploy workflow (deploy-meadow-poller.yml)                                  | On main           |

---

## Build Plan — 7 Phases

### Phase 1: Auth Drop-In (3 files, ~100 lines)

Reuse Landing's proven dual-auth strategy. Everything downstream depends on `locals.user`.

| File                                                  | Action                                                                      | Reference                                   |
| ----------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------- |
| `apps/meadow/src/hooks.server.ts`                 | **Create** — Heartwood SessionDO (primary) + D1 fallback, CSRF on mutations | `apps/landing/src/hooks.server.ts`      |
| `apps/meadow/src/routes/auth/callback/+server.ts` | **Create** — `createCallbackHandler({ defaultReturnTo: "/feed" })`          | `@autumnsgrove/lattice/grafts/login/server` |
| `apps/meadow/src/routes/+layout.server.ts`        | **Modify** — Add `user: locals.user` to returned data                       | Already returns `messages`                  |

Key imports:

- `buildLoginUrl` from `@autumnsgrove/lattice/grafts/login`
- `createCallbackHandler` from `@autumnsgrove/lattice/grafts/login/server`
- Auth cookie names from engine config

### Phase 2: Service Layer + Constants (7 files, ~380 lines)

Thin query functions over D1. Each file isolates one concern.

**New directory:** `apps/meadow/src/lib/server/`

| File           | Key Functions                                                 | Notes                                                                                                                           |
| -------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`     | `FeedFilter`, `FeedSort`, `FeedPage`, `ReportReason` enums    | Shared response types                                                                                                           |
| `feed.ts`      | `getFeed(db, { filter, sort, userId, limit, offset })`        | 5 algorithms: all, popular, hot, top, following. Left-joins user votes/bookmarks. Returns `{ posts: MeadowPost[], pagination }` |
| `votes.ts`     | `castVote()`, `removeVote()`, `updatePostScore()`             | Score = COUNT from meadow_votes. Updates denormalized `score` on meadow_posts                                                   |
| `reactions.ts` | `addReaction()`, `removeReaction()`, `updateReactionCounts()` | Validates emoji via Set. Updates denormalized `reaction_counts` JSON                                                            |
| `bookmarks.ts` | `toggleBookmark()`                                            | INSERT or DELETE, returns new boolean state                                                                                     |
| `follows.ts`   | `followBlog()`, `unfollowBlog()`, `getFollowing()`            | Powers "Following" filter tab                                                                                                   |

**New file:** `apps/meadow/src/lib/constants/reactions.ts` (~30 lines)

10 warm emojis per spec (no angry):

```
❤️ Love, 💛 Warm, 💚 Growth, 💙 Calm, 💜 Creative,
😂 Joy, 😮 Wow, 😢 Moved, ✨ Magic, 🌱 Growing
```

Plus `MEADOW_REACTIONS` Set + `isValidReaction()` guard (same pattern as guestbook's `isValidEmoji`).

**Feed algorithms (from spec):**

- **All:** `ORDER BY published_at DESC` (chronological)
- **Popular:** `ORDER BY score DESC, published_at DESC`
- **Hot:** HN-style decay — `score / POWER((hours_since + 2), 1.5)`
- **Top:** `WHERE published_at >= :period_start ORDER BY score DESC` (day/week/month)
- **Following:** JOIN on `meadow_follows` for user's subscribed blogs

### Phase 3: API Endpoints (8 files, ~400 lines)

RESTful SvelteKit routes. Auth-required endpoints return 401 for anon. Rate limiting via IP-hash pattern (ref: guestbook curio).

**Feed endpoints** (`apps/meadow/src/routes/api/feed/`):

| Route                      | Methods      | Purpose                     | Auth     |
| -------------------------- | ------------ | --------------------------- | -------- |
| `+server.ts`               | GET          | Paginated feed with filters | Optional |
| `[id]/vote/+server.ts`     | POST, DELETE | Cast/remove upvote          | Required |
| `[id]/reaction/+server.ts` | POST, DELETE | Add/remove emoji            | Required |
| `[id]/bookmark/+server.ts` | POST         | Toggle bookmark             | Required |
| `[id]/report/+server.ts`   | POST         | Report with reason          | Required |

**User endpoints** (`apps/meadow/src/routes/api/`):

| Route                          | Methods      | Purpose               | Auth     |
| ------------------------------ | ------------ | --------------------- | -------- |
| `bookmarks/+server.ts`         | GET          | User's saved posts    | Required |
| `following/+server.ts`         | GET          | User's followed blogs | Required |
| `follow/[tenantId]/+server.ts` | POST, DELETE | Follow/unfollow       | Required |

Response format (consistent with guestbook pattern):

```json
{ "posts": [...], "pagination": { "total": 120, "limit": 20, "offset": 0, "hasMore": true } }
```

Error handling: `buildErrorJson(API_ERRORS.*)` per Signpost standard. Client calls via `api.post()` / `api.get()` from engine utils (handles CSRF + credentials).

### Phase 4: Feed UI — The Transformation (~6 files, ~500 lines)

The coming-soon page becomes a living feed.

| File                                   | Action                                                                           | Lines       |
| -------------------------------------- | -------------------------------------------------------------------------------- | ----------- |
| `routes/feed/+page.server.ts`          | **Create** — Load initial feed (20 posts, default "all" filter), join user state | ~40         |
| `routes/feed/+page.svelte`             | **Create** — FeedFilters + PostCard list + "Load more" + empty states            | ~150        |
| `routes/feed/+layout.svelte`           | **Create** — Feed-specific layout with Header (user nav) + Footer                | ~30         |
| `lib/components/FeedFilters.svelte`    | **Create** — Tab bar (All/Popular/Hot/Top/Following), URL param preservation     | ~60         |
| `lib/components/ReactionPicker.svelte` | **Create** — Popover emoji grid, keyboard nav, click-outside dismiss             | ~80         |
| `routes/+page.svelte`                  | **Modify** — Route to `/feed` when posts exist, keep landing as empty state      | ~20 changed |

**Key UX decisions from spec:**

- Votes are private (no public score visible — only the voter sees their own state)
- Reactions visible as emoji icons on cards, counts only visible to author
- "Following" tab only shown when logged in
- Anon users can browse but vote/react/bookmark buttons prompt login

### Phase 5: Post Detail + Bookmarks (4 files, ~200 lines)

| File                               | Purpose                                                             |
| ---------------------------------- | ------------------------------------------------------------------- |
| `routes/feed/[id]/+page.server.ts` | Load single post with full contentHtml + all reactions              |
| `routes/feed/[id]/+page.svelte`    | Full post view — rendered HTML, all reactions, author info, actions |
| `routes/bookmarks/+page.server.ts` | Load user's saved posts (auth required)                             |
| `routes/bookmarks/+page.svelte`    | Paginated bookmarks list using PostCard                             |

### Phase 6: Basic Moderation (2 files + migration, ~100 lines)

| File                                | Purpose                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `lib/components/ReportModal.svelte` | Reason picker (spam/harassment/misinformation/other) + detail text      |
| `migrations/077_meadow_visible.sql` | `ALTER TABLE meadow_posts ADD COLUMN visible INTEGER DEFAULT 1` + index |

Auto-hide logic lives in the report API endpoint: after INSERT, if `COUNT(*) >= 3` reports → set `visible = 0`. Feed queries filter on `visible = 1`.

### Phase 7: Verify + Ship

1. `pnpm install`
2. `gw ci --affected --fail-fast --diagnose`
3. Manual test: opt in a test tenant, trigger poller, verify feed renders
4. Commit + push

---

## Execution Order

```
Phase 1 (Auth) ─────────→ Phase 2 (Service Layer + Constants)
                                    │
                          Phase 3 (API Endpoints)
                                    │
                          Phase 4 (Feed UI)
                                    │
                    ┌───────────────┴───────────────┐
              Phase 5 (Detail + Bookmarks)    Phase 6 (Moderation)
                    └───────────────┬───────────────┘
                                    │
                          Phase 7 (Verify + Ship)
```

## Key Files to Reference During Build

| Pattern                 | File                                                             |
| ----------------------- | ---------------------------------------------------------------- |
| Auth hooks              | `apps/landing/src/hooks.server.ts`                           |
| Auth callback           | `apps/landing/src/routes/auth/callback/+server.ts`           |
| buildLoginUrl           | `libs/engine/src/lib/grafts/login/config.ts`                 |
| createCallbackHandler   | `libs/engine/src/lib/grafts/login/server/callback.ts`        |
| Pagination pattern      | `libs/engine/src/routes/api/curios/guestbook/+server.ts`     |
| Emoji validation        | `libs/engine/src/lib/curios/guestbook/index.ts`              |
| Rate limiting (IP-hash) | `libs/engine/src/routes/api/curios/guestbook/+server.ts:192` |
| Client API calls        | `libs/engine/src/lib/utils/api.ts` (api.post, api.get)       |
| Error responses         | `@autumnsgrove/lattice/errors` (buildErrorJson, API_ERRORS)      |

## Summary

| Metric         | Value                      |
| -------------- | -------------------------- |
| New files      | ~26                        |
| Modified files | ~4                         |
| New lines      | ~1,660                     |
| New migration  | 077 (visible column)       |
| Dependencies   | None new (all from engine) |

## What's Deferred (v1.1+)

- PWA / offline support (5-week effort per separate plan)
- Author stats dashboard (private view of their post engagement)
- Downvotes (schema supports it, UI doesn't expose yet)
- Comments / replies
- Search
- Shadow banning / advanced moderation
- Arbor admin pages for feed management
- Notification system
