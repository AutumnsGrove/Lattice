---
title: "Meadow Pre-Work — RSS Feed Enhancement, RSS Polling, and PostCard"
status: planned
category: features
---

# Meadow Pre-Work — RSS Feed Enhancement, RSS Polling, and PostCard

> Before Meadow can breathe, the feeds need to flow. Before the feeds can flow, they need content.

**Created:** February 15th 2026
**Status:** Planned
**Depends on:** Nothing (this is the foundation)
**Blocks:** All Meadow feed UI work

---

## The Three Jobs

Meadow's social feed consumes RSS from Grove tenant blogs. But the current RSS infrastructure was built during the markdown-on-disk era and never updated for D1. Three things must happen, in order:

1. **Fix RSS feed generation** — The engine's `/api/feed` reads from static markdown files and only outputs frontmatter. It needs to read from D1 and include full post content.
2. **Build RSS polling** — Meadow needs a cron worker that fetches, parses, and stores posts from tenant feeds into its own `meadow_posts` table.
3. **Build PostCard** — The UI component that renders a feed item. The visual heart of Meadow.

---

## Job 1: Fix RSS Feed Generation (Engine)

### What exists today

**File:** `libs/engine/src/routes/api/feed/+server.ts` (128 lines)

The current feed:

- Calls `getAllPosts()` from the static content loader (markdown files via `import.meta.glob`)
- Returns `PostMeta[]` — slug, title, date, tags, description only
- Outputs RSS 2.0 with `<description>` set to the frontmatter `description` field
- Has enclosure support for `featured_image`
- Resolves site URL from tenant context (`locals.context`)
- Looks up `grove_title` from `site_settings` in D1 (so it already touches D1 for metadata)
- Caches for 1 hour (`max-age=3600`)

**Discovery:** `<link rel="alternate">` in `+layout.svelte` points to `/api/feed`. A 301 redirect exists at `/rss.xml` → `/api/feed`.

### What's wrong

1. **No full content.** `<description>` is a one-line frontmatter excerpt. No `<content:encoded>` element. RSS readers and Meadow's poller get titles and summaries, not posts.
2. **Reads from filesystem, not D1.** The `getAllPosts()` call goes through the static content loader, which uses `import.meta.glob` to read `.md` files from the repo. D1 is the primary store for all tenant posts now.
3. **No `content` namespace.** The RSS XML declares `xmlns:atom` but not `xmlns:content` (needed for `<content:encoded>`).

### What to build

**Approach:** Rewrite `/api/feed/+server.ts` to query D1 as the primary source, with a filesystem fallback for sites that haven't migrated. Add `<content:encoded>` with full rendered HTML.

#### Changes to `libs/engine/src/routes/api/feed/+server.ts`

```
Primary path (D1):
1. Query published posts from D1 via TenantDb
   - SELECT slug, title, description, html_content, tags, published_at,
     featured_image, updated_at
   - WHERE status = 'published'
   - ORDER BY published_at DESC
   - LIMIT 50
2. For each post, emit:
   - <title> — post title
   - <link> — {siteUrl}/garden/{slug}
   - <guid isPermaLink="true"> — same as link
   - <pubDate> — published_at (remember: stored as Unix seconds, multiply by 1000)
   - <description> — frontmatter description (excerpt/summary)
   - <content:encoded> — full html_content wrapped in CDATA
   - <category> — one per tag
   - <enclosure> — featured_image if present
3. Add xmlns:content namespace to <rss> element

Fallback path (filesystem):
- If D1 is unavailable OR returns 0 posts, fall through to existing
  getAllPosts() logic (for sites still on markdown-on-disk)
- Filesystem path cannot provide <content:encoded> (PostMeta has no content)
  so it continues to emit description-only items — this is fine, those sites
  will migrate eventually
```

#### RSS output structure (after fix)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Blog Name</title>
    <link>https://subdomain.grove.place</link>
    <description>Site description</description>
    <language>en-us</language>
    <lastBuildDate>Sat, 15 Feb 2026 12:00:00 GMT</lastBuildDate>
    <atom:link href="https://subdomain.grove.place/api/feed"
               rel="self" type="application/rss+xml"/>
    <item>
      <title><![CDATA[My Great Post]]></title>
      <link>https://subdomain.grove.place/garden/my-great-post</link>
      <guid isPermaLink="true">https://subdomain.grove.place/garden/my-great-post</guid>
      <pubDate>Fri, 14 Feb 2026 08:00:00 GMT</pubDate>
      <description><![CDATA[A short excerpt about the post.]]></description>
      <content:encoded><![CDATA[
        <h1>My Great Post</h1>
        <p>The full rendered HTML content of the post...</p>
      ]]></content:encoded>
      <category>nature</category>
      <category>writing</category>
      <enclosure url="https://cdn.grove.place/img/cover.webp"
                 type="image/webp" length="0" />
    </item>
  </channel>
</rss>
```

#### Key decisions

- **50 post limit.** RSS feeds shouldn't be unbounded. 50 most recent published posts is generous.
- **`html_content` not `markdown_content`.** Meadow and RSS readers want rendered HTML, not raw markdown. The HTML is already sanitized at write time by `renderMarkdown()`.
- **Timestamp conversion.** `published_at` is stored as Unix seconds. Must multiply by 1000 for `new Date()`. (This is the same bug that killed the post-migrator. Be careful.)
- **Cache stays at 1 hour.** For Meadow's 15-minute polling, this means the cron might see slightly stale data, but that's fine. Posts aren't time-sensitive to the minute.
- **Filesystem fallback preserved.** Some sites may still use markdown-on-disk. The fallback is cheap (it's the current behavior) and will eventually be removed.

#### Implementation checklist

- [ ] Add D1 query path to `/api/feed/+server.ts`
- [ ] Add `xmlns:content` namespace to RSS root element
- [ ] Add `<content:encoded>` with `html_content` from D1 (CDATA wrapped)
- [ ] Keep `<description>` as the short excerpt
- [ ] Handle `published_at` timestamp correctly (seconds to milliseconds)
- [ ] Preserve filesystem fallback for non-D1 sites
- [ ] Keep existing enclosure/featured_image logic
- [ ] Keep existing `grove_title` lookup from `site_settings`
- [ ] Test with a real RSS reader (NetNewsWire, Feedly)
- [ ] Verify feed validates at https://validator.w3.org/feed/

**Estimated time:** 30-45 minutes. This is a straightforward rewrite of one file.

---

## Job 2: Build RSS Polling System (Meadow)

### What exists today

Nothing. No RSS parsing code anywhere in the codebase. The blogroll curio stores `feedUrl` but comments say "feed parsing via Worker cron, future." `fast-xml-parser` is not installed in any package.

### What to build

A cron-triggered polling system that discovers Grove tenant feeds, fetches them, parses the RSS XML, and stores new posts in Meadow's `meadow_posts` D1 table.

### Architecture

```
  Cloudflare Cron (every 15 min)
           │
           ▼
  ┌─────────────────────────────────────┐
  │  Meadow Worker — scheduled handler  │
  │                                     │
  │  1. Get list of opted-in tenants    │
  │  2. For each tenant:                │
  │     a. Fetch /api/feed              │
  │     b. Parse RSS XML                │
  │     c. Extract posts                │
  │     d. Upsert into meadow_posts     │
  │  3. Update poll state in KV         │
  └─────────────────────────────────────┘
           │              │
           ▼              ▼
        ┌──────┐    ┌──────────┐
        │  D1  │    │ CACHE_KV │
        │      │    │          │
        │ meadow_   │ poll:    │
        │ posts     │ {tenant} │
        └──────┘    └──────────┘
```

### Components

#### 2a. Feed Discovery

How does Meadow know which tenants to poll?

**Option: Query the tenants table directly.**

Meadow shares the same D1 database (`grove-engine-db`). It can query `tenants` for all active tenants, then construct the feed URL: `https://{subdomain}.grove.place/api/feed`.

```sql
SELECT id, subdomain, display_name
FROM tenants
WHERE status = 'active'
  AND plan != 'wanderer'
ORDER BY subdomain
```

For v1, all active tenants with a blog-capable plan are polled. A future `meadow_opt_in` flag on the tenants table (or a `meadow_feeds` table) lets tenants opt out.

#### 2b. RSS Parser

**Dependency:** `fast-xml-parser` — lightweight, zero-dependency XML parser. Well-maintained, widely used, works in Workers.

```bash
cd packages/meadow && pnpm add fast-xml-parser
```

**Parser module:** `apps/meadow/src/lib/server/rss-parser.ts`

```typescript
// Conceptual shape — not final code

interface ParsedFeedItem {
  title: string;
  link: string;
  guid: string;
  pubDate: string; // ISO string
  description: string; // excerpt
  contentEncoded: string; // full HTML (from <content:encoded>)
  categories: string[]; // tags
  enclosureUrl?: string; // featured image
  enclosureType?: string;
}

interface ParsedFeed {
  title: string;
  link: string;
  description: string;
  items: ParsedFeedItem[];
  lastBuildDate?: string;
}

function parseRssFeed(xml: string): ParsedFeed;
```

Key parsing considerations:

- RSS 2.0 structure: `rss > channel > item`
- `<content:encoded>` lives in the `content` namespace — `fast-xml-parser` handles this with `ignoreAttributes: false` and proper namespace config
- `<category>` can appear multiple times per item — parser must handle arrays
- `<enclosure>` is a self-closing tag with attributes (`url`, `type`, `length`)
- Dates come as RFC 2822 strings (`pubDate`) — parse with `new Date()`
- CDATA sections need to be preserved (content is HTML)

#### 2c. Polling Worker

**File:** `apps/meadow/src/lib/server/poll-feeds.ts`

The cron handler that orchestrates polling:

```
For each tenant (batched, max 10 concurrent):
  1. Check KV for last poll state:
     - Last ETag / Last-Modified from previous fetch
     - Last successful poll timestamp
  2. Fetch the feed with conditional headers:
     - If-None-Match: {lastETag}
     - If-Modified-Since: {lastModified}
  3. If 304 Not Modified → skip, update poll timestamp
  4. If 200 → parse RSS XML
  5. For each item in feed:
     - Check if guid already exists in meadow_posts
     - If new → INSERT into meadow_posts
     - If exists → UPDATE if content changed (hash comparison)
  6. Save new ETag/Last-Modified to KV
  7. Update poll timestamp in KV
```

**Rate limiting and safety:**

- Max 10 concurrent fetches (Promise pool, not Promise.all on 100+ tenants)
- 5-second timeout per fetch
- Skip tenants whose last poll was < 10 minutes ago (prevents hammering on cron overlap)
- If a feed returns errors 3 times in a row, back off to hourly polling for that tenant
- Total execution budget: stay under Cloudflare's 30-second cron limit (or use `waitUntil` for overflow)

**KV state shape:**

```
Key: poll:{tenantId}
Value: {
  lastETag: string | null,
  lastModified: string | null,
  lastPollAt: number,          // Unix seconds
  consecutiveErrors: number,
  lastError: string | null
}
TTL: 7 days (auto-cleanup for removed tenants)
```

#### 2d. Wrangler Configuration

**Add to `apps/meadow/wrangler.toml`:**

```toml
[triggers]
crons = ["*/15 * * * *"]

[[kv_namespaces]]
binding = "CACHE_KV"
id = "..."  # Create via wrangler kv:namespace create MEADOW_KV

[env.production]
  [[env.production.kv_namespaces]]
  binding = "CACHE_KV"
  id = "..."
```

**Add to `apps/meadow/src/app.d.ts`:**

```typescript
declare global {
  namespace App {
    interface Platform {
      env: {
        DB: D1Database;
        CACHE_KV: KVNamespace;
        AUTH: Fetcher;
      };
      context: ExecutionContext;
    }
    interface Locals {
      user?: { id: string; email: string; name?: string } | null;
      tenantId?: string;
    }
  }
}
```

#### 2e. Database: meadow_posts table

**Migration:** `libs/engine/migrations/075_meadow_social.sql`

```sql
-- Meadow social feed tables
-- Posts aggregated from tenant RSS feeds

CREATE TABLE IF NOT EXISTS meadow_posts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  guid TEXT NOT NULL,                    -- RSS <guid>, unique per tenant
  slug TEXT NOT NULL,                    -- extracted from link URL
  title TEXT NOT NULL,
  description TEXT DEFAULT '',           -- excerpt from <description>
  content_html TEXT DEFAULT '',          -- full content from <content:encoded>
  author_name TEXT DEFAULT '',           -- from feed channel title
  author_subdomain TEXT NOT NULL,        -- for building links back
  link TEXT NOT NULL,                    -- canonical URL to original post
  tags TEXT DEFAULT '[]',               -- JSON array from <category> elements
  featured_image TEXT,                   -- from <enclosure>
  published_at INTEGER NOT NULL,         -- Unix seconds
  fetched_at INTEGER NOT NULL,           -- when we first saw this post
  updated_at INTEGER NOT NULL,           -- last time content changed
  content_hash TEXT NOT NULL,            -- SHA-256 of content_html for change detection
  score INTEGER DEFAULT 0,              -- private vote tally
  reaction_counts TEXT DEFAULT '{}',    -- JSON object of emoji:count
  UNIQUE(tenant_id, guid)               -- one entry per post per tenant
);

CREATE INDEX IF NOT EXISTS idx_meadow_posts_published
  ON meadow_posts(published_at DESC);

CREATE INDEX IF NOT EXISTS idx_meadow_posts_tenant
  ON meadow_posts(tenant_id);

CREATE INDEX IF NOT EXISTS idx_meadow_posts_score
  ON meadow_posts(score DESC, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_meadow_posts_fetched
  ON meadow_posts(fetched_at DESC);
```

Note: `score` and `reaction_counts` live on the post row for read performance. They're denormalized from `meadow_votes` and `meadow_reactions` (written separately). This avoids JOINs on every feed page load.

#### Implementation checklist

- [ ] Install `fast-xml-parser` in meadow package
- [ ] Create `src/lib/server/rss-parser.ts` — RSS 2.0 parser with `content:encoded` support
- [ ] Create `src/lib/server/poll-feeds.ts` — cron handler with tenant discovery and feed fetching
- [ ] Create migration `075_meadow_social.sql` with `meadow_posts` table (and other Meadow tables)
- [ ] Add cron trigger to `wrangler.toml`
- [ ] Add KV namespace binding to `wrangler.toml`
- [ ] Add AUTH service binding to `wrangler.toml`
- [ ] Update `app.d.ts` with KV, AUTH, and Locals types
- [ ] Write unit tests for RSS parser (valid feed, missing content:encoded, malformed XML, empty feed)
- [ ] Write integration test for poll-feeds (mock fetch, verify D1 upserts)
- [ ] Add `@jsquash/jxl` vite exclusion to `apps/meadow/vite.config.ts`
- [ ] Test with real tenant feed after Job 1 is deployed

**Estimated time:** 2-3 hours. The parser is the most delicate part. Polling is mechanical.

---

## Job 3: PostCard Component

### What exists today

Nothing in Meadow. But the engine has patterns to build on:

- `GlassCard` — the base glass container with variants
- `Badge` — for tags
- Reeds components — for comment-style threading (layout reference)
- The Meadow spec defines the visual direction

### What to build

A `PostCard` component that renders a single feed item. This is the visual heart of Meadow.

### Design

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌────┐                                                         │
│  │ av │  author name · subdomain.grove.place · 3h ago           │
│  └────┘                                                         │
│                                                                 │
│  Post Title Here                                                │
│  A short excerpt from the post description that gives you       │
│  a sense of what the post is about without showing the whole    │
│  thing...                                                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │              featured image (if present)                │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  nature · writing · indie-web                                   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  △ upvote    🌿 🌸 ✨ 💚 (reactions)           🔖 bookmark     │
└─────────────────────────────────────────────────────────────────┘
```

### Component structure

**File:** `apps/meadow/src/lib/components/PostCard.svelte`

```
Props:
  post: MeadowPost        — the feed item data
  user?: User | null       — current user (for vote/reaction state)
  onVote?: () => void      — upvote callback
  onReact?: (emoji) => void — reaction callback
  onBookmark?: () => void  — bookmark callback
  compact?: boolean        — condensed mode for dense feeds (future)
```

### Sections of the PostCard

**1. Author header**

- Google S2 favicon as avatar (from `author_subdomain`): `https://www.google.com/s2/favicons?domain={subdomain}.grove.place&sz=32`
- Author name (from feed channel title, stored as `author_name`)
- Subdomain as subtle link to their blog
- Relative timestamp ("3h ago", "yesterday", "2 weeks ago")
- All links open the original blog in a new tab

**2. Content area**

- Post title as a link to the original post (`post.link`)
- Description/excerpt (from `post.description`, not the full content)
- Featured image if present (from `post.featured_image`)
- Clicking anywhere in the content area navigates to the original post

**3. Tags**

- Rendered as small `Badge` components
- Clickable to filter the feed by tag (future — just display for v1)

**4. Action bar**

- Upvote triangle (filled if user has voted, hollow if not)
- Reaction emoji row (the 10 warm emojis from the spec)
- Bookmark icon (filled if bookmarked)
- No visible score (votes are private per spec)
- No visible reaction counts for other users (author-only per spec)

### Styling notes

- Uses `GlassCard` as the outer container (default variant)
- Warm hover state (subtle glow, grove-50 border)
- Smooth transitions for vote/react/bookmark state changes
- Dark mode: cream-100 tones, NOT grove-\* (inverted scale gotcha)
- `prefers-reduced-motion` respected for all transitions
- Touch targets 44x44px minimum for action buttons

### Data type

```typescript
interface MeadowPost {
  id: string;
  title: string;
  description: string;
  link: string;
  authorName: string;
  authorSubdomain: string;
  tags: string[];
  featuredImage?: string;
  publishedAt: number; // Unix seconds
  score?: number; // only visible to Wayfinder
  userVoted?: boolean; // has current user upvoted
  userBookmarked?: boolean; // has current user bookmarked
  userReactions?: string[]; // emojis current user has sent
}
```

### Relative timestamp utility

**File:** `apps/meadow/src/lib/utils/time.ts`

The blogroll curio already has `formatPostDate()` in `libs/engine/src/lib/curios/blogroll/index.ts`. We can either:

1. Import it from the engine (it's already exported)
2. Copy and adapt it for Meadow's needs

Recommendation: Import from engine. It handles today/yesterday/weeks/months/years. If Meadow needs finer granularity ("3h ago", "47m ago"), extend it in Meadow's own utility and consider upstreaming later.

### Implementation checklist

- [ ] Create `src/lib/components/PostCard.svelte`
- [ ] Create `src/lib/types/post.ts` with `MeadowPost` interface
- [ ] Create `src/lib/utils/time.ts` (or import from engine blogroll)
- [ ] Wire up GlassCard, Badge from engine imports
- [ ] Build action bar with vote, react, bookmark buttons
- [ ] Add hover/active states with grove color system
- [ ] Test dark mode rendering (use cream-\* tokens)
- [ ] Test with `prefers-reduced-motion`
- [ ] Test touch targets on mobile viewport
- [ ] Create a story/demo page at `/vineyard` or similar for visual iteration

**Estimated time:** 1.5-2 hours for the component itself. Interaction wiring (API calls for vote/react/bookmark) is separate work.

---

## Implementation Order

```
Job 1: Fix RSS Feed ──────────┐
  (30-45 min)                 │
  Engine change, deploy       │
                              ▼
Job 2: RSS Polling ───────────┐
  (2-3 hours)                 │
  Meadow backend, deploy      │
                              ▼
Job 3: PostCard ──────────────┐
  (1.5-2 hours)               │
  Can start during Job 2      │
                              ▼
  Feed page wiring ───────────
  (connects PostCard to
   polling data, adds
   feed API routes)
```

Jobs 1 and 2 are strictly sequential (the poller needs content in the feeds). Job 3 can be built in parallel with Job 2 since it's a UI component with mock data. The final wiring connects them all.

**Total estimated time: 4-6 hours of focused work.**

For reference, the Reeds (comments) system took about 2 hours from plan to working code. Meadow's RSS and PostCard are more complex (external fetch, XML parsing, cron triggers), but the patterns are established. The engine's auth, TenantDb, GlassCard, and API patterns do most of the heavy lifting.

---

## Open Questions

1. **Opt-in vs opt-out for feed inclusion.** Should all tenants be polled by default, or should they explicitly opt in? The spec says "blogs opt in to share posts to the feed" but doesn't define the mechanism. For v1, polling all active tenants and adding an opt-out flag later seems pragmatic.

2. **Content truncation in feed.** Should `<content:encoded>` include the full post, or truncate at a word limit? Full content is better for RSS readers but means larger XML payloads. Recommendation: full content, with a reasonable post size limit already enforced by the blooms API (1MB max markdown).

3. **Feed URL for Meadow consumption.** Should Meadow poll `/api/feed` (the public RSS endpoint) or have a private `/api/feed/meadow` endpoint with richer data? Public RSS is simpler and means the same feed works for everything. Recommendation: use the public feed. If Meadow needs extra fields later, add a private endpoint then.

---

_The feeds need content before the meadow can bloom. Fix the source, build the pipe, paint the card._
