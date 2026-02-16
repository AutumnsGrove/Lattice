---
aliases: []
date created: Saturday, February 15th 2026
date modified: Saturday, February 15th 2026
tags:
  - meadow
  - durable-objects
  - loom
  - cloudflare-workers
type: tech-spec
---

# Meadow Loom — Durable Object Coordination for the Community Feed

```
                    🌿          🌿          🌿
                     \    🌸    /
                      \   |   /
                       \  |  /
                  ╭─────────────╮
                  │  UserFeedDO │
                  │  feed:{you} │
                  ╰──────┬──────╯
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        ╭──────────╮╭──────────╮╭──────────╮
        │ PostMeta ││ PostMeta ││ PostMeta │
        │ DO  ❤️   ││ DO  ✨   ││ DO  💚   │
        ╰─────┬────╯╰─────┬────╯╰─────┬────╯
              │            │            │
              └──────────┬─┘────────────┘
                         │
                    ┌────┴────┐
                    │   D1    │
                    │  truth  │
                    └─────────┘

          The meadow listens when you arrive.
```

> _The meadow listens when you arrive. Not before._

Meadow's Durable Object layer. DOs coordinate reads and pool writes. D1 stays the source of truth. Nothing happens until someone asks for it.

**Public Name:** Meadow Loom
**Internal Name:** GroveMeadowLoom
**Domain:** `meadow.grove.place`
**Parent Spec:** [Loom (Durable Objects Pattern)](./loom-durable-objects-pattern.md)
**Parent Spec:** [Meadow v1](../plans/planning/meadow-v1-plan.md)
**Last Updated:** February 2026

The original Loom spec describes FeedDO as a push-based system where new posts fan out to followers' DOs. This spec replaces that model with pull-based coordination. The meadow doesn't whisper to you while you're away. It waits. When you come back and sit down, it tells you everything at once.

---

## Philosophy

DOs are the nervous system. D1 is the skeleton.

```
┌──────────────────────────────────────────────────────┐
│  D1                                                    │
│  Source of truth. Always readable. Always queryable.   │
│  Data lives here. Period.                              │
├──────────────────────────────────────────────────────┤
│  DOs                                                   │
│  Coordination layer. Pools writes, batches reads,      │
│  buffers interactions, flushes to D1.                  │
│  Ephemeral by nature. Can die and rehydrate from D1.   │
│  Never the only place data lives.                      │
├──────────────────────────────────────────────────────┤
│  KV                                                    │
│  Cheap invalidation signals. Timestamps only.          │
│  Written by the poller. Read by DOs on demand.         │
└──────────────────────────────────────────────────────┘
```

Three rules:

1. **D1 is always truth.** Every piece of data must live in D1. DOs cache and coordinate, never own.
2. **Pull, never push.** Nothing updates until the user asks. No fan-out. No ghost writes for absent users.
3. **DOs can die at any time.** If a DO crashes, disappears, or hibernates for a month, everything rehydrates cleanly from D1. Zero data loss.

---

## Architecture

### The Two DOs

| DO             | ID Pattern               | One per... | Purpose                                                                                                |
| -------------- | ------------------------ | ---------- | ------------------------------------------------------------------------------------------------------ |
| **UserFeedDO** | `feed:{userId}`          | User       | Coordinates feed reads. Checks freshness, queries D1, returns complete feed.                           |
| **PostMetaDO** | `post:{tenantId}:{slug}` | Post       | Pools ALL interactions (votes, reactions, bookmarks, reports). Buffers writes, flushes to D1 on alarm. |

PostMetaDO already exists in the Loom ecosystem for engine blog posts. Meadow extends it to handle community feed interactions. A post that does well on Meadow translates directly to its blog counterpart. Same object, same data, same truth.

### Request Flow: Loading the Feed

```
Bob opens meadow.grove.place/feed
              │
              ▼
     ┌────────────────┐
     │  SvelteKit SSR  │
     │  +page.server   │
     └────────┬───────┘
              │ platform.env.FEEDS.get(idFromName("feed:bob"))
              ▼
     ╭────────────────╮
     │  UserFeedDO    │
     │  feed:bob      │
     ╰────────┬───────╯
              │
              │  1. When did I last build Bob's feed?
              │     last_refreshed = 1739621400  (20 min ago)
              │
              │  2. Check KV: any followed tenant updated since?
              │     GET "feed_updated:{alice_id}" → 1739622000 ✓ newer
              │     GET "feed_updated:{carol_id}" → 1739620000 ✗ stale
              │
              │  3. Query D1 for ONLY the delta:
              │     SELECT * FROM meadow_posts
              │     WHERE tenant_id = '{alice_id}'
              │     AND published_at > 1739621400
              │
              │  4. Merge delta into cached feed
              │     Sort by selected algorithm
              │     Return complete page
              │
              ▼
     Bob sees fresh feed
     Cost: N KV reads + 1 targeted D1 query
```

**On first visit (cold start):** The DO has no cached feed. It queries D1 for the full feed (same query as today's `getFeed()`). This is equivalent to the current v1 behavior. The Passage-style loading animation covers the 3-5 seconds.

**On return visit (warm cache):** The DO checks KV timestamps. If nothing changed, it returns the cached feed instantly. If some blogs updated, it queries only the delta and merges. Fast.

**On cold wake (after hibernation):** The DO rehydrates from D1. Same as first visit. No data was stored in DO SQLite. Nothing to lose.

### Request Flow: Interacting with a Post

```
Bob votes on Alice's post
              │
              ▼
     ┌────────────────┐
     │  POST /api/    │
     │  feed/[id]/vote│
     └────────┬───────┘
              │ platform.env.POST_META.get(idFromName("post:alice:my-post"))
              ▼
     ╭────────────────────╮
     │  PostMetaDO         │
     │  post:alice:my-post │
     │                     │
     │  votes: Set<uid>    │  ← bob added to set (in-memory)
     │  reactions: Map     │
     │  bookmarks: Set     │
     │  reports: []        │
     │  score: 42 → 43    │
     │                     │
     │  dirty: true        │  ← flagged for next flush
     ╰────────────────────╯
              │
              │  (alarm fires every 30-60 seconds)
              │
              ▼
     ┌──────────────────────────────────┐
     │  D1 batch write:                  │
     │  INSERT INTO meadow_votes ...     │
     │  UPDATE meadow_posts SET score=43 │
     └──────────────────────────────────┘
```

**Why this is better than D1-direct:**

| Metric               | D1-direct (v1)              | DO-coordinated                    |
| -------------------- | --------------------------- | --------------------------------- |
| 50 votes in 1 minute | 100 D1 queries (2 per vote) | ~2 D1 queries (1-2 batch flushes) |
| Vote response time   | D1 round-trip (~5-20ms)     | DO in-memory (~1-2ms)             |
| Score consistency    | Recount after each vote     | Atomic increment in memory        |
| Real-time potential  | None (poll only)            | WebSocket broadcast on every vote |

### Request Flow: Poller Writes Invalidation Signals

```
meadow-poller cron fires (every 15 min)
              │
              ▼
     ┌────────────────────────┐
     │  For each polled tenant: │
     │  Upsert posts to D1      │
     │  (same as today)          │
     └────────┬───────────────┘
              │
              │  After successful upsert:
              │
              ▼
     ┌──────────────────────────────────────────┐
     │  KV.put("feed_updated:{tenant_id}",       │
     │         String(Math.floor(Date.now()/1000)),│
     │         { expirationTtl: 86400 })          │
     └──────────────────────────────────────────┘
```

That's it. The poller writes one KV key per tenant it polled. No fan-out. No DO calls. No awareness of followers. The DOs discover the changes on their own terms.

---

## D1 Schema (unchanged)

The existing Meadow v1 tables remain the source of truth. DOs don't introduce new tables.

```
meadow_posts          ← Content + denormalized aggregates
meadow_votes          ← Individual vote records
meadow_reactions      ← Individual reaction records
meadow_bookmarks      ← Individual bookmark records
meadow_follows        ← User → tenant subscriptions
meadow_reports        ← Moderation reports
```

DOs read from and write to these tables. The schema doesn't change. What changes is _how_ and _when_ writes happen.

### Denormalized Fields on meadow_posts

| Field             | Updated by                             | Frequency                     |
| ----------------- | -------------------------------------- | ----------------------------- |
| `score`           | PostMetaDO flush                       | Every 30-60 seconds (batched) |
| `reaction_counts` | PostMetaDO flush                       | Every 30-60 seconds (batched) |
| `visible`         | PostMetaDO flush (on report threshold) | On report, batched            |

---

## UserFeedDO

### Purpose

Coordinates feed reads for a single user. Checks freshness via KV timestamps, queries D1 for new content, merges with cached state, returns complete feed.

### ID Pattern

`feed:{userId}` (e.g., `feed:usr_abc123`)

### State (in-memory only, rehydrates from D1)

```typescript
interface UserFeedState {
  // Cached feed pages (in-memory, lost on hibernation)
  cachedPosts: MeadowPost[];
  lastRefreshedAt: number; // Unix seconds

  // User's followed tenant IDs (cached from D1)
  followedTenantIds: string[];
  followsCachedAt: number; // When follows were last loaded

  // Per-tenant KV timestamps from last check
  knownVersions: Map<string, number>; // tenantId → last known timestamp
}
```

### Rehydration (on wake from hibernation)

```typescript
async rehydrate(db: D1Database): Promise<void> {
  // 1. Load user's follows from D1
  const follows = await db.prepare(
    "SELECT followed_tenant_id FROM meadow_follows WHERE follower_id = ?"
  ).bind(this.userId).all();

  this.followedTenantIds = follows.results.map(r => r.followed_tenant_id);

  // 2. Clear cached feed (will rebuild on next getFeed call)
  this.cachedPosts = [];
  this.lastRefreshedAt = 0;
}
```

### Methods

| Method             | Route                                | Description                                                  |
| ------------------ | ------------------------------------ | ------------------------------------------------------------ |
| `GET /feed`        | `getFeed({ filter, limit, offset })` | Return feed, refreshing from D1 if stale                     |
| `POST /invalidate` | `invalidate()`                       | Force refresh on next request (called after follow/unfollow) |

### Freshness Check

```typescript
async checkFreshness(kv: KVNamespace): Promise<string[]> {
  // Check KV timestamps for all followed tenants
  const stale: string[] = [];

  for (const tenantId of this.followedTenantIds) {
    const updatedAt = await kv.get(`feed_updated:${tenantId}`);
    if (!updatedAt) continue;

    const ts = parseInt(updatedAt, 10);
    const known = this.knownVersions.get(tenantId) ?? 0;

    if (ts > known) {
      stale.push(tenantId);
      this.knownVersions.set(tenantId, ts);
    }
  }

  return stale; // Tenant IDs with new content
}
```

### Feed Rebuild Strategy

```
Full rebuild (cold start or forced):
  → SELECT from meadow_posts with all LEFT JOINs
  → Same query as current v1 getFeed()
  → Cache result in memory

Delta refresh (warm cache, some tenants stale):
  → SELECT new posts only WHERE tenant_id IN (stale) AND published_at > last_refreshed
  → Merge into cached feed
  → Re-sort by selected algorithm
  → Update lastRefreshedAt

No refresh needed (all KV timestamps older than cache):
  → Return cached feed directly
  → Cost: N KV reads, zero D1
```

---

## PostMetaDO (extended)

### Current State

PostMetaDO already exists in the `grove-durable-objects` package. It handles:

- View counting and logging
- Reaction tracking
- Presence (active readers)
- Tier-based popularity thresholds

### Meadow Extensions

Meadow adds three new interaction types to PostMetaDO:

| Interaction   | Storage                            | Flush to D1                                                 |
| ------------- | ---------------------------------- | ----------------------------------------------------------- |
| **Votes**     | `Set<userId>` in memory            | `INSERT INTO meadow_votes` + `UPDATE score`                 |
| **Bookmarks** | `Set<userId>` in memory            | `INSERT/DELETE meadow_bookmarks`                            |
| **Reports**   | `Array<{userId, reason, details}>` | `INSERT INTO meadow_reports` + conditional `UPDATE visible` |

Reactions already exist in PostMetaDO. Meadow uses the same mechanism with the Meadow emoji set.

### New Methods

```typescript
// Meadow vote
async vote(userId: string): Promise<{ created: boolean; score: number }>;
async unvote(userId: string): Promise<{ removed: boolean; score: number }>;

// Meadow bookmark
async bookmark(userId: string): Promise<{ bookmarked: boolean }>;
async unbookmark(userId: string): Promise<{ bookmarked: boolean }>;

// Meadow report
async report(userId: string, reason: string, details?: string):
  Promise<{ created: boolean; autoHidden: boolean }>;
```

### Flush Strategy

Follows the existing TenantDO analytics pattern:

```
Flush triggers:
  1. Alarm fires (every 30-60 seconds)
  2. Buffer exceeds 100 interactions
  3. Report triggers auto-hide threshold (immediate flush for safety)

Flush contents (single db.batch() call):
  - All pending vote INSERTs/DELETEs
  - UPDATE meadow_posts SET score = {current_count}
  - All pending bookmark INSERTs/DELETEs
  - All pending reaction INSERTs/DELETEs
  - UPDATE meadow_posts SET reaction_counts = {json}
  - All pending report INSERTs
  - Conditional UPDATE meadow_posts SET visible = 0 (if report count >= 3)
```

### Rehydration

```typescript
async rehydrate(db: D1Database, postId: string): Promise<void> {
  // Load current interaction state from D1
  const [votes, bookmarks, reactions, reports] = await db.batch([
    db.prepare("SELECT user_id FROM meadow_votes WHERE post_id = ?").bind(postId),
    db.prepare("SELECT user_id FROM meadow_bookmarks WHERE post_id = ?").bind(postId),
    db.prepare("SELECT user_id, emoji FROM meadow_reactions WHERE post_id = ?").bind(postId),
    db.prepare("SELECT user_id FROM meadow_reports WHERE post_id = ?").bind(postId),
  ]);

  this.votes = new Set(votes.results.map(r => r.user_id));
  this.bookmarks = new Set(bookmarks.results.map(r => r.user_id));
  this.reactions = new Map(/* group by emoji */);
  this.reportedBy = new Set(reports.results.map(r => r.user_id));
  this.score = this.votes.size;
}
```

---

## Wrangler Bindings

### Meadow (consumer)

```toml
# packages/meadow/wrangler.toml

# Existing bindings
[[d1_databases]]
binding = "DB"
database_name = "grove-engine-db"
database_id = "..."

[[kv_namespaces]]
binding = "CACHE_KV"
id = "..."

# New: Durable Object service bindings
[[services]]
binding = "FEEDS"
service = "grove-durable-objects"

[[services]]
binding = "POST_META"
service = "grove-durable-objects"
```

### Durable Objects Worker (host)

```toml
# packages/durable-objects/wrangler.toml
# Add to existing migrations

[[migrations]]
tag = "v6"
# No new classes needed — UserFeedDO extends existing FeedDO,
# PostMetaDO already exists. Just add Meadow methods.
```

---

## KV Invalidation Keys

| Key                       | Written by                 | Read by                    | TTL      |
| ------------------------- | -------------------------- | -------------------------- | -------- |
| `feed_updated:{tenantId}` | meadow-poller after upsert | UserFeedDO on feed request | 24 hours |

One key per tenant, overwritten on each poll cycle. The TTL ensures abandoned tenant keys don't accumulate forever. 24 hours is generous since the poller runs every 15 minutes.

---

## API Migration Path

The SvelteKit API endpoints stay. Their internals change from D1-direct to DO-coordinated.

### Before (v1, D1-direct)

```typescript
// POST /api/feed/[id]/vote
export const POST: RequestHandler = async ({ params, platform, locals }) => {
  // ... auth, rate limit ...
  const created = await castVote(db, locals.user.id, params.id);
  return json({ success: true, created });
};
```

### After (v2, DO-coordinated)

```typescript
// POST /api/feed/[id]/vote
export const POST: RequestHandler = async ({ params, platform, locals }) => {
  // ... auth, rate limit ...
  const stub = platform.env.POST_META.get(
    platform.env.POST_META.idFromName(`post:${postTenantId}:${postSlug}`),
  );
  const result = await stub.fetch("/meadow/vote", {
    method: "POST",
    body: JSON.stringify({ userId: locals.user.id }),
  });
  return result;
};
```

The service layer files (`$lib/server/votes.ts`, etc.) can be retired once the DO handles the logic. But they remain functional as fallbacks during migration.

### Feed Loading

```typescript
// GET /feed — +page.server.ts
export const load = async ({ platform, locals }) => {
  if (!locals.user) {
    // Anonymous: D1-direct (no DO needed, no personalization)
    return { feed: await getFeed(db, { filter: "all", limit: 20 }) };
  }

  // Authenticated: DO-coordinated
  const stub = platform.env.FEEDS.get(
    platform.env.FEEDS.idFromName(`feed:${locals.user.id}`),
  );
  const response = await stub.fetch("/feed?filter=all&limit=20");
  const feed = await response.json();
  return { feed };
};
```

Anonymous users bypass the DO entirely. They get the same D1 query as today. DOs are only spun up for authenticated users who benefit from personalization and interaction pooling.

---

## Real-Time (Future, Phase 2)

The DO architecture unlocks real-time features without additional infrastructure.

```
PostMetaDO receives a vote
  │
  ├── 1. Update in-memory state
  ├── 2. Return success to voter
  └── 3. Broadcast to WebSocket subscribers:
         { type: "vote", postId: "...", score: 43 }
              │
              ▼
     All connected browsers see the score tick up
```

PostMetaDO already has WebSocket support from its engine implementation. Meadow can tap into this when the time comes. This spec doesn't implement WebSockets. It just ensures the architecture doesn't prevent them.

---

## Security

### Rate Limiting

Threshold rate limiting remains on the SvelteKit API endpoints (the entrypoints). DOs don't do their own rate limiting. The API layer is the gate; the DO layer is the pool.

### Auth Validation

DOs trust the caller (the SvelteKit worker) to have validated auth. The DO receives a `userId` and trusts it. This is safe because:

- DOs are only reachable via service bindings (not public internet)
- The SvelteKit worker validates `locals.user` before calling the DO
- Same trust model as the existing PostMetaDO in engine

### Report Auto-Hide

When a PostMetaDO's report count reaches 3, it flushes immediately (doesn't wait for the alarm). Visibility changes should propagate to D1 quickly. The DO also sets an in-memory `visible = false` flag so subsequent feed requests from UserFeedDOs exclude the post even before D1 is updated.

---

## Cost Analysis

### Current (D1-direct, v1)

| Action                     | D1 reads              | D1 writes           |
| -------------------------- | --------------------- | ------------------- |
| Load feed (1 user)         | 1 (heavy, with JOINs) | 0                   |
| 50 votes on a post (1 min) | 0                     | 100 (2 per vote)    |
| 10 reactions (1 min)       | 0                     | 30 (3 per reaction) |
| Bookmark toggle            | 0                     | 1-2                 |

**Total for a moderately active post (50 votes + 10 reactions + 5 bookmarks in an hour):**
~137 D1 operations

### Proposed (DO-coordinated, v2)

| Action                                  | KV reads | D1 reads           | D1 writes                   |
| --------------------------------------- | -------- | ------------------ | --------------------------- |
| Load feed (warm cache, 2 stale tenants) | ~5       | 1 (targeted delta) | 0                           |
| 50 votes on a post (1 min)              | 0        | 0                  | ~2 (1-2 batch flushes)      |
| 10 reactions (1 min)                    | 0        | 0                  | ~2 (1-2 batch flushes)      |
| Bookmark toggle                         | 0        | 0                  | 0 (batched into next flush) |

**Total for same activity:**
~10 operations (5 KV + 3 D1 reads + 2 D1 batch writes)

**93% reduction in D1 operations.**

---

## Implementation Phases

### Phase 1: PostMetaDO Meadow Extensions

Extend the existing PostMetaDO with vote, bookmark, and report methods. Wire up Meadow's mutation endpoints to call the DO instead of D1-direct.

- [ ] Add `vote/unvote` methods to PostMetaDO
- [ ] Add `bookmark/unbookmark` methods to PostMetaDO
- [ ] Add `report` method with auto-hide threshold
- [ ] Add flush alarm for Meadow interaction types
- [ ] Add rehydration from `meadow_votes`, `meadow_bookmarks`, `meadow_reports`
- [ ] Update Meadow mutation endpoints to call PostMetaDO
- [ ] Keep D1-direct service layer as fallback
- [ ] Add DO bindings to Meadow's wrangler.toml

### Phase 2: UserFeedDO

Build the pull-based feed coordination DO. Wire up the feed page loader.

- [ ] Implement UserFeedDO with KV freshness check
- [ ] Add delta query + merge logic
- [ ] Add poller KV timestamp writes
- [ ] Update feed page loader to use DO for authenticated users
- [ ] Keep D1-direct for anonymous users
- [ ] Add Passage-style loading animation for cold starts
- [ ] Add DO bindings to Meadow's wrangler.toml
- [ ] Add migration to durable-objects wrangler.toml

### Phase 3: Real-Time (future)

WebSocket subscriptions for live vote/reaction updates.

- [ ] Add WebSocket upgrade to PostMetaDO Meadow methods
- [ ] Broadcast interaction events to connected clients
- [ ] Client-side Svelte store for live updates
- [ ] Presence indicator ("X people viewing this post")

---

## Resolved Design Decisions

1. **PostMetaDO memory limits.** Keep the current plan: flush at 100 interactions OR every 30-60 seconds via alarm. A `Set<string>` holding 100 UUIDs is ~6KB. DO memory limit is 128MB. Even a viral post accumulating 10K interactions between flushes would use ~600KB. Monitor in production but no additional triggers needed.

2. **UserFeedDO for high-follow-count users.** Use `Promise.all()` with batches of 50. KV reads are ~1ms each. 200 follows = 4 parallel batches = ~4ms wall clock. KV reads are cheap on the billing model. No need for a follow-count threshold or D1 fallback.

3. **DO location.** Accept Cloudflare's default single-region placement for v2. Smart routing minimizes impact. Recreating DOs in new regions would sacrifice warm caches, which defeats the coordination purpose. Revisit only if user feedback surfaces real latency complaints.

---

_The meadow doesn't shout across the forest when a flower blooms. It waits. And when you walk through, every new bloom is there for you to find._
