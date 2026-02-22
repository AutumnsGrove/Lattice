---
aliases: []
date created: Sunday, February 22nd 2026
date modified: Sunday, February 22nd 2026
tags:
  - security
  - rate-limiting
  - rss
  - shade
type: tech-spec
lastUpdated: "2026-02-22"
---

```
               ┌──────────────────────────────┐
               │  RSS Feed                     │
               │  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐  │
               │  │📄│ │📄│ │📄│ │📄│ │📄│  │
               │  └──┘ └──┘ └──┘ └──┘ └──┘  │
               └──────────────┬───────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
              ╭─────┴─────╮      ╭─────┴─────╮
              │  Reader   │      │  Vacuum   │
              │  ·  ·  ·  │      │  ░░░░░░░  │
              │  one feed │      │  ALL feeds│
              │  at a time│      │  at once  │
              ╰─────┬─────╯      ╰─────┬─────╯
                    │                   │
                    ✓                   ✗

            Feed the readers. Starve the vacuums.
```

> _Feed the readers. Starve the vacuums._

# RSS Rate Limiting: Feed Protection for Shade

> _Feed the readers. Starve the vacuums._

RSS feeds are open by design. That openness is the point. But there's a difference between a reader subscribing to a blog and a bot vacuuming every feed on the platform. This spec extends Shade's protection layer to distinguish human feed readers from automated harvesters, using Threshold's existing rate limiting infrastructure.

**Public Name:** RSS Rate Limiting
**Internal Name:** GroveRSSThreshold
**Extends:** Shade (AI protection), Threshold (rate limiting)
**Location:** Integrated into `libs/engine/src/lib/threshold/`
**Last Updated:** February 2026

A bird feeder welcomes one bird at a time. When a flock descends all at once, the feeder empties in seconds and the quiet visitors get nothing. RSS rate limiting is the baffle on the feeder: it slows the flock without bothering the songbird.

---

## Overview

### What This Is

An extension to Threshold (Grove's rate limiting system) that adds RSS-specific rate limiting rules. It detects the difference between legitimate feed readers (Feedly, NetNewsWire, Miniflux) and bulk scrapers, then applies graduated responses.

### Goals

- Protect RSS feeds from bulk harvesting while keeping them open for readers
- Distinguish human subscription patterns from bot vacuuming
- Integrate with Shade's existing crawler detection
- Track feed access patterns through Vista
- Preserve the open web principle: RSS should work without authentication

### Non-Goals (Out of Scope)

- Requiring authentication for RSS feeds (defeats the purpose)
- Blocking all bots (many are legitimate feed readers)
- Building a separate rate limiting system (uses Threshold)
- Feed content filtering or paywalling

---

## Architecture

RSS rate limiting adds a new layer to the existing Threshold stack, sitting between Cloudflare edge protection and tenant-level limits.

```
┌─────────────────────────────────────────────────────────────────────┐
│  INCOMING RSS REQUEST (/rss, /feed, /atom, /rss.xml)                │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 1: Cloudflare Edge                                            │
│  ─────────────────────────────────────────────────────────────────── │
│  Standard CF rate limiting (1000 req/min per IP)                     │
│  Block AI Bots toggle catches known crawlers                         │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 2: Shade RSS Filter (NEW)                                     │
│  ─────────────────────────────────────────────────────────────────── │
│  User-Agent classification:                                          │
│    ✓ Known readers: Feedly, NetNewsWire, Miniflux, Inoreader        │
│    ✓ Unknown but polite: low frequency, single feeds                 │
│    ⚠ Suspicious: no UA, high frequency, bulk patterns                │
│    ✗ Known scrapers: GPTBot, CCBot, Bytespider (already in Shade)   │
│                                                                      │
│  Action:                                                             │
│    Known reader  → generous limits (600/hr per IP)                   │
│    Unknown       → standard limits (60/hr per IP)                    │
│    Suspicious    → strict limits (10/hr per IP)                      │
│    Known scraper → 403 Forbidden                                     │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 3: Tenant RSS Limits                                          │
│  ─────────────────────────────────────────────────────────────────── │
│  Per-tenant total RSS requests (protects individual sites)           │
│                                                                      │
│  Seedling:  1,000 feed requests/hr                                   │
│  Sapling:   5,000 feed requests/hr                                   │
│  Oak:      20,000 feed requests/hr                                   │
│  Evergreen: 100,000 feed requests/hr                                 │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 4: Feed Response                                              │
│  ─────────────────────────────────────────────────────────────────── │
│  ✓ Passed  → Serve RSS with Cache-Control + ETag                    │
│  ⚠ Warning → Serve RSS with X-RateLimit-Warning header              │
│  ✗ Limited → 429 with Retry-After + human-readable message          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## User-Agent Classification

### Known Feed Readers

These are legitimate RSS readers. They get generous limits.

```typescript
const KNOWN_FEED_READERS: FeedReaderPattern[] = [
  // Major services
  { pattern: /Feedly/i, name: "Feedly", tier: "service" },
  { pattern: /Inoreader/i, name: "Inoreader", tier: "service" },
  { pattern: /NewsBlur/i, name: "NewsBlur", tier: "service" },
  { pattern: /Feedbin/i, name: "Feedbin", tier: "service" },
  { pattern: /Miniflux/i, name: "Miniflux", tier: "self-hosted" },
  { pattern: /FreshRSS/i, name: "FreshRSS", tier: "self-hosted" },
  { pattern: /Tiny Tiny RSS/i, name: "TTRSS", tier: "self-hosted" },

  // Desktop/mobile apps
  { pattern: /NetNewsWire/i, name: "NetNewsWire", tier: "app" },
  { pattern: /Reeder/i, name: "Reeder", tier: "app" },
  { pattern: /ReadKit/i, name: "ReadKit", tier: "app" },
  { pattern: /Thunderbird/i, name: "Thunderbird", tier: "app" },
  { pattern: /Liferea/i, name: "Liferea", tier: "app" },

  // Aggregation services (helpful, not harmful)
  { pattern: /Flipboard/i, name: "Flipboard", tier: "service" },
];

interface FeedReaderPattern {
  pattern: RegExp;
  name: string;
  tier: "service" | "self-hosted" | "app";
}
```

### Known Scrapers (Already in Shade)

These are blocked from all content, including RSS. No additional configuration needed.

```
GPTBot, ClaudeBot, CCBot, Bytespider, PerplexityBot,
Meta-ExternalAgent, Amazonbot, cohere-ai, YouBot, Diffbot,
Google-Extended, Applebot-Extended
```

### Classification Logic

```typescript
type FeedClientClass = "known-reader" | "unknown" | "suspicious" | "blocked";

function classifyFeedClient(request: Request): FeedClientClass {
  const ua = request.headers.get("user-agent") ?? "";

  // Check Shade blocklist first
  if (isBlockedCrawler(ua)) return "blocked";

  // Check known feed readers
  if (KNOWN_FEED_READERS.some(r => r.pattern.test(ua))) return "known-reader";

  // Suspicious signals
  if (ua === "" || ua.length < 5) return "suspicious";
  if (/bot|crawl|spider|scrape/i.test(ua)) return "suspicious";

  return "unknown";
}
```

---

## Rate Limits

### Per-IP Limits (by classification)

| Classification | Limit | Window | Rationale |
|---------------|-------|--------|-----------|
| Known reader | 600/hr | 1 hour | Services poll many feeds for many users |
| Unknown | 60/hr | 1 hour | Generous enough for a human adding feeds |
| Suspicious | 10/hr | 1 hour | Enough to read a few feeds, not vacuum |
| Blocked | 0 | — | 403 Forbidden |

### Behavioral Detection

Rate limits alone don't catch everything. A vacuum that stays under the limit but hits 500 different feeds is still a vacuum. Behavioral detection adds a second signal.

```typescript
interface FeedAccessPattern {
  ip: string;
  uniqueFeeds: number;      // How many different feeds this IP accessed
  totalRequests: number;     // Total feed requests
  windowMinutes: number;     // Observation window
}

function detectVacuumPattern(pattern: FeedAccessPattern): boolean {
  // A human reader adds feeds one at a time over days/weeks.
  // A vacuum hits dozens of feeds in minutes.

  // More than 20 unique feeds in 10 minutes = vacuum
  if (pattern.uniqueFeeds > 20 && pattern.windowMinutes <= 10) return true;

  // More than 50 unique feeds in an hour = vacuum
  if (pattern.uniqueFeeds > 50 && pattern.windowMinutes <= 60) return true;

  return false;
}
```

When vacuum behavior is detected, the IP gets downgraded to "suspicious" limits regardless of user-agent.

### Threshold Integration

RSS limits integrate into the existing Threshold configuration:

```typescript
// Addition to threshold/config.ts
const RSS_LIMITS: Record<FeedClientClass, ThresholdLimit> = {
  "known-reader": { limit: 600, windowSeconds: 3600 },
  "unknown":      { limit: 60,  windowSeconds: 3600 },
  "suspicious":   { limit: 10,  windowSeconds: 3600 },
  "blocked":      { limit: 0,   windowSeconds: 3600 },
};

// Endpoint-specific limit for the feed routes
"feed/rss":  { limit: 60,  windowSeconds: 3600 },  // Default (overridden by classification)
"feed/atom": { limit: 60,  windowSeconds: 3600 },
```

---

## Caching Strategy

Good caching reduces the need for rate limiting by serving repeated requests from cache instead of hitting the origin.

### Headers

```typescript
function feedCacheHeaders(tenantTier: string): Record<string, string> {
  return {
    // Cache for 5 minutes on Cloudflare edge
    "Cache-Control": "public, max-age=300, stale-while-revalidate=60",

    // ETag for conditional requests
    "ETag": `"${feedContentHash}"`,

    // Last-Modified for conditional requests
    "Last-Modified": lastPostDate.toUTCString(),

    // Vary on Accept to separate RSS/Atom/JSON responses
    "Vary": "Accept",
  };
}
```

### Conditional Requests

Well-behaved feed readers send `If-None-Match` (ETag) or `If-Modified-Since` headers. When the feed hasn't changed, return `304 Not Modified` with no body. This saves bandwidth and doesn't count against rate limits.

```typescript
function handleConditionalRequest(request: Request, feedEtag: string, lastModified: Date): Response | null {
  const ifNoneMatch = request.headers.get("If-None-Match");
  if (ifNoneMatch === feedEtag) {
    return new Response(null, { status: 304 });
  }

  const ifModifiedSince = request.headers.get("If-Modified-Since");
  if (ifModifiedSince) {
    const since = new Date(ifModifiedSince);
    if (lastModified <= since) {
      return new Response(null, { status: 304 });
    }
  }

  return null; // No conditional match, serve full response
}
```

### Rate Limit Exemption for 304s

Conditional requests that result in a `304 Not Modified` should not count against rate limits. The client is being polite by checking before downloading. Reward that behavior.

```typescript
// In the feed handler
const conditional = handleConditionalRequest(request, etag, lastModified);
if (conditional) {
  // Don't count 304s against rate limits
  return conditional;
}

// Only count full feed serves against rate limits
await threshold.consume("feed/rss", ip, clientClass);
```

---

## Response Headers

All feed responses include rate limit information.

### Normal Response

```
HTTP/1.1 200 OK
Content-Type: application/rss+xml; charset=utf-8
Cache-Control: public, max-age=300, stale-while-revalidate=60
ETag: "abc123"
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 57
X-RateLimit-Reset: 1740268800
X-Feed-Client: unknown
```

### Rate Limited Response

```
HTTP/1.1 429 Too Many Requests
Content-Type: application/xml; charset=utf-8
Retry-After: 1800
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1740268800

<?xml version="1.0" encoding="UTF-8"?>
<error>
  <message>You're requesting feeds faster than we allow. Please wait a bit and try again.</message>
  <retryAfter>1800</retryAfter>
</error>
```

The 429 response is XML because feed readers expect XML responses. JSON would confuse parsers.

---

## Vista Integration

Feed access patterns flow into Vista for monitoring and analysis.

### Metrics

| Metric | Description | Alert |
|--------|-------------|-------|
| `rss.requests.total` | Total feed requests per hour | Informational |
| `rss.requests.known_reader` | Requests from known readers | Informational |
| `rss.requests.unknown` | Requests from unknown clients | > 10x known |
| `rss.requests.suspicious` | Requests from suspicious clients | > 100/hr |
| `rss.requests.blocked` | Blocked scraper attempts | Informational |
| `rss.rate_limited` | 429 responses served | > 50/hr |
| `rss.vacuum_detected` | Vacuum pattern detections | > 0 |
| `rss.conditional_304` | Conditional requests served from cache | Informational |
| `rss.unique_feeds_per_ip` | Feed breadth per IP (vacuum signal) | > 50/hr |

### Per-Tenant Feed Analytics

Vista can show Wanderers how their feeds are being consumed:

```
┌─ Feed Analytics ──────────────────────────────────────┐
│                                                        │
│  Subscribers (estimated):  47                          │
│  Requests this week:       312                         │
│                                                        │
│  Top readers:                                          │
│    Feedly          23 subscribers                      │
│    NetNewsWire      8 subscribers                      │
│    Miniflux         6 subscribers                      │
│    Other/Unknown   10 subscribers                      │
│                                                        │
│  Blocked attempts:  3 (GPTBot, CCBot)                  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

Subscriber estimates come from aggregation service headers. Feedly sends `Feedly/1.0 (+http://www.feedly.com/; 23 subscribers)` with the subscriber count.

---

## Signpost Error Catalog

RSS rate limiting extends Shade's existing error prefix.

| Code | Key | Category | When It Fires |
|------|-----|----------|---------------|
| `GROVE-API-063` | RSS_RATE_LIMITED | user | Feed requests exceeded limit |
| `GROVE-API-064` | RSS_VACUUM_DETECTED | user | Bulk feed access pattern detected |
| `GROVE-API-065` | RSS_SCRAPER_BLOCKED | user | Known AI scraper attempted feed access |

These extend the existing `GROVE-API` rate limiting range (060-079) rather than creating a new prefix.

```typescript
// Addition to api-errors.ts
RSS_RATE_LIMITED: {
  code: "GROVE-API-063",
  category: "user" as const,
  userMessage: "You're requesting feeds faster than we allow. Please wait a bit and try again.",
  adminMessage: "RSS rate limit exceeded for this IP. Classification: {classification}.",
},
RSS_VACUUM_DETECTED: {
  code: "GROVE-API-064",
  category: "user" as const,
  userMessage: "We've detected unusual feed access patterns from your IP. Please slow down.",
  adminMessage: "Vacuum pattern detected: {uniqueFeeds} unique feeds in {windowMinutes} minutes.",
},
RSS_SCRAPER_BLOCKED: {
  code: "GROVE-API-065",
  category: "user" as const,
  userMessage: "This feed is not available for automated scraping.",
  adminMessage: "Known AI scraper blocked from RSS endpoint. UA: {userAgent}.",
},
```

---

## Security Considerations

- **No authentication on feeds.** RSS is open by design. Adding auth would break every feed reader. Rate limiting is the protection layer, not access control.
- **IP-based limits have known weaknesses.** Shared IPs (corporate networks, VPNs) can cause false positives. The classification system mitigates this by giving known readers generous limits.
- **User-agent spoofing.** A scraper could claim to be Feedly. Behavioral detection (vacuum patterns) catches this. A spoofed UA that behaves like a reader is, for our purposes, a reader.
- **Cloudflare dependency.** Rate limit counters live in KV. If KV is unavailable, feeds serve without limits rather than blocking. Fail open, not closed.
- **Privacy.** IP addresses used for rate limiting are stored in KV with short TTLs (1 hour). They're not logged permanently or associated with user accounts.

---

## Implementation Checklist

### Phase 1: Classification (Week 1)

- [ ] Build `classifyFeedClient()` function with known reader list
- [ ] Integrate with Shade's existing scraper blocklist
- [ ] Add classification to feed request handler
- [ ] Unit test classification against real user-agent strings

### Phase 2: Rate Limits (Week 1-2)

- [ ] Add RSS-specific limits to Threshold config
- [ ] Implement per-classification rate limiting
- [ ] Add `X-RateLimit-*` headers to feed responses
- [ ] Return XML 429 responses for rate-limited requests
- [ ] Unit test rate limit enforcement

### Phase 3: Caching (Week 2)

- [ ] Add ETag generation to feed responses
- [ ] Implement conditional request handling (304 Not Modified)
- [ ] Exempt 304 responses from rate limit counting
- [ ] Set appropriate Cache-Control headers

### Phase 4: Behavioral Detection (Week 3)

- [ ] Track unique feeds per IP in KV (short-lived counters)
- [ ] Implement vacuum pattern detection
- [ ] Downgrade IPs exhibiting vacuum behavior
- [ ] Add `GROVE-API-064` error for vacuum detection

### Phase 5: Vista Analytics (Week 3-4)

- [ ] Add RSS metrics to Vista collection
- [ ] Build subscriber estimation from aggregator UA strings
- [ ] Surface feed analytics in Arbor dashboard
- [ ] Alert on unusual patterns

### Phase 6: Monitoring and Tuning (Ongoing)

- [ ] Monitor false positive rates (legitimate readers hitting limits)
- [ ] Tune thresholds based on real traffic patterns
- [ ] Update known reader list as new feed apps emerge
- [ ] Review and update Shade scraper blocklist

---

*Feed the readers. Starve the vacuums.*
