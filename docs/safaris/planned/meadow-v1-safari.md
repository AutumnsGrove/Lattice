---
title: "Meadow v1 Safari — Where the Forest Opens Up"
status: planned
category: safari
---

# Meadow v1 Safari — Where the Forest Opens Up

> _Connection without algorithms. Gathering without metrics. Social media that remembers what "social" means._
> **Aesthetic principle**: Glassmorphism post cards over living nature — warm, chronological, private-by-default
> **Scope**: Every deliverable in the Meadow v1 plan, observed against the spec AND the actual codebase as of February 2026

---

## Ecosystem Overview

**10 stops** across the Meadow v1 implementation plan
**Current state**: Beautiful coming-soon shell (~15% complete). Zero social feed functionality.
**Key finding**: The plan (Jan 2026) and spec (Nov 2025) are both outdated — the engine has matured significantly since they were written. Auth is now a drop-in. UI primitives exist. The plan needs a complete refresh.

### Plan vs Spec vs Reality — Critical Divergences

| Topic                | Plan (Jan 2026)                       | Spec (Nov 2025)                                    | Reality (Feb 2026)                                                                                        |
| -------------------- | ------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Auth                 | Heartwood OAuth, `createLoginHandler` | Magic links, `social_users` table                  | Better Auth via login.grove.place, `AccountStatus` component, `createCallbackHandler` — **drop-in ready** |
| Migration #          | `036_meadow_social.sql`               | Inline SQL, no migration #                         | Latest migration is **074** — next is **075**                                                             |
| Table names          | `meadow_*` prefix                     | `feed_posts`, `votes`, `reactions`, `social_users` | Neither exists yet — reconciliation needed                                                                |
| Emojis               | 10 default, **no angry**              | 5 generic **including 😡**                         | Plan's "no angry" is the right call for Grove's vibe                                                      |
| Project structure    | SvelteKit routes                      | Raw Worker handlers                                | Already a SvelteKit project with Cloudflare adapter — follow SvelteKit                                    |
| Feed source          | RSS polling                           | RSS polling                                        | RSS polling is correct, but `fast-xml-parser` not yet installed                                           |
| UI components        | Glassmorphism cards                   | ASCII wireframes                                   | Engine has `GlassCard`, `AccountStatus`, `Header` with user prop, `Toast`, `api.*()` — all ready          |
| `createLoginHandler` | Referenced as dependency              | N/A                                                | **Does NOT exist**. Not needed — use `buildLoginUrl()` redirect pattern (Landing's approach)              |

### Items by category

**Foundation** (stops 1-3): D1 Schema, Wrangler Config, Database Service Layer
**Infrastructure** (stops 4-5): RSS Parser, Polling Worker
**Interface** (stops 6-7): Feed API Endpoints, Feed UI & PostCard
**Auth & Features** (stops 8-10): Authentication, Reactions & Voting, Moderation

---

## 1. D1 Schema & Migrations

**Character**: The bedrock. Seven tables that define what Meadow can do — posts flowing in from RSS, votes cast in private, reactions sent with love, bookmarks saved for later. Every social interaction has a home here.

### Safari findings: What exists today

**Migrations** (`libs/engine/migrations/`, 74 files):

- [x] Shared `grove-engine-db` D1 database — all packages use it
- [x] `tenants` table exists (migration 013) with `plan` tiers
- [x] `posts` table exists (migration 005) with full blog post schema
- [x] `meadow` channel exists in `grove_messages` (migration 047)
- [x] `meadow_access` feature flag defined (migration 020)
- [x] Free tier users get "Meadow-only" access (migration 013)
- [ ] **No Meadow-specific social tables exist** — 0 of 7 planned tables created
- [ ] **Plan says migration 036** — wrong, latest is 074, next is **075**
- [ ] **Plan and spec disagree on table names** — plan uses `meadow_*`, spec uses `feed_posts`, `votes`, etc.
- [ ] **Spec includes `social_users` table** — unnecessary with Better Auth (users already exist in Heartwood)
- [ ] **Spec includes `emojis` table** — probably overkill for v1, just use constants
- [ ] **Spec includes `user_activity` table** — nice-to-have, not v1

### Design spec (safari-approved)

**Core decision**: Use `meadow_*` prefix for all tables (keeps namespace clean in shared D1). Drop `social_users` (Heartwood owns users). Drop `emojis` table (use TypeScript constants for v1). Drop `user_activity` (defer to v2).

#### Migration `075_meadow_social.sql` — 6 tables

**`meadow_posts`** — Denormalized posts from opted-in blogs (RSS-ingested)

```sql
CREATE TABLE meadow_posts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,           -- Source blog tenant
  original_post_id TEXT NOT NULL,    -- ID in source blog's posts table
  blog_subdomain TEXT NOT NULL,      -- e.g., "oak"
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,             -- First 200 chars
  slug TEXT NOT NULL,
  post_url TEXT NOT NULL,            -- Full URL to original post
  tags TEXT,                         -- JSON array
  published_at INTEGER NOT NULL,     -- Original publish timestamp (seconds)
  ingested_at INTEGER NOT NULL,      -- When RSS poller picked it up
  -- Cached stats (updated by triggers/cron)
  upvote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,
  net_score INTEGER DEFAULT 0,
  reaction_count INTEGER DEFAULT 0,
  -- Moderation
  visible INTEGER DEFAULT 1,         -- 0 = hidden by mod
  reported_count INTEGER DEFAULT 0,
  -- Dedup
  guid TEXT UNIQUE,                  -- RSS GUID for deduplication
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_meadow_posts_tenant ON meadow_posts(tenant_id);
CREATE INDEX idx_meadow_posts_published ON meadow_posts(published_at DESC);
CREATE INDEX idx_meadow_posts_ingested ON meadow_posts(ingested_at DESC);
CREATE INDEX idx_meadow_posts_score ON meadow_posts(net_score DESC);
CREATE INDEX idx_meadow_posts_visible ON meadow_posts(visible);
CREATE INDEX idx_meadow_posts_guid ON meadow_posts(guid);
```

**`meadow_votes`** — Private voting (HN-style, scores hidden from public)

```sql
CREATE TABLE meadow_votes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,             -- Heartwood user ID
  vote_type TEXT NOT NULL CHECK(vote_type IN ('up', 'down')),
  created_at INTEGER NOT NULL,
  UNIQUE(post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES meadow_posts(id) ON DELETE CASCADE
);

CREATE INDEX idx_meadow_votes_post ON meadow_votes(post_id);
CREATE INDEX idx_meadow_votes_user ON meadow_votes(user_id);
```

**`meadow_reactions`** — Emoji reactions (counts visible to author only)

```sql
CREATE TABLE meadow_reactions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  emoji_id TEXT NOT NULL,            -- Key into REACTION_EMOJIS constant
  created_at INTEGER NOT NULL,
  UNIQUE(post_id, user_id, emoji_id),
  FOREIGN KEY (post_id) REFERENCES meadow_posts(id) ON DELETE CASCADE
);

CREATE INDEX idx_meadow_reactions_post ON meadow_reactions(post_id);
CREATE INDEX idx_meadow_reactions_user ON meadow_reactions(user_id);
```

**`meadow_bookmarks`** — Saved posts

```sql
CREATE TABLE meadow_bookmarks (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES meadow_posts(id) ON DELETE CASCADE
);

CREATE INDEX idx_meadow_bookmarks_user ON meadow_bookmarks(user_id);
```

**`meadow_follows`** — Blog subscriptions

```sql
CREATE TABLE meadow_follows (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,           -- Blog being followed
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_meadow_follows_user ON meadow_follows(user_id);
CREATE INDEX idx_meadow_follows_tenant ON meadow_follows(tenant_id);
```

**`meadow_reports`** — Content reports (for moderation)

```sql
CREATE TABLE meadow_reports (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  reporter_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK(reason IN ('spam', 'harassment', 'misinformation', 'other')),
  detail TEXT,                       -- Optional freetext
  created_at INTEGER NOT NULL,
  resolved INTEGER DEFAULT 0,
  resolved_by TEXT,
  resolved_at INTEGER,
  UNIQUE(post_id, reporter_id),      -- One report per user per post
  FOREIGN KEY (post_id) REFERENCES meadow_posts(id) ON DELETE CASCADE
);

CREATE INDEX idx_meadow_reports_post ON meadow_reports(post_id);
CREATE INDEX idx_meadow_reports_unresolved ON meadow_reports(resolved) WHERE resolved = 0;
```

**What we're NOT building in v1:**

- ~~`social_users`~~ — Heartwood owns user identity
- ~~`emojis`~~ — Use TypeScript constants (`REACTION_EMOJIS` map)
- ~~`user_activity`~~ — Defer to v2
- ~~`meadow_reactions_agg`~~ — Cache in KV instead of a table
- ~~`meadow_poll_state`~~ — Use KV for polling state (simpler)

---

## 2. Wrangler Configuration

**Character**: The nervous system — bindings that connect Meadow to its databases, caches, auth service, and scheduled jobs. Currently a skeleton with only D1 wired up.

### Safari findings: What exists today

**`apps/meadow/wrangler.toml`** (16 lines):

- [x] `name = "grove-meadow"` — correct worker name
- [x] `compatibility_date = "2025-01-01"` — fine
- [x] `nodejs_compat` flag — needed for some deps
- [x] D1 binding to `grove-engine-db` with correct database ID
- [x] `SITE_NAME` and `SITE_URL` vars
- [ ] **No KV namespace** — needed for feed caching, poll state, rate limiting
- [ ] **No cron triggers** — needed for RSS polling
- [ ] **No AUTH service binding** — needed for Heartwood session validation
- [ ] **No CACHE_KV binding** — the callback handler expects this for rate limiting
- [ ] **No environment-specific vars** — no `AUTH_URL`, `LOGIN_URL`, etc.

**`apps/meadow/src/app.d.ts`** (17 lines):

- [x] `Platform.env.DB` typed as `D1Database`
- [ ] **No KV type** — needs `CACHE_KV: KVNamespace`
- [ ] **No AUTH type** — needs `AUTH: Fetcher` (service binding)
- [ ] **No Locals.user type** — needs user from session validation

### Design spec (safari-approved)

**Core decision**: Mirror Landing's binding pattern. Add KV, service binding, cron triggers, and proper environment vars.

#### wrangler.toml additions

```toml
# KV namespace for feed caching, poll state, rate limiting
[[kv_namespaces]]
binding = "CACHE_KV"
id = "TBD"  # Create with: wrangler kv namespace create meadow-cache

# Service binding to Heartwood for auth
[[services]]
binding = "AUTH"
service = "grove-heartwood"

# Cron triggers
[triggers]
crons = ["*/15 * * * *"]  # Every 15 minutes for RSS polling

# Production environment
[env.production.vars]
SITE_NAME = "Meadow"
SITE_URL = "https://meadow.grove.place"
AUTH_URL = "https://login.grove.place"
```

#### app.d.ts updates

```typescript
declare global {
	namespace App {
		interface Locals {
			user: {
				id: string;
				name?: string;
				email: string;
				avatarUrl?: string;
			} | null;
		}
		interface Platform {
			env: {
				DB: D1Database;
				CACHE_KV: KVNamespace;
				AUTH: Fetcher;
			};
		}
	}
}
```

### Fixes

- [ ] Add KV namespace binding to wrangler.toml
- [ ] Add AUTH service binding to wrangler.toml
- [ ] Add cron trigger (every 15 min) to wrangler.toml
- [ ] Add production environment vars
- [ ] Update app.d.ts with KV, AUTH, and Locals types
- [ ] Create KV namespace via `wrangler kv namespace create meadow-cache`
- [ ] Update `compatibility_date` to `"2025-12-01"` or later

---

## 3. Database Service Layer

**Character**: The translator between raw SQL and the rest of the app. Every feed query, every vote, every reaction flows through here. Clean, typed, tested.

### Safari findings: What exists today

- [ ] **`src/lib/server/` directory does not exist** — no server-side code at all
- [ ] **No db.ts** — the plan's entire service layer is unbuilt
- [ ] **No types** — no TypeScript types for posts, votes, reactions, etc.

**Patterns from other packages:**

- [x] Landing uses direct D1 queries in load functions and form actions
- [x] Heartwood uses a service layer pattern with typed query builders
- [x] Engine provides `apiRequest()` for client→server communication

### Design spec (safari-approved)

**Core decision**: Thin service layer with typed functions. No ORM, no query builder — just parameterized SQL with TypeScript types. One file per domain.

#### File structure

```
src/lib/server/
├── db.ts              # Database connection helper
├── feed.ts            # getFeed(), getPost(), getPostByGuid()
├── votes.ts           # castVote(), removeVote(), getUserVotes()
├── reactions.ts       # addReaction(), removeReaction(), getPostReactions()
├── bookmarks.ts       # toggleBookmark(), getUserBookmarks()
├── follows.ts         # followBlog(), unfollowBlog(), getUserFollows()
├── moderation.ts      # hidePost(), reportPost(), getReportQueue()
└── types.ts           # All Meadow types
```

#### Key types (`src/lib/server/types.ts`)

```typescript
export interface MeadowPost {
	id: string;
	tenant_id: string;
	blog_subdomain: string;
	title: string;
	excerpt: string;
	slug: string;
	post_url: string;
	tags: string[];
	published_at: number;
	ingested_at: number;
	upvote_count: number;
	downvote_count: number;
	net_score: number;
	reaction_count: number;
	visible: boolean;
}

export interface FeedPost extends MeadowPost {
	user_vote?: "up" | "down" | null;
	user_bookmarked?: boolean;
	user_reactions?: string[]; // emoji_ids the current user has used
}

export type FeedFilter = "all" | "popular" | "hot" | "top" | "following";
export type TimePeriod = "day" | "week" | "month" | "year" | "all";
export type VoteType = "up" | "down";
export type ReportReason = "spam" | "harassment" | "misinformation" | "other";
```

#### Feed queries (`src/lib/server/feed.ts`)

```typescript
export async function getFeed(
	db: D1Database,
	opts: {
		filter: FeedFilter;
		period?: TimePeriod;
		userId?: string;
		page?: number;
		limit?: number;
	},
): Promise<{ posts: FeedPost[]; hasMore: boolean }>;
```

Four query variants matching the spec's algorithms:

- **all**: `ORDER BY ingested_at DESC` (chronological)
- **popular**: `ORDER BY net_score DESC, ingested_at DESC`
- **hot**: HN-style decay `net_score / pow((hours + 2), 1.5)`
- **top**: `WHERE ingested_at >= :start ORDER BY net_score DESC`
- **following**: Join on `meadow_follows` for user's subscribed blogs

Each query left-joins `meadow_votes` and `meadow_bookmarks` to hydrate `user_vote` and `user_bookmarked` for the current user in a single query (no N+1).

### Fixes

- [ ] Create `src/lib/server/` directory
- [ ] Create `types.ts` with all Meadow types
- [ ] Create `db.ts` — thin helper (just passes `platform.env.DB`)
- [ ] Create `feed.ts` — getFeed(), getPost()
- [ ] Create `votes.ts` — castVote(), removeVote(), getUserVotes(), updatePostScore()
- [ ] Create `reactions.ts` — addReaction(), removeReaction(), getPostReactions()
- [ ] Create `bookmarks.ts` — toggleBookmark(), getUserBookmarks()
- [ ] Create `follows.ts` — followBlog(), unfollowBlog(), getUserFollows()
- [ ] Create `moderation.ts` — hidePost(), reportPost(), getReportQueue()

---

## 4. RSS Parser & Feed Discovery

**Character**: The forager — it goes out into the network, finds blogs that opted in, reads their RSS feeds, and brings back the harvest. Careful, respectful, and thorough.

### Safari findings: What exists today

- [ ] **No RSS parsing code anywhere** in the monorepo
- [ ] **`fast-xml-parser` not installed** — not in any package.json
- [x] RSS _generation_ exists in engine (`libs/engine/src/routes/api/feed/+server.ts`) — manual XML template literals
- [x] RSS generation also in clearing — same pattern
- [x] Known feed URL pattern: `https://{subdomain}.grove.place/feed.xml`

**The existing RSS generator tells us the exact format we'll be parsing:**

- RSS 2.0 format with `<channel>`, `<item>`, `<title>`, `<link>`, `<description>`, `<pubDate>`, `<guid>`
- Grove blogs always serve at `/feed.xml`

### Design spec (safari-approved)

**Core decision**: Use `fast-xml-parser` (~30KB) — plan was right here. Lightweight, well-maintained, handles RSS 2.0 and Atom. Parse into typed objects.

#### File structure

```
src/lib/rss/
├── parser.ts          # XML → typed MeadowPost[]
├── discovery.ts       # Find RSS feed URL for a tenant
└── types.ts           # RSS-specific types (before denormalization)
```

#### Feed discovery (`src/lib/rss/discovery.ts`)

```typescript
// Primary: https://{subdomain}.grove.place/feed.xml
// Fallback: /rss.xml, /feed, /rss
// Timeout: 10 seconds per probe
export async function discoverFeedUrl(subdomain: string): Promise<string | null>;
```

Simple — try the primary URL, fall back if needed. Cache discovered URLs in KV to avoid re-probing.

#### Parser (`src/lib/rss/parser.ts`)

```typescript
import { XMLParser } from "fast-xml-parser";

export function parseRSSFeed(xml: string, subdomain: string): ParsedPost[];
```

Handles:

- RSS 2.0 `<item>` elements
- `<guid>` for deduplication (fall back to `<link>` if no GUID)
- `<pubDate>` parsing (RFC 2822 → Unix seconds)
- Excerpt extraction (strip HTML, truncate to 200 chars)
- Tags from `<category>` elements

### Fixes

- [ ] Install `fast-xml-parser` in meadow package: `pnpm add fast-xml-parser -F meadow`
- [ ] Create `src/lib/rss/types.ts` — ParsedPost interface
- [ ] Create `src/lib/rss/parser.ts` — XML parsing with fast-xml-parser
- [ ] Create `src/lib/rss/discovery.ts` — Feed URL discovery with fallbacks
- [ ] Add unit tests for parser (RSS 2.0 fixtures from actual Grove feeds)

---

## 5. Polling Worker & Ingestion

**Character**: The night gardener — every 15 minutes, it quietly tends the feed. Checks each opted-in blog, harvests new posts, deduplicates, and plants them in the database. Never loud, never disruptive.

### Safari findings: What exists today

- [ ] **No cron handler** — wrangler.toml has no `[triggers]` section
- [ ] **No ingestion pipeline** — no code for comparing new vs existing posts
- [ ] **No opt-in mechanism** — no column on `tenants` for feed opt-in
- [ ] **No poll state tracking** — no way to know when a blog was last polled

**The plan suggests `+worker.ts`** — but SvelteKit on Cloudflare Pages doesn't support cron triggers natively. Cron triggers are a Workers feature.

### Design spec (safari-approved)

**Core decision**: Use SvelteKit API route (`/api/cron/poll`) triggered by Cloudflare Cron via fetch. The cron trigger hits the route endpoint. This is the standard pattern for SvelteKit on Pages with cron.

**IMPORTANT**: The `tenants` table needs a `meadow_opt_in` column (migration 075 should add this).

#### Updated migration addition

Add to `075_meadow_social.sql`:

```sql
ALTER TABLE tenants ADD COLUMN meadow_opt_in INTEGER DEFAULT 0;
```

#### Polling flow

```
Cron (every 15 min)
  → GET /api/cron/poll (with secret header for auth)
    → Query tenants WHERE meadow_opt_in = 1
    → For each tenant:
        → Discover/cache feed URL
        → Fetch RSS XML (30s timeout)
        → Parse into posts
        → Filter: skip if GUID already in meadow_posts
        → Insert new posts (batch INSERT)
        → Update KV poll state (last_polled, post_count, errors)
    → Return summary { polled: N, new_posts: N, errors: N }
```

#### File structure

```
src/routes/api/cron/
└── poll/
    └── +server.ts     # Cron-triggered polling endpoint

src/lib/rss/
├── ingest.ts          # Dedup + insert logic
└── poll-state.ts      # KV-backed polling state
```

#### Rate limiting & resilience

- **30s timeout** per feed fetch
- **Exponential backoff** on errors (tracked in KV per tenant)
- **Stagger polls** — don't hit all blogs simultaneously
- **Secret header** — cron endpoint requires `X-Cron-Secret` to prevent public access
- **Graceful per-blog errors** — one blog failing doesn't stop the others

### Fixes

- [ ] Add `meadow_opt_in` column to tenants (in migration 075)
- [ ] Create `src/routes/api/cron/poll/+server.ts` — polling endpoint
- [ ] Create `src/lib/rss/ingest.ts` — dedup + batch insert
- [ ] Create `src/lib/rss/poll-state.ts` — KV-backed state per tenant
- [ ] Add cron trigger to wrangler.toml
- [ ] Add `CRON_SECRET` environment variable for endpoint auth
- [ ] Add error logging and monitoring hooks

---

## 6. Feed API Endpoints

**Character**: The public-facing paths through the meadow — every tap on a vote button, every emoji reaction, every bookmark is an API call. Fast, typed, rate-limited.

### Safari findings: What exists today

**`src/routes/api/`**:

- [x] `health/+server.ts` — basic liveness probe (returns 200)
- [ ] **0 feed endpoints** exist
- [ ] **0 vote endpoints** exist
- [ ] **0 reaction endpoints** exist
- [ ] **0 bookmark endpoints** exist

**Pattern reference from other packages:**

- Landing uses SvelteKit form actions for mutations and API routes for reads
- Engine provides `apiRequest()` on the client side with CSRF handling
- All API routes should validate `locals.user` for protected actions

### Design spec (safari-approved)

**Core decision**: RESTful SvelteKit API routes. Reads are GET with query params. Mutations are POST/DELETE with JSON bodies. All mutations require auth. Rate limiting via KV.

#### Endpoint map

```
GET  /api/feed                    # Feed listing (filter, period, page)
GET  /api/feed/[id]               # Single post detail
POST /api/feed/[id]/vote          # Cast/change vote
DELETE /api/feed/[id]/vote        # Remove vote
POST /api/feed/[id]/reaction      # Add reaction
DELETE /api/feed/[id]/reaction    # Remove reaction
POST /api/feed/[id]/bookmark      # Toggle bookmark
POST /api/feed/[id]/report        # Report post
GET  /api/bookmarks               # User's bookmarks
GET  /api/following                # User's followed blogs
POST /api/follow/[tenantId]       # Follow a blog
DELETE /api/follow/[tenantId]     # Unfollow a blog
GET  /api/feed/[id]/stats         # Post stats (author only)
```

#### Route structure

```
src/routes/api/
├── feed/
│   ├── +server.ts                # GET: feed listing
│   └── [id]/
│       ├── +server.ts            # GET: post detail
│       ├── vote/+server.ts       # POST/DELETE: voting
│       ├── reaction/+server.ts   # POST/DELETE: reactions
│       ├── bookmark/+server.ts   # POST: toggle bookmark
│       ├── report/+server.ts     # POST: report post
│       └── stats/+server.ts      # GET: author stats
├── bookmarks/+server.ts          # GET: user bookmarks
├── following/+server.ts          # GET: followed blogs
├── follow/
│   └── [tenantId]/+server.ts     # POST/DELETE: follow/unfollow
└── cron/
    └── poll/+server.ts           # Cron polling (from stop 5)
```

#### Response pattern

All endpoints return consistent JSON:

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: { code: string, message: string } }
```

#### Rate limiting

Per user per hour (via KV):

- Votes: 100/hr
- Reactions: 200/hr
- Reports: 10/hr
- Feed views: 1000/hr (anonymous: 100/hr)

### Fixes

- [ ] Create feed listing endpoint (`GET /api/feed`)
- [ ] Create post detail endpoint (`GET /api/feed/[id]`)
- [ ] Create vote endpoints (`POST/DELETE /api/feed/[id]/vote`)
- [ ] Create reaction endpoints (`POST/DELETE /api/feed/[id]/reaction`)
- [ ] Create bookmark endpoint (`POST /api/feed/[id]/bookmark`)
- [ ] Create report endpoint (`POST /api/feed/[id]/report`)
- [ ] Create bookmarks listing (`GET /api/bookmarks`)
- [ ] Create follow endpoints (`POST/DELETE /api/follow/[tenantId]`)
- [ ] Create author stats endpoint (`GET /api/feed/[id]/stats`)
- [ ] Implement KV-based rate limiting middleware
- [ ] Add CSRF validation in hooks.server.ts (validateCSRF pattern)

---

## 7. Feed UI & PostCard

**Character**: The heart of Meadow. Glassmorphism cards floating over nature — each one a window into someone's writing. Warm, minimal, alive. The feed should feel like stepping out into a clearing and seeing what your friends have been thinking about.

### Safari findings: What exists today

**`src/routes/+page.svelte`** (211 lines):

- [x] Beautiful coming-soon landing page with Grove design language
- [x] Header/Footer from engine chrome
- [x] Email signup component
- [x] Season cycling on logo click
- [x] Glass cards explaining what Meadow is
- [x] Proper SEO component
- [ ] **No `/feed` route** — no feed page at all
- [ ] **No PostCard component** — nothing for rendering feed items
- [ ] **No infinite scroll** — no pagination of any kind
- [ ] **No filter tabs** — no All/Popular/Hot/Top/Following UI

**Engine components available for Meadow:**

- [x] `GlassCard` — variant: `default` or `frosted`, with `hoverable` prop
- [x] `AccountStatus` — avatar + dropdown, or sign-in link
- [x] `Header` — accepts `user` prop, integrates AccountStatus
- [x] `Tabs` component — for filter selection
- [x] `Toast` — for success/error feedback
- [x] `Skeleton` / `LoadingSkeleton` — for loading states
- [x] `EmptyState` — for "no posts yet"
- [x] `Badge` — for tags, status indicators
- [x] Timeline component — **good pattern reference** for infinite scroll with `onLoadMore` + `hasMore`

### Design spec (safari-approved)

**Core decision**: The feed replaces the coming-soon page as the default route. Coming-soon becomes a gated state (show when no auth / no posts). PostCard uses `GlassCard hoverable` with vote buttons, reaction emojis, and bookmark. Infinite scroll follows Timeline's pattern.

#### Route structure

```
src/routes/
├── +page.svelte                  # Feed (or coming-soon if not launched)
├── +page.server.ts               # Load initial feed data
├── +layout.svelte                # Chrome (Header with user, Footer, curios)
├── +layout.server.ts             # Load user from locals, messages
├── post/
│   └── [id]/
│       ├── +page.svelte          # Post detail / expanded view
│       └── +page.server.ts       # Load post + author stats
├── bookmarks/
│   ├── +page.svelte              # Saved posts
│   └── +page.server.ts           # Load user bookmarks
├── profile/
│   ├── +page.svelte              # User profile
│   └── +page.server.ts           # Load profile data
└── auth/
    ├── callback/+server.ts       # OAuth callback
    └── login/+page.server.ts     # Redirect to login hub
```

#### PostCard component (`src/lib/components/PostCard.svelte`)

```
┌─────────────────────────────────────────────────────┐
│ GlassCard hoverable                                  │
│                                                      │
│  "Why I Garden at Midnight"                         │
│  ─────────────────────────────────────────           │
│  There's something about the quiet hours when the    │
│  world sleeps. The soil feels different...            │
│                                                      │
│  🌿 oak.grove.place                    3 hours ago   │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ ▲ ▼  │  ❤️ 😂 🌱 ✨  │  🔖 Bookmark         │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

Props:

```typescript
interface PostCardProps {
	post: FeedPost;
	onVote: (postId: string, type: VoteType) => void;
	onReaction: (postId: string, emojiId: string) => void;
	onBookmark: (postId: string) => void;
	showAuthorStats?: boolean; // For post author viewing own stats
}
```

#### Feed page features

- **Filter tabs**: All | Popular | Hot | Top | Following (using engine `Tabs`)
- **Time period selector**: Appears when "Top" is selected (Today, Week, Month, Year)
- **Infinite scroll**: `onLoadMore` callback, `hasMore` flag, `Skeleton` loading states
- **Empty states**: Different messages for "no posts yet" vs "no one you follow has posted"
- **Offline indicator**: Show cached content when offline (future PWA prep)

#### PostCard interactions (client-side)

All mutations use `api.post()` / `api.delete()` from engine utils:

- Vote: Optimistic update, revert on error, toast on failure
- Reaction: Emoji picker popover, optimistic toggle
- Bookmark: Toggle with optimistic update
- Report: Modal with reason selection

### Fixes

- [ ] Create `src/lib/components/PostCard.svelte` — the core feed card
- [ ] Create `src/lib/components/FeedFilters.svelte` — filter tabs + time period
- [ ] Create `src/lib/components/ReactionPicker.svelte` — emoji selector popover
- [ ] Create `src/lib/components/VoteButtons.svelte` — up/down vote UI
- [ ] Create feed page (`src/routes/+page.svelte` or `/feed/+page.svelte`)
- [ ] Create feed server load (`+page.server.ts`)
- [ ] Implement infinite scroll (following Timeline pattern)
- [ ] Create post detail page (`/post/[id]/`)
- [ ] Create bookmarks page (`/bookmarks/`)
- [ ] Update layout to pass `user` to Header
- [ ] Move coming-soon to conditional render (shown when feed is empty/pre-launch)

---

## 8. Authentication & Sessions

**Character**: The gateway. Not a wall — a friendly gate that opens easily and remembers you. Drop-in auth components, session cookies that just work, protected routes that redirect gently.

### Safari findings: What exists today

**Engine auth infrastructure (already built):**

- [x] `createCallbackHandler()` — factory for `/auth/callback` GET handler
- [x] `buildLoginUrl()` — builds redirect URL to login.grove.place
- [x] `sanitizeReturnTo()` — prevents open redirect attacks
- [x] `AccountStatus` component — avatar/dropdown or sign-in link
- [x] `Header` component — accepts `user` prop, renders AccountStatus
- [x] `AUTH_COOKIE_NAMES` — all cookie name constants
- [x] `validateCSRF()` — CSRF validation for mutations

**Landing's auth pattern (to copy):**

- [x] `hooks.server.ts` — validates session via `AUTH.fetch()`, sets `locals.user`
- [x] `/auth/callback/+server.ts` — verifies session cookie, redirects
- [x] `/arbor/login/+page.server.ts` — redirects to login hub via `buildLoginUrl()`
- [x] `/arbor/+layout.server.ts` — checks `locals.user`, redirects if unauthenticated

**What the plan gets WRONG:**

- [ ] ~~`createLoginHandler`~~ — **Does not exist**. Not needed. Use `buildLoginUrl()` redirect.
- [ ] ~~Magic links / 6-digit codes~~ — Spec is outdated. Better Auth handles all of this via login.grove.place.
- [ ] ~~Custom OAuth flow~~ — No PKCE exchange needed. Better Auth sets session cookie, callback just verifies it exists.

### Design spec (safari-approved)

**Core decision**: Copy Landing's exact auth pattern. It's 4 files. Auth is DONE.

#### 1. `hooks.server.ts` (copy from Landing, simplify)

```typescript
// 1. CSRF validation for mutations
// 2. Session validation via AUTH service binding
// 3. Set locals.user for all routes
```

#### 2. `/auth/callback/+server.ts`

```typescript
import { createCallbackHandler } from "@autumnsgrove/lattice/grafts/login/server";
export const GET = createCallbackHandler({ defaultReturnTo: "/feed" });
```

That's it. One line (plus import). The factory handles everything.

#### 3. `/auth/login/+page.server.ts`

```typescript
import { redirect } from "@sveltejs/kit";
import { buildLoginUrl } from "@autumnsgrove/lattice/grafts/login";
import { sanitizeReturnTo } from "@autumnsgrove/lattice/utils";

export const load = async ({ url }) => {
	const returnTo = sanitizeReturnTo(url.searchParams.get("redirect"), "/feed");
	const callbackUrl = `${url.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`;
	throw redirect(302, buildLoginUrl(callbackUrl));
};
```

#### 4. Protected routes

Any route that needs auth:

```typescript
if (!locals.user) {
	throw redirect(302, `/auth/login?redirect=${encodeURIComponent(url.pathname)}`);
}
```

#### What's public vs protected

| Route                   | Auth Required           |
| ----------------------- | ----------------------- |
| `/` (feed)              | No — browse anonymously |
| `/post/[id]`            | No — read posts freely  |
| Vote / React / Bookmark | Yes — must be signed in |
| `/bookmarks`            | Yes                     |
| `/profile`              | Yes                     |
| `/arbor/*` (admin)      | Yes + admin check       |

### Fixes

- [ ] Create `src/hooks.server.ts` — CSRF + session validation (adapt from Landing)
- [ ] Create `src/routes/auth/callback/+server.ts` — one-line `createCallbackHandler`
- [ ] Create `src/routes/auth/login/+page.server.ts` — redirect to login hub
- [ ] Update `+layout.server.ts` to pass `locals.user` to all routes
- [ ] Update Header to pass `user` prop for `AccountStatus`
- [ ] Add AUTH service binding to wrangler.toml (from stop 2)
- [ ] Add CACHE_KV binding for callback rate limiting

---

## 9. Reactions & Voting System

**Character**: The quiet encouragement engine. Votes are whispers — they shape what surfaces but nobody sees the score. Reactions are gifts — sent to the author, not performed for the crowd. This is the anti-engagement-metric.

### Safari findings: What exists today

- [ ] **No voting UI or logic** exists
- [ ] **No reaction picker** exists
- [ ] **No emoji constants** defined

**Plan vs Spec conflict:**
| Aspect | Plan | Spec |
|--------|------|------|
| Default emojis | 10, **no angry** | 5 generic **including 😡** |
| Emoji Kitchen | Future | Detailed design |
| Reaction visibility | Counts → author only | Counts → author only (agree) |
| Vote visibility | Private | Private (agree) |

### Design spec (safari-approved)

**Core decision**: Plan wins on emoji selection — no angry emojis fits Grove's vibe perfectly. 10 emojis that feel like encouragement, not judgment. Vote buttons are minimal — a subtle ▲ that lights up when you've voted. No ▼ downvote in v1 (keep it positive for launch, add downvote later).

#### Default reaction emojis (10, no angry)

```typescript
// src/lib/constants/reactions.ts
export const REACTION_EMOJIS = {
	heart: { emoji: "❤️", label: "Love" },
	yellow_heart: { emoji: "💛", label: "Warm" },
	green_heart: { emoji: "💚", label: "Growth" },
	blue_heart: { emoji: "💙", label: "Calm" },
	purple_heart: { emoji: "💜", label: "Creative" },
	laugh: { emoji: "😂", label: "Joy" },
	surprised: { emoji: "😮", label: "Wow" },
	sad: { emoji: "😢", label: "Moved" },
	sparkle: { emoji: "✨", label: "Magic" },
	seedling: { emoji: "🌱", label: "Growing" },
} as const;
```

#### v1 vote behavior — Upvote only

- Single ▲ button per post
- Click to upvote, click again to remove
- Button color changes when voted (grove-500 green)
- **No downvote in v1** — keep the meadow positive for launch
- Scores used for Popular/Hot/Top sorting but never displayed
- Author sees vote count in their post stats dashboard

#### Reaction display

On feed (public): Top 3 emojis shown, size-scaled by count
On post detail: All emojis with counts (author only sees counts)
Picker: Popover grid of all 10 emojis

#### Privacy model

| Data      | Voter sees          | Author sees    | Public sees             |
| --------- | ------------------- | -------------- | ----------------------- |
| Votes     | Their own vote      | Total up count | Nothing                 |
| Reactions | Their own reactions | Emoji + counts | Emoji icons (no counts) |
| Bookmarks | Their saved list    | Nothing        | Nothing                 |

### Fixes

- [ ] Create `src/lib/constants/reactions.ts` — emoji constants
- [ ] Create `VoteButton.svelte` — upvote toggle (no downvote v1)
- [ ] Create `ReactionPicker.svelte` — popover emoji grid
- [ ] Create `ReactionDisplay.svelte` — top-N emojis shown on card
- [ ] Create `AuthorStats.svelte` — private stats for post author
- [ ] Wire vote/reaction API calls through `api.post()` with optimistic updates
- [ ] Add rate limiting: 100 votes/hr, 200 reactions/hr

---

## 10. Moderation & Admin

**Character**: The quiet guardian. Most people never see it. But when someone's ruining the meadow — spam, harassment, bad faith — the tools are there. Firm but fair. No power trips.

### Safari findings: What exists today

- [ ] **No `/arbor` routes** in Meadow
- [ ] **No moderation logic** of any kind
- [ ] **No report UI** for users

**Pattern from other packages:**

- [x] Landing has `/arbor/*` admin routes with Wayfinder gate pattern
- [x] AdminHeader component exists for admin pages
- [x] Admin layout checks `isWayfinder` from parent data

### Design spec (safari-approved)

**Core decision**: Minimal admin for v1. Three capabilities: view reports, hide posts, ban blogs. Auto-hide at 3 reports. Everything else deferred. Follow Landing's `/arbor` pattern.

#### v1 moderation features

**For users (all logged in):**

- Report button on PostCard → modal with reason selector
- Auto-hide post after 3 unique reports
- One report per user per post

**For admins (Wayfinder gate):**

- `/arbor/moderation` — Report queue with resolve/dismiss
- Hide/unhide posts from feed
- Ban/unban tenants from Meadow (set `meadow_opt_in = 0` + add to blocklist)

**Deferred to v2:**

- Shadow banning
- Vote count resets
- IP banning
- Per-post reaction disabling

#### Admin route structure

```
src/routes/arbor/
├── +layout.svelte                # AdminHeader, auth gate
├── +layout.server.ts             # Wayfinder check, load user
├── moderation/
│   ├── +page.svelte              # Report queue
│   └── +page.server.ts           # Load reports, handle actions
└── feed/
    ├── +page.svelte              # Feed management (hide/unhide)
    └── +page.server.ts           # Load all posts with mod controls
```

### Fixes

- [ ] Create `/arbor` layout with Wayfinder gate (copy from Landing)
- [ ] Create `/arbor/moderation` — report queue page
- [ ] Create `/arbor/feed` — feed management page
- [ ] Add report modal component
- [ ] Implement auto-hide trigger (3 reports)
- [ ] Add ban/unban tenant actions

---

## Expedition Summary

### By the numbers

| Metric          | Count                                                               |
| --------------- | ------------------------------------------------------------------- |
| Total stops     | 10                                                                  |
| Thriving 🟢     | 0                                                                   |
| Growing 🟡      | 1 (Feed UI — has coming-soon page + engine components ready)        |
| Wilting 🟠      | 2 (Wrangler config, Auth — partial infrastructure exists)           |
| Barren 🔴       | 7 (Schema, service layer, RSS, polling, API, reactions, moderation) |
| Total fix items | 74                                                                  |

### Recommended trek order

**Phase 1 — Foundation (do first, everything else depends on it):**

1. **D1 Schema** — Migration 075 with all 6 tables + tenants column
2. **Wrangler Config** — KV, AUTH binding, cron trigger
3. **Auth** — hooks.server.ts, callback, login redirect (4 files, drop-in)

**Phase 2 — Data pipeline (feed needs content):** 4. **RSS Parser** — Install fast-xml-parser, write parser + discovery 5. **Polling Worker** — Cron endpoint, ingestion, dedup 6. **Database Service Layer** — All query functions

**Phase 3 — User-facing (the meadow comes alive):** 7. **Feed API** — All endpoints 8. **Feed UI & PostCard** — The heart of Meadow 9. **Reactions & Voting** — The soul of Meadow

**Phase 4 — Safety net:** 10. **Moderation & Admin** — Report queue, hide/ban

### Cross-cutting themes

1. **Plan is outdated** — References migration 036 (latest is 074), `createLoginHandler` (doesn't exist), magic link auth (replaced by Better Auth). The plan needs this safari to replace it.

2. **Spec is outdated** — Describes `social_users` table (unnecessary with Heartwood), raw Worker handlers (it's SvelteKit now), 5 emojis including angry (Grove doesn't do angry).

3. **Engine is more mature than either doc assumes** — `AccountStatus`, `GlassCard`, `Header` with user prop, `api.*()`, `Toast`, `Tabs`, `createCallbackHandler` — all ready to use. Auth is a 4-file drop-in, not a multi-week effort.

4. **Auth is NOT Phase 4** — The plan puts auth in weeks 3-4. It should be Phase 1. Auth is a prerequisite for testing votes, reactions, bookmarks, and moderation. It's also trivial now (copy Landing's pattern). Do it first.

5. **No deployment workflow** — No `.github/workflows/deploy-meadow.yml`. Need to create one mirroring `deploy-login.yml`.

6. **KV is the unsung hero** — Feed caching, poll state, rate limiting, reaction count caching — KV does a lot of work in this system. Creating the namespace and wiring it up is step zero.

7. **`published_at` must be seconds** — MEMORY.md warns about the post-migrator timestamp bug. Meadow must be consistent: store Unix seconds, multiply by 1000 for JS Date objects. Never mix.

---

### What the plan got RIGHT

- RSS polling for post aggregation (correct approach)
- Private voting with no public scores (core philosophy)
- Reactions visible to author only (anti-engagement-metric)
- `fast-xml-parser` for parsing (good choice)
- 15-minute polling interval (respectful)
- 10 emojis with no angry ones (on-brand)
- Glassmorphism post cards (matches engine aesthetic)
- Basic moderation first, advanced later (pragmatic)

### What the plan got WRONG

- Migration number 036 → should be 075
- `createLoginHandler` dependency → doesn't exist, use `buildLoginUrl()`
- Auth in Phase 4 → should be Phase 1 (it's trivial now)
- `meadow_poll_state` table → use KV instead (simpler)
- `meadow_reactions_agg` table → use KV caching instead
- Spec's `social_users` table → unnecessary, Heartwood owns users
- Spec's `emojis` table → overkill for v1, use constants
- Week-based timeline → unrealistic, use phase-based ordering

---

_The fire dies to embers. The journal is full — 10 stops, 74 fixes sketched, the whole landscape mapped. The plan and spec were good bones, but the codebase grew up around them. Tomorrow, the animals go to work — foundation first, then the pipeline, then the meadow comes alive. But tonight? Tonight was the drive. And it was glorious._ 🚙
