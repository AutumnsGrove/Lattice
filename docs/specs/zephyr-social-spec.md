---
title: Zephyr Social — Cross-Platform Broadcasting
description: Extending Zephyr from email gateway to unified messaging with social cross-posting
category: specs
specCategory: operations
icon: megaphone
lastUpdated: "2026-02-07"
aliases: []
tags:
  - social
  - marketing
  - infrastructure
  - cloudflare-workers
  - automation
type: tech-spec
---

# Zephyr Social — Seeds on the Wind

```
                         . _ .  _ .  . _ .
                      .  _  . _   _ .  _  .
                   .   _   .   ~ ~ ~   .   _   .
                .    _    . ~ ZEPHYR ~ .    _    .
                   .   _   .   ~ ~ ~   .   _   .
                      .  _  . _   _ .  _  .
                         . _ .  _ .  . _ .

                               │
                    ╭──────────┴──────────╮
                    │    content enters   │
                    ╰──────────┬──────────╯
                               │
                ╱──────────────┼──────────────╲
               ╱               │               ╲
          🦋               🌿               📖
       ┌──────┐         ┌──────┐         ┌──────┐
       │Bluesky│         │Fedi  │         │DEV.to│
       └──────┘         └──────┘         └──────┘
         seed             seed             seed
         lands            lands            lands
         here             here             here

              Carried seeds to new soil,
            pollen to waiting flowers,
              whispers to distant ears.
```

> _The wind doesn't just carry letters. It scatters seeds._

Zephyr already carries every email from every Grove service on one gentle wind. This extension gives the wind a second gift: scattering social content across platforms. Write once, post everywhere. One interface. Same reliability. Same logging. Same home.

**Public Name:** Zephyr Social
**Internal Name:** GroveZephyr (extended)
**Domain:** _(internal service, extends existing Zephyr worker)_
**Parent Spec:** [Zephyr — Email Gateway](zephyr-spec.md)
**Last Updated:** February 2026

In mythology, Zephyrus carried seeds to new soil. Email was the first seed. Social broadcasting is the second. The same gentle, reliable wind. The same invisible infrastructure. Just more places for things to grow.

---

## Overview

Zephyr Social extends the existing Zephyr email gateway with social cross-posting. Instead of building a separate service, we add a new channel alongside email, reusing the same patterns: validation, rate limiting, retry logic, D1 logging, and circuit breakers.

**The problem it solves:**

- Manual cross-posting is tedious and inconsistent
- Posting to 3+ platforms means 3+ browser tabs, 3+ logins, 3+ copy-paste sessions
- Content gets stale because the friction of posting everywhere is too high
- No central record of what was posted where and when
- No way to schedule posts from code or CLI

**The solution:**

```typescript
// One call. Every platform.
const result = await Zephyr.broadcast({
  channel: "social",
  content: "Just shipped a new feature for Grove. 🌿",
  platforms: ["bluesky", "mastodon"],
  scheduledAt: "2026-02-08T09:00:00Z",
});

// Long-form? Syndicate a blog post with canonical URL
const result = await Zephyr.broadcast({
  channel: "social",
  content: blogPost.excerpt,
  platforms: ["bluesky", "mastodon", "devto"],
  longForm: {
    title: blogPost.title,
    body: blogPost.markdown,
    canonicalUrl: `https://grove.place/blog/${blogPost.slug}`,
    tags: blogPost.tags,
  },
});
```

**One sentence:** _"Grove speaks to the world through Zephyr."_

---

## Architecture

Zephyr Social slots into the existing Zephyr architecture as a parallel channel. Email and social share pre-processing (auth, validation, rate limiting) but diverge at the provider layer.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            GROVE SERVICES                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Arbor     │  │    CLI      │  │   Engine    │  │   Cron      │         │
│  │  (admin)    │  │ (terminal)  │  │ (blog hook) │  │ (scheduled) │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          │   Zephyr.broadcast({ channel: "social", ... })   │
          │                │                │                │
          └────────────────┴────────┬───────┴────────────────┘
                                    │
┌───────────────────────────────────┴─────────────────────────────────────────┐
│                         ZEPHYR (Cloudflare Worker)                           │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                     Shared Pre-Processing                              │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │  │
│  │  │  Auth         │  │  Validation  │  │ Rate Limiter │                  │  │
│  │  │  (X-API-Key)  │  │  (schema)    │  │ (per-tenant) │                  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                  │  │
│  └────────────────────────────┬───────────────────────────────────────────┘  │
│                               │                                              │
│              ┌────────────────┴────────────────┐                             │
│              │                                 │                             │
│     ┌────────▼────────┐              ┌─────────▼─────────┐                   │
│     │  EMAIL CHANNEL  │              │  SOCIAL CHANNEL   │                   │
│     │  (existing)     │              │  (new)            │                   │
│     │                 │              │                   │                   │
│     │  Template       │              │  Content Adapter  │                   │
│     │  Rendering      │              │  (per-platform)   │                   │
│     │       │         │              │       │           │                   │
│     │  Provider       │              │  Provider Fan-Out │                   │
│     │  (Resend)       │              │  (parallel send)  │                   │
│     └────────┬────────┘              └─────────┬─────────┘                   │
│              │                                 │                             │
│  ┌───────────┴─────────────────────────────────┴──────────────────────────┐  │
│  │                         Shared Post-Processing                         │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │  │
│  │  │  Log to D1   │  │  Update      │  │  Return      │                  │  │
│  │  │  (audit)     │  │  Metrics     │  │  Result      │                  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────┬──────────────────────────────┘
                                               │
┌──────────────────────────────────────────────┴──────────────────────────────┐
│                          SOCIAL PROVIDERS                                     │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                        │
│  │   Bluesky    │  │   Mastodon   │  │   DEV.to     │                        │
│  │   AT Proto   │  │   REST API   │  │ Articles API │                        │
│  │              │  │              │  │              │                        │
│  │  Short-form  │  │  Short-form  │  │  Long-form   │                        │
│  │  300 chars   │  │  500 chars   │  │  Articles    │                        │
│  └──────────────┘  └──────────────┘  └──────────────┘                        │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐                                          │
│  │   LinkedIn   │  │   Threads    │    Phase 2: Requires app approval        │
│  │   REST API   │  │  Graph API   │                                          │
│  └──────────────┘  └──────────────┘                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Platform Adapters

Each platform is a provider, just like Resend is a provider for email. Same pattern. Same interface contract.

### Phase 1: Open Platforms (No Approval Required)

| Platform     | Auth Method        | Content Type       | Char Limit          | API Cost |
| ------------ | ------------------ | ------------------ | ------------------- | -------- |
| **Bluesky**  | App password       | Short-form posts   | 300 graphemes       | Free     |
| **Mastodon** | OAuth bearer token | Short-form posts   | 500 chars (default) | Free     |
| **DEV.to**   | API key            | Long-form articles | No limit            | Free     |

### Phase 2: Gated Platforms (App Review Required)

| Platform     | Auth Method               | Content Type     | Char Limit | API Cost |
| ------------ | ------------------------- | ---------------- | ---------- | -------- |
| **LinkedIn** | OAuth 2.0 + Marketing API | Short-form posts | 3000 chars | Free     |
| **Threads**  | OAuth via Meta            | Short-form posts | 500 chars  | Free     |

### Provider Interface

Every social provider implements the same contract:

```typescript
interface SocialProvider {
  /** Platform identifier */
  platform: SocialPlatform;

  /** Post short-form content */
  post(content: SocialContent): Promise<SocialDelivery>;

  /** Publish long-form article (optional, not all platforms support it) */
  publish?(article: ArticleContent): Promise<SocialDelivery>;

  /** Check if credentials are valid */
  healthCheck(): Promise<boolean>;
}

interface SocialContent {
  /** The text to post */
  text: string;
  /** Optional link to include */
  url?: string;
  /** Optional alt text for link preview */
  altText?: string;
}

interface ArticleContent {
  title: string;
  body: string;
  canonicalUrl: string;
  tags?: string[];
  series?: string;
  published?: boolean;
}

interface SocialDelivery {
  success: boolean;
  platform: SocialPlatform;
  /** Platform-specific post ID */
  postId?: string;
  /** URL to the published post */
  postUrl?: string;
  /** True when the platform was silently skipped (e.g., DEV.to without longForm) */
  skipped?: boolean;
  /** Human-readable reason for skip */
  skipReason?: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}
```

### Bluesky Adapter

Bluesky uses the AT Protocol. Auth is a simple app password (no OAuth dance).

```typescript
// providers/bluesky.ts
import { BskyAgent } from "@atproto/api";

export class BlueskyProvider implements SocialProvider {
  platform = "bluesky" as const;
  private agent: BskyAgent;

  async post(content: SocialContent): Promise<SocialDelivery> {
    await this.ensureSession();

    const record = await this.agent.post({
      text: content.text,
      ...(content.url && {
        facets: this.buildLinkFacets(content.text, content.url),
      }),
    });

    return {
      success: true,
      platform: "bluesky",
      postId: record.uri,
      postUrl: this.buildPostUrl(record.uri),
    };
  }
}
```

**Secrets required:** `BLUESKY_HANDLE`, `BLUESKY_APP_PASSWORD`

### Mastodon Adapter

Standard REST API. One-time OAuth setup gives a long-lived bearer token.

```typescript
// providers/mastodon.ts
export class MastodonProvider implements SocialProvider {
  platform = "mastodon" as const;

  async post(content: SocialContent): Promise<SocialDelivery> {
    const status = content.url
      ? `${content.text}\n\n${content.url}`
      : content.text;

    const response = await fetch(`${this.instanceUrl}/api/v1/statuses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();
    return {
      success: true,
      platform: "mastodon",
      postId: data.id,
      postUrl: data.url,
    };
  }
}
```

**Secrets required:** `MASTODON_INSTANCE_URL`, `MASTODON_ACCESS_TOKEN`

### DEV.to Adapter

For long-form blog syndication. Posts articles with canonical URLs pointing back to Grove, so search engines know where the original lives.

```typescript
// providers/devto.ts
export class DevtoProvider implements SocialProvider {
  platform = "devto" as const;

  async publish(article: ArticleContent): Promise<SocialDelivery> {
    const response = await fetch("https://dev.to/api/articles", {
      method: "POST",
      headers: {
        "api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        article: {
          title: article.title,
          body_markdown: article.body,
          canonical_url: article.canonicalUrl,
          tags: article.tags?.slice(0, 4), // DEV.to max 4 tags
          series: article.series,
          published: article.published ?? false,
        },
      }),
    });

    const data = await response.json();
    return {
      success: true,
      platform: "devto",
      postId: String(data.id),
      postUrl: data.url,
    };
  }

  async post(content: SocialContent): Promise<SocialDelivery> {
    // DEV.to is article-only. Short posts silently skip this platform.
    // Returns skipped status instead of an error — the broadcast handler
    // excludes skipped platforms from the attempted/failed counts.
    return {
      success: true,
      platform: "devto",
      skipped: true,
      skipReason: "DEV.to only supports long-form articles",
    };
  }
}
```

**Secrets required:** `DEVTO_API_KEY`

---

## API Design

### Broadcast Interface

The broadcast API mirrors email's `send()` but for social content.

```typescript
interface BroadcastRequest {
  /** Channel identifier */
  channel: "social";

  /** The content to post */
  content: string;

  /** Target platforms (or "all" for every configured platform) */
  platforms: SocialPlatform[] | "all";

  /** Optional long-form content for article-supporting platforms */
  longForm?: {
    title: string;
    body: string;
    canonicalUrl: string;
    tags?: string[];
    series?: string;
    /** Post as draft on platforms that support it (DEV.to) */
    draft?: boolean;
  };

  /** Schedule for later (ISO timestamp) */
  scheduledAt?: string;

  /** Prevent duplicate posts. If omitted, a fallback key is generated
   *  from hash(content + platforms + scheduled_at) to catch accidental dupes. */
  idempotencyKey?: string;

  /** Metadata for logging */
  metadata?: {
    tenant?: string;
    source?: string;
    correlationId?: string;
    /** Link back to the content in Grove */
    groveUrl?: string;
  };
}

interface BroadcastResponse {
  success: boolean;
  /** True when at least one platform succeeded but not all */
  partial: boolean;
  /** Per-platform delivery results */
  deliveries: SocialDelivery[];
  /** Summary counts */
  summary: {
    attempted: number;
    succeeded: number;
    failed: number;
  };
  metadata: {
    broadcastId: string;
    latencyMs: number;
  };
}

type SocialPlatform =
  | "bluesky"
  | "mastodon"
  | "devto"
  | "linkedin" // Phase 2
  | "threads"; // Phase 2
```

### Content Adaptation

Content transforms to fit each platform's constraints. The adapter trims, reformats, and appends links as needed.

```typescript
interface ContentAdapter {
  /** Adapt content for a specific platform */
  adapt(
    content: string,
    platform: SocialPlatform,
    options?: { url?: string; longForm?: boolean },
  ): string;
}
```

**Adaptation rules:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CONTENT ADAPTATION FLOW                              │
│                                                                         │
│  Original content (any length)                                          │
│       │                                                                 │
│       ├──▶ Bluesky (300 graphemes)                                      │
│       │    └─ Trim to 280 + "..." if over limit                         │
│       │    └─ Rich text facets for links and mentions                   │
│       │                                                                 │
│       ├──▶ Mastodon (500 chars default)                                 │
│       │    └─ Trim to 480 + "..." if over limit                         │
│       │    └─ URLs count as 23 chars (Mastodon link shortening)         │
│       │                                                                 │
│       ├──▶ DEV.to (articles only)                                       │
│       │    └─ Silently skip if no longForm content (not counted as failure) │
│       │    └─ Full markdown body, canonical URL, up to 4 tags           │
│       │                                                                 │
│       ├──▶ LinkedIn (3000 chars)                                        │
│       │    └─ Generally fits without trimming                           │
│       │    └─ Append link at end                                        │
│       │                                                                 │
│       └──▶ Threads (500 chars)                                          │
│            └─ Same rules as Mastodon                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Usage Examples

```typescript
import { Zephyr } from "@autumnsgrove/lattice/zephyr";

// Quick thought, post to short-form platforms
const result = await Zephyr.broadcast({
  channel: "social",
  content:
    "Building in public is scary and wonderful. Today I shipped cross-posting from code. The wind carries more than letters now. 🌿",
  platforms: ["bluesky", "mastodon"],
});

// Blog post syndication: teaser to social, full article to DEV.to
const result = await Zephyr.broadcast({
  channel: "social",
  content:
    "New post: Why I Left Big Tech to Build a Forest\n\nOn leaving the algorithm behind and planting something real.",
  platforms: ["bluesky", "mastodon", "devto"],
  longForm: {
    title: "Why I Left Big Tech to Build a Forest",
    body: fullMarkdownContent,
    canonicalUrl: "https://grove.place/blog/why-i-left-big-tech",
    tags: ["indie-web", "building-in-public", "queer-tech"],
  },
  metadata: {
    source: "engine-blog-hook",
    groveUrl: "https://grove.place/blog/why-i-left-big-tech",
  },
});

// Scheduled launch announcement
const result = await Zephyr.broadcast({
  channel: "social",
  content:
    "Grove is open for signups. A forest for your words. Come find your clearing. 🌲\n\nhttps://grove.place",
  platforms: "all",
  scheduledAt: "2026-03-01T14:00:00Z",
  idempotencyKey: "launch-announcement-2026-03-01",
});
```

---

## Endpoints

### POST /broadcast

The primary endpoint. Authenticated with the same `X-API-Key` as email sending.

```
POST /broadcast
Content-Type: application/json
X-API-Key: <ZEPHYR_API_KEY>

{
  "channel": "social",
  "content": "Hello from code!",
  "platforms": ["bluesky", "mastodon"]
}
```

**Response (200):**

```json
{
  "success": true,
  "deliveries": [
    {
      "success": true,
      "platform": "bluesky",
      "postId": "at://did:plc:.../app.bsky.feed.post/...",
      "postUrl": "https://bsky.app/profile/.../post/..."
    },
    {
      "success": true,
      "platform": "mastodon",
      "postId": "123456789",
      "postUrl": "https://mastodon.social/@autumn/123456789"
    }
  ],
  "summary": {
    "attempted": 2,
    "succeeded": 2,
    "failed": 0
  },
  "metadata": {
    "broadcastId": "brd_abc123",
    "latencyMs": 1240
  }
}
```

### POST /broadcast/queue

Queue a post for later delivery via cron. Same body as `/broadcast`, but always deferred.

```
POST /broadcast/queue
Content-Type: application/json
X-API-Key: <ZEPHYR_API_KEY>

{
  "channel": "social",
  "content": "Scheduled thought.",
  "platforms": ["bluesky"],
  "scheduledAt": "2026-02-10T09:00:00Z"
}
```

**Response (202):**

```json
{
  "queued": true,
  "broadcastId": "brd_def456",
  "scheduledAt": "2026-02-10T09:00:00Z"
}
```

### GET /broadcast/status/:id

Check delivery status for a broadcast.

### GET /broadcast/platforms

List configured platforms and their health.

```json
{
  "platforms": [
    { "name": "bluesky", "configured": true, "healthy": true },
    { "name": "mastodon", "configured": true, "healthy": true },
    { "name": "devto", "configured": true, "healthy": true },
    { "name": "linkedin", "configured": false },
    { "name": "threads", "configured": false }
  ]
}
```

---

## Scheduled Posts & Cron

Zephyr gains a cron trigger for processing queued broadcasts.

### Wrangler Configuration (Addition)

```toml
# Added to existing wrangler.toml
[triggers]
crons = ["*/15 * * * *"]  # Every 15 minutes, check queue (conserves free tier quota)
```

### Queue Processing Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                         CRON TRIGGER (every 15 min)                      │
│                                                                        │
│   1. Query D1 for posts where:                                         │
│      scheduled_at <= NOW and status = 'queued'                         │
│                                                                        │
│   2. For each queued post:                                              │
│      ┌──────────────────────────────────────────────────┐              │
│      │  Mark status = 'processing'                       │              │
│      │       │                                           │              │
│      │  Fan out to platform adapters (parallel)          │              │
│      │       │                                           │              │
│      │  ┌────┴────┬────────┬──────────┐                  │              │
│      │  │ Bluesky │ Fedi   │ DEV.to   │                  │              │
│      │  └────┬────┘────┬───┘────┬─────┘                  │              │
│      │       │         │        │                         │              │
│      │  Collect results, log per-platform delivery        │              │
│      │       │                                           │              │
│      │  Mark status = 'delivered' or 'partial' or 'failed'│              │
│      └──────────────────────────────────────────────────┘              │
│                                                                        │
│   3. Clean up: Remove delivered posts older than 30 days               │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Why Not Immediate + Queue?

Both. Broadcasts sent without `scheduledAt` go out immediately via `/broadcast`. Broadcasts with `scheduledAt` (or sent to `/broadcast/queue`) enter the D1 queue and the cron processes them. This gives you fire-and-forget for quick posts and reliable scheduling for planned content.

---

## D1 Schema (Additions)

These tables live alongside the existing `zephyr_logs` and `zephyr_rate_limits` tables in the same D1 database.

```sql
-- Social broadcast queue and audit trail
CREATE TABLE zephyr_broadcasts (
  id TEXT PRIMARY KEY,

  -- Content
  content TEXT NOT NULL,
  long_form_title TEXT,
  long_form_body TEXT,
  canonical_url TEXT,
  tags TEXT,                    -- JSON array

  -- Targeting
  platforms TEXT NOT NULL,      -- JSON array of platform names

  -- Status
  status TEXT NOT NULL DEFAULT 'queued',
    -- queued | processing | delivered | partial | failed

  -- Context
  tenant TEXT,
  source TEXT,
  correlation_id TEXT,
  idempotency_key TEXT,
  grove_url TEXT,

  -- Timestamps
  created_at INTEGER NOT NULL,
  scheduled_at INTEGER,
  processed_at INTEGER
);

CREATE INDEX idx_broadcasts_status ON zephyr_broadcasts(status, scheduled_at);
CREATE INDEX idx_broadcasts_created ON zephyr_broadcasts(created_at);
CREATE UNIQUE INDEX idx_broadcasts_idempotency ON zephyr_broadcasts(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
-- Note: When no idempotency_key is provided by the caller, the broadcast handler
-- generates a fallback key as hash(content + platforms + scheduled_at). This ensures
-- accidental duplicate submissions (retries, double-clicks) are caught even without
-- an explicit key. Only truly distinct broadcasts bypass deduplication.

-- Per-platform delivery results (one row per platform per broadcast)
CREATE TABLE zephyr_social_deliveries (
  id TEXT PRIMARY KEY,
  broadcast_id TEXT NOT NULL REFERENCES zephyr_broadcasts(id),

  -- Platform
  platform TEXT NOT NULL,

  -- Result
  success INTEGER NOT NULL,
  post_id TEXT,
  post_url TEXT,
  error_code TEXT,
  error_message TEXT,

  -- Performance
  attempts INTEGER DEFAULT 1,
  latency_ms INTEGER,

  -- Timestamps
  created_at INTEGER NOT NULL,
  delivered_at INTEGER
);

CREATE INDEX idx_deliveries_broadcast ON zephyr_social_deliveries(broadcast_id);
CREATE INDEX idx_deliveries_platform ON zephyr_social_deliveries(platform);
```

### Why Separate Tables?

Broadcasts are one-to-many: one broadcast fans out to multiple platforms. The delivery table tracks each platform independently, so partial failures (Bluesky succeeded, Mastodon failed) are visible and retryable per-platform.

---

## Rate Limiting

Social platforms have their own rate limits. Zephyr respects them with per-platform counters, same pattern as email.

```typescript
const SOCIAL_RATE_LIMITS: Record<SocialPlatform, RateLimitConfig> = {
  bluesky: { perMinute: 10, perDay: 100 },
  mastodon: { perMinute: 10, perDay: 100 },
  devto: { perMinute: 2, perDay: 20 },
  linkedin: { perMinute: 5, perDay: 50 },
  threads: { perMinute: 5, perDay: 50 },
};
```

These are conservative defaults. The actual platform limits are higher, but posting more than ~100 times a day on any platform starts looking like spam. We're here to share, not flood.

---

## Error Handling & Retries

Same circuit breaker pattern as email. Per-platform circuits.

```
┌────────────────────────────────────────────────────────────────┐
│              SOCIAL CIRCUIT BREAKERS (per platform)             │
│                                                                │
│  Bluesky:   [CLOSED ✓]  ──  normal operation                  │
│  Mastodon:  [CLOSED ✓]  ──  normal operation                  │
│  DEV.to:    [HALF-OPEN ?] ── testing after 3 failures          │
│                                                                │
│  Each platform gets its own circuit.                           │
│  One platform failing doesn't block others.                    │
│                                                                │
│  Retry config:                                                 │
│    Attempts: 2 (social is less critical than email)            │
│    Backoff: 1s, 2s                                             │
│    Retryable: 5xx, rate limit (after delay), network errors    │
│    Not retryable: 4xx auth errors, content policy violations   │
└────────────────────────────────────────────────────────────────┘
```

### Partial Success

Unlike email (one recipient, pass/fail), a broadcast can partially succeed. The response always includes per-platform results, so the caller knows exactly what happened.

```typescript
// Bluesky worked, Mastodon didn't. Caller must check deliveries.
{
  success: false,   // false because not ALL platforms succeeded
  partial: true,    // at least one platform succeeded
  deliveries: [
    { platform: "bluesky", success: true, postUrl: "..." },
    { platform: "mastodon", success: false, error: { code: "PROVIDER_ERROR", ... } }
  ],
  summary: { attempted: 2, succeeded: 1, failed: 1 }
}
// success=true only when ALL requested platforms succeed.
// partial=true when at least one succeeded but not all.
// This forces callers to handle partial failures explicitly.
```

---

## Blog Syndication Hook

When a post is published on Grove, the engine can automatically trigger syndication. This is optional per-tenant.

```
┌───────────────┐     publish      ┌───────────────┐
│  Arbor        │ ────────────────▶│  Engine        │
│  (write post) │                  │  (save to D1)  │
└───────────────┘                  └───────┬───────┘
                                           │
                              afterPublish hook
                                           │
                                   ┌───────▼───────┐
                                   │  Zephyr        │
                                   │  .broadcast()  │
                                   └───────┬───────┘
                                           │
                              ┌────────────┼────────────┐
                              │            │            │
                        🦋 Bluesky   🌿 Fedi    📖 DEV.to
                        (teaser)    (teaser)  (full article)
```

The hook formats content per platform:

- **Short-form platforms** get the post title + excerpt + link
- **DEV.to** gets the full markdown body with a canonical URL back to Grove

---

## Security Considerations

1. **Secret isolation** — Platform credentials stored as Wrangler secrets, never in code
2. **Same auth** — Uses existing `X-API-Key` authentication, no new auth surface
3. **No content logging** — Post body not stored in delivery logs (only metadata)
4. **Token rotation** — Mastodon and LinkedIn tokens can be rotated without downtime (update secret, next request uses new token)
5. **Scope limiting** — Bluesky app passwords can be scoped. Mastodon tokens should use `write:statuses` scope only.
6. **Idempotency** — Prevents duplicate posts from retry logic or double-clicks

### Secrets Required

| Secret                  | Platform | How to Get                                      |
| ----------------------- | -------- | ----------------------------------------------- |
| `BLUESKY_HANDLE`        | Bluesky  | Your handle (e.g., `autumn.bsky.social`)        |
| `BLUESKY_APP_PASSWORD`  | Bluesky  | Settings > App Passwords > Create               |
| `MASTODON_INSTANCE_URL` | Mastodon | Your instance (e.g., `https://mastodon.social`) |
| `MASTODON_ACCESS_TOKEN` | Mastodon | Settings > Development > New Application        |
| `DEVTO_API_KEY`         | DEV.to   | Settings > Extensions > Generate API Key        |

---

## Implementation

### File Structure (Additions to Zephyr Worker)

```
workers/zephyr/src/
├── index.ts                          # Add /broadcast routes
├── types.ts                          # Add social types
│
├── handlers/
│   ├── send.ts                       # (existing) email
│   ├── broadcast.ts                  # (new) social broadcast handler
│   └── health.ts                     # Extend with platform health
│
├── middleware/
│   ├── auth.ts                       # (shared) same API key
│   ├── validation.ts                 # Extend with broadcast validation
│   └── rate-limit.ts                 # Extend with social rate limits
│
├── providers/
│   ├── resend.ts                     # (existing) email
│   ├── bluesky.ts                    # (new) Bluesky AT Protocol
│   ├── mastodon.ts                   # (new) Mastodon/Fediverse
│   └── devto.ts                      # (new) DEV.to articles
│
├── adapters/
│   └── content.ts                    # (new) per-platform content adaptation
│
└── logging/
    └── d1.ts                         # Extend with broadcast logging
```

### Engine Client Extension

```typescript
// packages/engine/src/lib/zephyr/index.ts
// Add broadcast method to existing ZephyrClient

export class ZephyrClient {
  // ... existing email methods ...

  /** Broadcast content to social platforms */
  async broadcast(request: BroadcastRequest): Promise<BroadcastResponse> {
    const response = await fetch(`${this.baseUrl}/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      body: JSON.stringify(request),
    });
    return response.json();
  }

  /** Queue a broadcast for scheduled delivery */
  async queueBroadcast(request: BroadcastRequest): Promise<QueuedResponse> {
    const response = await fetch(`${this.baseUrl}/broadcast/queue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      body: JSON.stringify(request),
    });
    return response.json();
  }
}
```

### Wrangler Configuration (Full Addition)

```toml
# Add to existing wrangler.toml

[triggers]
crons = ["*/15 * * * *"]

# Secrets to configure:
# wrangler secret put BLUESKY_HANDLE
# wrangler secret put BLUESKY_APP_PASSWORD
# wrangler secret put MASTODON_INSTANCE_URL
# wrangler secret put MASTODON_ACCESS_TOKEN
# wrangler secret put DEVTO_API_KEY
```

---

## Cost Analysis

| Component                           | Cost         |
| ----------------------------------- | ------------ |
| Cloudflare Worker (cron, requests)  | Free tier    |
| D1 storage (broadcast queue + logs) | Free tier    |
| Bluesky AT Protocol API             | Free         |
| Mastodon API                        | Free         |
| DEV.to API                          | Free         |
| **Total**                           | **$0/month** |

The entire social broadcasting pipeline runs at zero marginal cost. Platform APIs are free. Cloudflare's free tier covers the worker, cron, and D1 storage for this volume.

---

## Implementation Checklist

### Phase 1: Foundation

- [ ] Add social types to `types.ts` (SocialPlatform, BroadcastRequest, etc.)
- [ ] Create `handlers/broadcast.ts` with validation
- [ ] Create `providers/bluesky.ts` adapter
- [ ] Create `providers/mastodon.ts` adapter
- [ ] Create `adapters/content.ts` for per-platform formatting
- [ ] Add D1 migration for `zephyr_broadcasts` and `zephyr_social_deliveries`
- [ ] Wire up `/broadcast` endpoint in `index.ts`
- [ ] Add social rate limits to existing rate limiter
- [ ] Configure secrets and test end-to-end

### Phase 2: Queue & Scheduling

- [ ] Add cron trigger to `wrangler.toml`
- [ ] Implement `scheduled()` handler for queue processing
- [ ] Wire up `/broadcast/queue` endpoint
- [ ] Add `/broadcast/status/:id` endpoint
- [ ] Add `/broadcast/platforms` health endpoint

### Phase 3: Blog Syndication

- [ ] Create `providers/devto.ts` adapter
- [ ] Add `longForm` support to broadcast handler
- [ ] Create `afterPublish` hook in Engine for auto-syndication
- [ ] Add syndication toggle to Arbor admin settings
- [ ] Test canonical URL handling (SEO)

### Phase 4: Observability & Polish

- [ ] Add broadcast metrics to Vista dashboard
- [ ] Add broadcast history view in Arbor
- [ ] Extend engine client with `broadcast()` and `queueBroadcast()`
- [ ] Write tests for each provider adapter
- [ ] Add per-platform circuit breakers

### Phase 5: Additional Platforms

- [ ] Apply for LinkedIn Marketing Developer Program
- [ ] Apply for Threads/Meta API access
- [ ] Create `providers/linkedin.ts` adapter
- [ ] Create `providers/threads.ts` adapter

---

## References

- [Zephyr — Email Gateway](zephyr-spec.md) — Parent spec, existing patterns
- [Bluesky AT Protocol Docs](https://docs.bsky.app/docs/get-started) — Bluesky API
- [Mastodon API Docs](https://docs.joinmastodon.org/methods/statuses/) — Mastodon statuses
- [DEV.to API Docs](https://developers.forem.com/api/v1) — Articles API
- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) — Scheduled handlers
- [Mycelium Spec](mycelium-spec.md) — Secret management for platform credentials
- [Vista Spec](vista-spec.md) — Metrics integration

---

_The wind doesn't just carry letters. It scatters seeds._

**Last updated:** February 2026
**Status:** Planned
**Author:** Autumn Brown
