---
title: Meadow — Social Feed
description: A chronological feed connecting Grove blogs. Private voting, author-only reactions, no algorithms.
category: specs
specCategory: content-community
icon: users
lastUpdated: "2026-02-15"
aliases: []
date created: Friday, November 1st 2025
date modified: Saturday, February 15th 2026
tags:
  - social
  - community
  - cloudflare-workers
  - sveltekit
  - d1
type: tech-spec
---

# Meadow — Social Connection

```
                    the forest opens up here
                          ☀️
         .  *  .        .     .        .  *  .
       🌱      🌿              🌿      🌱
          \    |    /      \    |    /
           \   |   /        \   |   /
    ═══════════════════════════════════════════
            a gathering place
         where you can see each other clearly
    ═══════════════════════════════════════════
       🌸        ✨       🌿       ✨       🌸

      Pathways connect. No algorithms distract.
```

> _Connection without algorithms. Gathering without metrics._

Grove's social layer. A chronological feed across the network where votes are private, reactions go to the author, and no algorithm decides what you see. You follow who you choose. You read what was posted. That's it.

**Public Name:** Meadow
**Internal Name:** GroveMeadow
**Domain:** `meadow.grove.place`
**Status:** In Development
**Last Updated:** February 2026

A meadow is where the forest opens up. Sunlight reaches the ground. You can see the people around you clearly, without the dense canopy of algorithmic noise blocking the view.

Meadow is social media that remembers what "social" means. No public metrics breeding hierarchy. No viral mechanics rewarding the loudest voice. A chronological feed of people you chose to follow, with reactions that only the author can see. Encouragement without performance. Connection without competition.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [RSS Polling System](#rss-polling-system)
5. [Feed System](#feed-system)
6. [Voting System](#voting-system)
7. [Reaction System](#reaction-system)
8. [Bookmarks & Following](#bookmarks--following)
9. [Authentication](#authentication)
10. [Moderation](#moderation)
11. [Performance & Caching](#performance--caching)
12. [Privacy Model](#privacy-model)
13. [Implementation Checklist](#implementation-checklist)

---

## Overview

Meadow is the community layer of Grove. It provides a social feed where Wanderers discover posts from across the network, vote on content they love, react with emojis, and engage with each other. It's entirely optional. Blogs opt in to share posts to the feed.

### What it does

- Aggregates posts from opted-in Grove blogs via RSS polling
- Displays them in a chronological feed (with Popular, Hot, and Top filters)
- Lets Wanderers upvote posts they love (scores stay private)
- Lets Wanderers react with emojis (only the author sees who reacted)
- Lets Wanderers bookmark posts and follow specific blogs
- Gives authors a private dashboard showing how their posts are doing

### What it doesn't do

- No public scores or follower counts
- No algorithmic feed ranking
- No comments (your blog has those, the feed just links to it)
- No direct messaging (that's a different meadow)
- No public reaction counts (authors see them, nobody else)

### The philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Traditional Social          Meadow                            │
│   ─────────────────           ──────                            │
│   Public metrics              Private signals                   │
│   Algorithmic feed            Chronological feed                │
│   Reactions = performance     Reactions = encouragement         │
│   Follower counts             No counts shown                   │
│   Viral mechanics             Opt-in sharing                    │
│   Engagement bait             Authentic writing                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture

### Tech Stack

- **Frontend:** SvelteKit 2 + Svelte 5 (runes)
- **Runtime:** Cloudflare Pages + Workers
- **Database:** Cloudflare D1 (shared `grove-engine-db`)
- **Cache:** Cloudflare KV (feed pages, poll state, rate limits)
- **Auth:** Better Auth via login.grove.place (service binding)
- **UI Library:** `@autumnsgrove/lattice` (GlassCard, AccountStatus, Header, Toast, Tabs)
- **RSS Parsing:** `fast-xml-parser` (~30KB)

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                   meadow.grove.place (SvelteKit)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Routes                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │  /feed   │ │ /post/id │ │/bookmarks│ │  /arbor  │               │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘               │
│       │             │            │             │                     │
│  ┌────┴─────────────┴────────────┴─────────────┴──────┐             │
│  │              API Routes (/api/*)                    │             │
│  │  feed · vote · reaction · bookmark · follow · cron │             │
│  └────┬──────────────┬───────────────┬────────────────┘             │
│       │              │               │                              │
│       ▼              ▼               ▼                              │
│  ┌─────────┐   ┌──────────┐   ┌──────────────────┐                 │
│  │   D1    │   │ KV Cache │   │ AUTH (Heartwood)  │                 │
│  │ 6 tables│   │ feed/poll│   │ service binding   │                 │
│  └─────────┘   └──────────┘   └──────────────────┘                 │
│                                                                     │
│  Cron (every 15 min)                                                │
│  ┌──────────────────────────────────────────────┐                   │
│  │ RSS Poller: discover → fetch → parse → ingest│                   │
│  └──────────────────────────────────────────────┘                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Project Structure

```
packages/meadow/
├── src/
│   ├── app.css                     # Color system, fonts, glassmorphism
│   ├── app.d.ts                    # Platform types (D1, KV, AUTH, Locals)
│   ├── app.html                    # Shell with dark mode
│   ├── hooks.server.ts             # CSRF + session validation
│   ├── lib/
│   │   ├── components/
│   │   │   ├── PostCard.svelte     # Feed post card
│   │   │   ├── FeedFilters.svelte  # Filter tabs + time period
│   │   │   ├── VoteButton.svelte   # Upvote toggle
│   │   │   ├── ReactionPicker.svelte  # Emoji popover
│   │   │   ├── ReactionDisplay.svelte # Top emojis on card
│   │   │   ├── AuthorStats.svelte  # Private stats for author
│   │   │   ├── ReportModal.svelte  # Report post dialog
│   │   │   ├── EmailSignup.svelte  # Pre-launch waitlist
│   │   │   ├── Footer.svelte       # Meadow footer
│   │   │   └── SEO.svelte          # Open Graph metadata
│   │   ├── constants/
│   │   │   └── reactions.ts        # 10 default emojis
│   │   ├── server/
│   │   │   ├── types.ts            # All Meadow types
│   │   │   ├── feed.ts             # Feed queries
│   │   │   ├── votes.ts            # Vote mutations
│   │   │   ├── reactions.ts        # Reaction mutations
│   │   │   ├── bookmarks.ts        # Bookmark mutations
│   │   │   ├── follows.ts          # Follow mutations
│   │   │   └── moderation.ts       # Mod actions
│   │   └── rss/
│   │       ├── parser.ts           # XML → typed posts
│   │       ├── discovery.ts        # Feed URL discovery
│   │       └── ingest.ts           # Dedup + batch insert
│   └── routes/
│       ├── +layout.svelte          # Chrome (Header, Footer, curios)
│       ├── +layout.server.ts       # User + messages
│       ├── +page.svelte            # Feed (or coming-soon)
│       ├── +page.server.ts         # Load initial feed
│       ├── post/[id]/              # Post detail
│       ├── bookmarks/              # Saved posts
│       ├── profile/                # User profile
│       ├── auth/
│       │   ├── callback/+server.ts # OAuth callback
│       │   └── login/+page.server.ts  # Redirect to login hub
│       ├── arbor/                  # Admin panel
│       │   ├── moderation/         # Report queue
│       │   └── feed/               # Feed management
│       └── api/
│           ├── feed/               # Feed + post endpoints
│           ├── bookmarks/          # Bookmark listing
│           ├── following/          # Following listing
│           ├── follow/[tenantId]/  # Follow/unfollow
│           ├── cron/poll/          # RSS polling (cron-triggered)
│           └── health/             # Liveness probe
├── wrangler.toml                   # D1, KV, AUTH, cron triggers
└── static/                         # Favicons, manifest
```

---

## Database Schema

Six tables in a single migration (`075_meadow_social.sql`), all using the `meadow_*` prefix to stay clean in the shared D1 database. Plus one column addition to the existing `tenants` table for opt-in.

### Why six tables, not nine

The original design included `social_users`, `emojis`, and `user_activity`. All three are unnecessary for v1:

- **`social_users`**: Heartwood owns user identity. Every authenticated Wanderer already has an ID, name, email, and avatar via Better Auth. No need to duplicate.
- **`emojis`**: Ten default emojis are a TypeScript constant. A database table adds complexity for zero benefit at this scale.
- **`user_activity`**: Nice for analytics, but not needed to ship. Add in v2 if usage patterns warrant it.

Two more tables from early designs (`meadow_reactions_agg` and `meadow_poll_state`) are replaced by KV. Aggregate reaction counts and polling state are better served by fast key-value lookups than relational queries.

### Opt-in Column

```sql
-- Added to existing tenants table
ALTER TABLE tenants ADD COLUMN meadow_opt_in INTEGER DEFAULT 0;
```

Blog owners toggle this in their dashboard. When enabled, the RSS poller includes their feed. When disabled, their posts are removed from the feed immediately.

### meadow_posts

Denormalized posts from opted-in blogs, ingested via RSS polling.

```sql
CREATE TABLE meadow_posts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  original_post_id TEXT NOT NULL,
  blog_subdomain TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  slug TEXT NOT NULL,
  post_url TEXT NOT NULL,
  tags TEXT,                         -- JSON array
  published_at INTEGER NOT NULL,     -- Unix seconds
  ingested_at INTEGER NOT NULL,      -- Unix seconds
  upvote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,
  net_score INTEGER DEFAULT 0,
  reaction_count INTEGER DEFAULT 0,
  visible INTEGER DEFAULT 1,
  reported_count INTEGER DEFAULT 0,
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

**Important:** `published_at` and `ingested_at` store Unix **seconds**. When converting to JavaScript `Date`, multiply by 1000. (The post-migrator bug taught us this the hard way.)

### meadow_votes

One vote per Wanderer per post. Scores stay private.

```sql
CREATE TABLE meadow_votes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK(vote_type IN ('up', 'down')),
  created_at INTEGER NOT NULL,
  UNIQUE(post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES meadow_posts(id) ON DELETE CASCADE
);

CREATE INDEX idx_meadow_votes_post ON meadow_votes(post_id);
CREATE INDEX idx_meadow_votes_user ON meadow_votes(user_id);
```

### meadow_reactions

Emoji reactions. One reaction per emoji per Wanderer per post. A Wanderer can react with multiple different emojis on the same post.

```sql
CREATE TABLE meadow_reactions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  emoji_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(post_id, user_id, emoji_id),
  FOREIGN KEY (post_id) REFERENCES meadow_posts(id) ON DELETE CASCADE
);

CREATE INDEX idx_meadow_reactions_post ON meadow_reactions(post_id);
CREATE INDEX idx_meadow_reactions_user ON meadow_reactions(user_id);
```

### meadow_bookmarks

Saved posts. Simple toggle.

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

### meadow_follows

Blog subscriptions. Follow a tenant to see their posts in the "Following" filter.

```sql
CREATE TABLE meadow_follows (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_meadow_follows_user ON meadow_follows(user_id);
CREATE INDEX idx_meadow_follows_tenant ON meadow_follows(tenant_id);
```

### meadow_reports

Content reports for moderation. One report per Wanderer per post.

```sql
CREATE TABLE meadow_reports (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  reporter_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK(reason IN ('spam', 'harassment', 'misinformation', 'other')),
  detail TEXT,
  created_at INTEGER NOT NULL,
  resolved INTEGER DEFAULT 0,
  resolved_by TEXT,
  resolved_at INTEGER,
  UNIQUE(post_id, reporter_id),
  FOREIGN KEY (post_id) REFERENCES meadow_posts(id) ON DELETE CASCADE
);

CREATE INDEX idx_meadow_reports_post ON meadow_reports(post_id);
CREATE INDEX idx_meadow_reports_unresolved ON meadow_reports(resolved) WHERE resolved = 0;
```

---

## RSS Polling System

The feed needs content. Content comes from opted-in Grove blogs. We get it via RSS.

### How polling works

```
  Every 15 minutes (Cloudflare Cron)
  │
  ▼
  GET /api/cron/poll (authenticated via X-Cron-Secret)
  │
  ├── Query tenants WHERE meadow_opt_in = 1
  │
  ├── For each opted-in tenant:
  │   │
  │   ├── Discover feed URL (primary: /feed.xml)
  │   │   └── Cache in KV to avoid re-probing
  │   │
  │   ├── Fetch RSS XML (30s timeout)
  │   │
  │   ├── Parse with fast-xml-parser
  │   │   └── Extract: title, link, description, pubDate, guid, category
  │   │
  │   ├── Filter: skip posts where GUID already exists in meadow_posts
  │   │
  │   ├── Insert new posts (batch INSERT)
  │   │   └── Denormalize: excerpt from description, tags from category
  │   │
  │   └── Update KV poll state (last_polled, post_count, errors)
  │
  └── Return summary: { polled: N, new_posts: N, errors: N }
```

### Feed discovery

Grove blogs serve RSS at `https://{subdomain}.grove.place/feed.xml`. That's the primary URL. Fallbacks, in order:

1. `/feed.xml` (primary, always try first)
2. `/rss.xml`
3. `/feed`
4. `/rss`

Discovered URLs are cached in KV per tenant. If a blog's feed URL changes (unlikely), the cache expires after 24 hours and re-probes.

### RSS parser

Using `fast-xml-parser` for RSS 2.0 parsing. Grove's own RSS generator uses standard `<channel>` + `<item>` structure, so we know exactly what to expect:

```typescript
interface ParsedPost {
  guid: string; // <guid> or fall back to <link>
  title: string; // <title>
  excerpt: string; // <description>, stripped of HTML, truncated to 200 chars
  slug: string; // Extracted from <link> URL path
  postUrl: string; // <link>
  publishedAt: number; // <pubDate> parsed to Unix seconds
  tags: string[]; // <category> elements
}
```

### Resilience

- **30-second timeout** per feed fetch. Slow blogs don't block others.
- **Exponential backoff** on errors, tracked per tenant in KV. After 3 consecutive failures, skip for 1 hour. After 6, skip for 6 hours. Reset on success.
- **Per-blog isolation.** One failing blog never stops others from being polled.
- **Cron secret.** The polling endpoint requires `X-Cron-Secret` header to prevent public access.
- **Staggered fetches.** Don't hit all blogs simultaneously. Small random delay between fetches.

### Polling configuration

| Setting                  | Value            |
| ------------------------ | ---------------- |
| Frequency                | Every 15 minutes |
| Timeout per feed         | 30 seconds       |
| Max blogs per run        | 100              |
| Backoff after 3 failures | 1 hour           |
| Backoff after 6 failures | 6 hours          |
| Feed URL cache TTL       | 24 hours         |

---

## Feed System

### The feed

```
┌─────────────────────────────────────────────────────────────────┐
│  ☀️ Meadow                                    [avatar ▾]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [ All ]  Popular   Hot   Top ▾   Following                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  Why I Garden at Midnight                               │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │  There's something about the quiet hours when the       │    │
│  │  world sleeps. The soil feels different. The plants...  │    │
│  │                                                         │    │
│  │  🌿 oak.grove.place                       3 hours ago   │    │
│  │                                                         │    │
│  │  ▲  │  ❤️ 😂 🌱                           🔖            │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  Learning to Let Go of Perfection                       │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │  My first draft is always terrible. And that's okay.    │    │
│  │  Here's what I've learned about writing without...      │    │
│  │                                                         │    │
│  │  🌿 maple.grove.place                      yesterday    │    │
│  │                                                         │    │
│  │  ▲  │  ❤️❤️ 💚 ✨                          🔖            │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│                    Loading more...                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Feed filters

**All (default):** Every post, newest first. Pure chronological. What was posted, in the order it was posted.

**Popular:** Highest net score first. For discovering what resonated with the community.

**Hot:** Time-decay algorithm. Recent posts with votes rise, old posts with votes sink. Good for "what's interesting right now."

**Top:** Best posts from a time period (Today, This Week, This Month, This Year, All Time).

**Following:** Posts only from blogs you follow. Your personal timeline.

### Feed algorithms

```sql
-- All (chronological)
SELECT * FROM meadow_posts
WHERE visible = 1
ORDER BY ingested_at DESC
LIMIT 20 OFFSET :offset

-- Popular
SELECT * FROM meadow_posts
WHERE visible = 1
ORDER BY net_score DESC, ingested_at DESC
LIMIT 20 OFFSET :offset

-- Hot (HN-style time decay)
SELECT *,
  net_score / POWER((strftime('%s', 'now') - ingested_at) / 3600.0 + 2, 1.5) as hot_score
FROM meadow_posts
WHERE visible = 1
ORDER BY hot_score DESC
LIMIT 20 OFFSET :offset

-- Top (time period)
SELECT * FROM meadow_posts
WHERE visible = 1
  AND ingested_at >= :period_start
ORDER BY net_score DESC
LIMIT 20 OFFSET :offset

-- Following
SELECT p.* FROM meadow_posts p
INNER JOIN meadow_follows f ON f.tenant_id = p.tenant_id
WHERE p.visible = 1 AND f.user_id = :user_id
ORDER BY p.ingested_at DESC
LIMIT 20 OFFSET :offset
```

Each query left-joins `meadow_votes` and `meadow_bookmarks` when a user is authenticated, hydrating `user_vote` and `user_bookmarked` in a single pass. No N+1 queries.

### Feed API

```
GET /api/feed?filter=all&page=1&limit=20
GET /api/feed?filter=top&period=week&page=1
GET /api/feed?filter=following&page=1
```

**Response:**

```typescript
{
  success: true,
  data: {
    posts: FeedPost[],
    hasMore: boolean,
    total: number
  }
}
```

### PostCard component

Each post in the feed renders as a `GlassCard` with `hoverable` enabled:

```typescript
interface PostCardProps {
  post: FeedPost;
  onVote: (postId: string) => void;
  onReaction: (postId: string, emojiId: string) => void;
  onBookmark: (postId: string) => void;
  showAuthorStats?: boolean;
}
```

**Elements:**

- Title (links to original post on the author's blog)
- Excerpt (first 200 characters, plain text)
- Blog attribution (subdomain + relative timestamp)
- Upvote button (green when voted)
- Top 3 reaction emojis (size-scaled by count)
- Bookmark toggle

**Interactions:** All mutations use `api.post()` from `@autumnsgrove/lattice/utils` with optimistic updates and toast feedback on errors.

### Infinite scroll

Follows the Timeline component pattern from the engine:

```typescript
let page = $state(1);
let loadingMore = $state(false);
let hasMore = $state(true);

async function loadMore() {
  if (loadingMore || !hasMore) return;
  loadingMore = true;
  const result = await api.get(`/api/feed?filter=${filter}&page=${++page}`);
  posts = [...posts, ...result.data.posts];
  hasMore = result.data.hasMore;
  loadingMore = false;
}
```

Triggered by intersection observer on a sentinel element near the bottom of the feed.

---

## Voting System

Votes shape what surfaces in Popular, Hot, and Top filters. But nobody sees the scores. That's the whole point.

### How it works

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   What you see          What the author sees (private)          │
│   ──────────────        ──────────────────────────────          │
│                                                                 │
│   ▲  (green = voted)    "Why I Garden at Midnight"              │
│                            ▲  42 upvotes                        │
│   That's it.               +42 net score                        │
│   No numbers.                                                   │
│   No counts.             Only you can see these numbers.        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### v1: Upvote only

For launch, Meadow has upvotes only. No downvote button. Keep the meadow positive.

- Click ▲ to upvote. Click again to remove your vote.
- Button turns grove-500 green when you've voted.
- Scores are never displayed publicly.
- Authors see their upvote count in a private stats panel.
- Scores drive Popular/Hot/Top sorting behind the scenes.

Downvoting can be added later if the community needs it. The schema supports it (`vote_type IN ('up', 'down')`), but the UI won't expose it at launch.

### Vote API

```
POST   /api/feed/:id/vote     # Cast or toggle vote
DELETE /api/feed/:id/vote     # Remove vote
```

**Business rules:**

- One vote per Wanderer per post
- Can't vote on your own posts
- Requires authentication
- Rate limited: 100 votes per hour per Wanderer
- Casting a vote recalculates `net_score` on `meadow_posts`

### Author stats

```
GET /api/feed/:id/stats    # Requires auth, must be post author
```

Returns `{ upvotes: number, net_score: number }`. Only the post's author can access this.

---

## Reaction System

Reactions are gifts. You send one to say "this moved me" or "this made me laugh." The author sees them. Nobody else knows you sent it.

### The 10 default emojis

```
❤️  Love          💛  Warm          💚  Growth
💙  Calm          💜  Creative      😂  Joy
😮  Wow           😢  Moved         ✨  Magic
🌱  Growing
```

No angry emojis. No thumbs down. No eye-roll. This is a space for encouragement.

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

### Reaction display

**On the feed card:** Top 3 most-used emojis shown. Size scales gently with count (base 20px, +1px per reaction, max 32px). Clicking an emoji either adds or removes your reaction.

**On the post detail page:** All emojis with counts. But only the author sees the counts. Everyone else sees just the emoji icons.

**The picker:** A popover grid of all 10 emojis. Click to toggle. Your active reactions are highlighted.

```
┌─────────────────────────────────────────┐
│  React to this post                     │
│                                         │
│  ❤️  💛  💚  💙  💜                       │
│  😂  😮  😢  ✨  🌱                       │
│                                         │
│  ✓ = your reaction                      │
└─────────────────────────────────────────┘
```

### Reaction API

```
POST   /api/feed/:id/reaction    # { emoji_id: string }
DELETE /api/feed/:id/reaction    # { emoji_id: string }
```

**Business rules:**

- One reaction per emoji per Wanderer per post
- A Wanderer can use multiple different emojis on the same post
- Requires authentication
- Rate limited: 200 reactions per hour per Wanderer

### Future: Emoji Kitchen

v2 could introduce Emoji Kitchen combos (custom hybrid emojis hosted on R2). The schema supports arbitrary `emoji_id` strings, so this is forward-compatible.

---

## Bookmarks & Following

### Bookmarks

Save posts for later. Simple toggle on the PostCard.

```
POST /api/feed/:id/bookmark    # Toggles bookmark on/off
GET  /api/bookmarks            # List user's saved posts (paginated)
```

The `/bookmarks` page shows saved posts in the order they were bookmarked (most recent first). Same PostCard component, same interactions.

### Following

Follow a blog to see their posts in the "Following" feed filter.

```
POST   /api/follow/:tenantId    # Follow a blog
DELETE /api/follow/:tenantId    # Unfollow
GET    /api/following           # List followed blogs
```

Follow buttons appear on the PostCard (next to the blog attribution) and on the post detail page. When you follow a blog, their posts appear in your Following feed.

---

## Authentication

Auth is a drop-in. The engine's auth infrastructure handles everything.

### How it works

```
  Wanderer clicks "Sign in"
  │
  ▼
  /auth/login (SvelteKit page)
  │ Redirects to login.grove.place via buildLoginUrl()
  │
  ▼
  login.grove.place (Better Auth)
  │ Handles sign-in (email, passkey, social)
  │ Sets session cookie on .grove.place domain
  │
  ▼
  /auth/callback (SvelteKit server route)
  │ createCallbackHandler() verifies session cookie
  │ Redirects to /feed (or returnTo param)
  │
  ▼
  hooks.server.ts (every request)
  │ Validates session via AUTH service binding
  │ Sets event.locals.user
  │
  ▼
  Header renders AccountStatus (avatar + dropdown)
```

### The four files

**`hooks.server.ts`** — CSRF validation + session validation via `platform.env.AUTH.fetch()`. Sets `locals.user` for every request. Adapted from Landing's hooks.

**`/auth/callback/+server.ts`** — One meaningful line:

```typescript
import { createCallbackHandler } from "@autumnsgrove/lattice/grafts/login/server";
export const GET = createCallbackHandler({ defaultReturnTo: "/feed" });
```

**`/auth/login/+page.server.ts`** — Redirect to login hub:

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

**`+layout.server.ts`** — Passes `locals.user` to all routes so the Header can render AccountStatus.

### Public vs protected

| Route                   | Auth required           |
| ----------------------- | ----------------------- |
| `/` (feed)              | No. Browse anonymously. |
| `/post/:id`             | No. Read freely.        |
| Vote / React / Bookmark | Yes.                    |
| `/bookmarks`            | Yes.                    |
| `/profile`              | Yes.                    |
| `/arbor/*` (admin)      | Yes + Wayfinder check.  |

### Platform types

```typescript
// app.d.ts
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

---

## Moderation

Minimal for v1. Three capabilities: view reports, hide posts, ban blogs. Auto-hide at 3 reports.

### For Wanderers

- **Report button** on every PostCard. Opens a modal with reason selection: Spam, Harassment, Misinformation, Other.
- One report per Wanderer per post. Optional detail text.
- **Auto-hide:** After 3 unique reports, a post is automatically hidden from the feed (`visible = 0`). It stays hidden until a moderator reviews it.

### For admins (Wayfinder gate)

**`/arbor/moderation`** — Report queue:

- View unresolved reports, sorted by count (most-reported first)
- Resolve or dismiss individual reports
- Hide/unhide posts from the feed
- Ban/unban tenants from Meadow (sets `meadow_opt_in = 0`)

**`/arbor/feed`** — Feed management:

- View all posts with moderation controls
- Bulk hide/unhide
- Post analytics (total votes, reactions, reports)

### Report API

```
POST /api/feed/:id/report    # { reason: string, detail?: string }
```

### Deferred to v2

- Shadow banning (votes don't count, user doesn't know)
- Vote count resets (for brigading)
- IP-level banning
- Per-post reaction disabling
- Moderation log/audit trail

---

## Performance & Caching

### KV cache strategy

```
feed:{filter}:page:{n}          → JSON of posts       (TTL: 5 min)
feed:post:{id}:stats            → Vote/reaction counts (TTL: 1 min)
poll:state:{tenant_id}          → Last poll metadata    (TTL: none, explicit update)
poll:feed_url:{subdomain}       → Discovered feed URL   (TTL: 24 hours)
ratelimit:{action}:{key}:{window} → Rate limit counter  (TTL: window duration)
```

### Cache invalidation

| Event             | Invalidated keys                                       |
| ----------------- | ------------------------------------------------------ |
| New post ingested | `feed:all:page:*`                                      |
| Vote cast         | `feed:post:{id}:stats`, `feed:popular:*`, `feed:hot:*` |
| Reaction added    | `feed:post:{id}:stats`                                 |
| Post hidden       | All feed caches                                        |

### Rate limits

| Action     | Authenticated | Anonymous |
| ---------- | ------------- | --------- |
| Feed views | 1000/hr       | 100/hr    |
| Votes      | 100/hr        | N/A       |
| Reactions  | 200/hr        | N/A       |
| Reports    | 10/hr         | N/A       |

Rate limiting uses KV counters with sliding windows. Returns `429 Too Many Requests` with `Retry-After` header.

---

## Privacy Model

Privacy is core to Meadow's design. Here's exactly what's visible to whom.

| Data          | The Wanderer              | The Author               | Everyone else                |
| ------------- | ------------------------- | ------------------------ | ---------------------------- |
| Posts on feed | Title, excerpt, link      | Same + private stats     | Same as Wanderer             |
| Votes         | Own vote (up/none)        | Total upvote count       | Nothing                      |
| Reactions     | Own reactions highlighted | Emoji + counts per emoji | Emoji icons only (no counts) |
| Bookmarks     | Own saved list            | Nothing                  | Nothing                      |
| Follows       | Own follow list           | Nothing                  | Nothing                      |
| Reports       | Own report status         | Nothing                  | Nothing                      |

### Data export

Wanderers can export their data:

- Votes (list of posts they voted on)
- Reactions (list of posts + emojis)
- Bookmarks (list of saved posts)
- Following (list of blogs)

### Data deletion

When a Wanderer deletes their account:

- All votes removed (post scores recalculated)
- All reactions removed (counts updated)
- All bookmarks removed
- All follows removed
- All reports anonymized (reporter_id cleared, report data kept for moderation history)

---

## Implementation Checklist

### Phase 1: Foundation

- [ ] Write migration `075_meadow_social.sql` (6 tables + tenants column)
- [ ] Update `wrangler.toml` (KV namespace, AUTH service binding, cron trigger, env vars)
- [ ] Update `app.d.ts` (KV, AUTH, Locals types)
- [ ] Create `hooks.server.ts` (CSRF + session validation, adapted from Landing)
- [ ] Create `/auth/callback/+server.ts` (one-line `createCallbackHandler`)
- [ ] Create `/auth/login/+page.server.ts` (redirect to login hub)
- [ ] Update `+layout.server.ts` (pass `locals.user` to all routes)
- [ ] Update layout to pass `user` to Header for AccountStatus
- [ ] Create KV namespace via wrangler CLI

### Phase 2: Data Pipeline

- [ ] Install `fast-xml-parser` dependency
- [ ] Create `src/lib/rss/parser.ts` (XML parsing)
- [ ] Create `src/lib/rss/discovery.ts` (feed URL discovery with fallbacks)
- [ ] Create `src/lib/rss/ingest.ts` (dedup + batch insert)
- [ ] Create `src/routes/api/cron/poll/+server.ts` (cron-triggered polling endpoint)
- [ ] Create `src/lib/server/types.ts` (all Meadow types)
- [ ] Create `src/lib/server/feed.ts` (feed queries with all 5 filters)
- [ ] Create `src/lib/server/votes.ts` (vote mutations + score recalc)
- [ ] Create `src/lib/server/reactions.ts` (reaction mutations)
- [ ] Create `src/lib/server/bookmarks.ts` (bookmark toggle)
- [ ] Create `src/lib/server/follows.ts` (follow/unfollow)
- [ ] Create `src/lib/server/moderation.ts` (hide, report, ban)
- [ ] Add `CRON_SECRET` environment variable

### Phase 3: Feed UI

- [ ] Create `src/lib/constants/reactions.ts` (10 default emojis)
- [ ] Create `PostCard.svelte` (GlassCard + vote + reactions + bookmark)
- [ ] Create `FeedFilters.svelte` (filter tabs + time period selector)
- [ ] Create `VoteButton.svelte` (upvote toggle)
- [ ] Create `ReactionPicker.svelte` (emoji popover)
- [ ] Create `ReactionDisplay.svelte` (top emojis on card)
- [ ] Create feed page (`+page.svelte` with infinite scroll)
- [ ] Create feed server load (`+page.server.ts`)
- [ ] Create post detail page (`/post/[id]/`)
- [ ] Create bookmarks page (`/bookmarks/`)
- [ ] Create all API endpoints (feed, vote, reaction, bookmark, follow, report, stats)
- [ ] Implement KV-based rate limiting middleware
- [ ] Move coming-soon to conditional render (pre-launch gate)

### Phase 4: Moderation & Polish

- [ ] Create `ReportModal.svelte` (reason selector)
- [ ] Create `AuthorStats.svelte` (private stats panel)
- [ ] Create `/arbor` layout with Wayfinder gate
- [ ] Create `/arbor/moderation` (report queue)
- [ ] Create `/arbor/feed` (feed management)
- [ ] Implement auto-hide at 3 reports
- [ ] Create deploy workflow (`.github/workflows/deploy-meadow.yml`)
- [ ] Write tests (RSS parser, feed queries, vote logic)
- [ ] Add error monitoring and poll failure alerts

---

## Wrangler Configuration

```toml
name = "grove-meadow"
compatibility_date = "2025-12-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".svelte-kit/cloudflare"

[vars]
SITE_NAME = "Meadow"
SITE_URL = "http://localhost:5175"

[[d1_databases]]
binding = "DB"
database_name = "grove-engine-db"
database_id = "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68"

[[kv_namespaces]]
binding = "CACHE_KV"
id = "TBD"

[[services]]
binding = "AUTH"
service = "grove-heartwood"

[triggers]
crons = ["*/15 * * * *"]

[env.production.vars]
SITE_NAME = "Meadow"
SITE_URL = "https://meadow.grove.place"
```

---

## Success Metrics

**Launch goals (Month 1):**

- 5 blogs opted into the feed
- 50 posts in the feed
- 20 registered Wanderers
- 100 total votes cast
- 200 total reactions sent

**Growth goals (Month 3):**

- 15 blogs opted in
- 200 posts in the feed
- 100 Wanderers
- 1,000 votes
- 2,000 reactions
- Zero unresolved moderation incidents

**The real metric:** Do people come back? If Wanderers visit the feed more than once a week, Meadow is working. If they don't, no amount of votes or reactions matters.

---

_The forest opens up here. You can see each other clearly._
