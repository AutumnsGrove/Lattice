# Content Import & Federation Research

> **Status:** Research complete | **Date:** 2026-03-13
> **Goal:** Understand how Wanderers can bring their existing content into Grove, and how Grove can become a node in the decentralized web.

---

## The Problem

Grove is beautiful but barren. With ~11 posts across the entire platform, new Wanderers face a cold start. Nobody wants to start from scratch — they've already been writing somewhere. We need a way to say: *"Bring your words with you. This is your home now."*

But we're not going to scrape the web. That's not Grove. We plug into official export pipelines, respect platform APIs, and build a warm, guided import experience.

---

## Table of Contents

1. [Grove's Content Model (What We're Importing Into)](#1-groves-content-model)
2. [Platform Export Landscape](#2-platform-export-landscape)
3. [Import Architecture](#3-import-architecture)
4. [ActivityPub & the Fediverse](#4-activitypub--the-fediverse)
5. [IndieWeb Standards](#5-indieweb-standards)
6. [Recommended Phased Approach](#6-recommended-phased-approach)
7. [Open Questions](#7-open-questions)

---

## 1. Grove's Content Model

Understanding what we're importing *into* is just as important as what we're importing *from*.

### Post (Bloom) Schema

| Field | Type | Notes |
|-------|------|-------|
| `title` | text | Max 200 chars, required for published posts |
| `slug` | text | Auto-generated, alphanumeric + hyphens, max 100 chars |
| `description` | text | Excerpt for SEO/previews, max 500 chars |
| `markdownContent` | text | Primary content format, max 1MB |
| `htmlContent` | text | Auto-rendered from Markdown |
| `gutterContent` | JSON | Sidebar annotations (unique Grove feature — margin notes, embedded media) |
| `tags` | JSON array | String tags |
| `status` | enum | `draft`, `published`, `archived` |
| `featuredImage` | text | URL to hero image (R2 or CDN) |
| `wordCount` | integer | Auto-calculated |
| `readingTime` | integer | Auto-calculated (minutes) |
| `blaze` | text | Content categorization slug |
| `publishedAt` | integer | Unix timestamp |
| `createdAt` | integer | Unix timestamp |
| `font` | text | Per-post font override |
| `meadowExclude` | boolean | Hide from community feed |

### Key Characteristics

- **Markdown-first**: All content stored as Markdown, rendered to HTML on save
- **Media on R2**: Images stored in Cloudflare R2 with metadata in D1
- **Tenant isolation**: Posts belong to tenants (subdomains), not individual users
- **Image limits**: Max 10MB per upload, supports JPEG/PNG/GIF/WebP/AVIF/JXL
- **No SVG**: Blocked for XSS prevention
- **Gutter content**: Grove's unique margin-note system — won't have direct equivalents in imported content

### What an Import Needs to Produce

At minimum, for each imported post:
1. `title` — extracted or generated
2. `markdownContent` — converted from source format
3. `tags` — mapped from source categories/labels
4. `publishedAt` — preserved from original publish date
5. `status` — likely `draft` (let Wanderers review before publishing)
6. Media files uploaded to R2, URLs rewritten in Markdown

---

## 2. Platform Export Landscape

### Summary Table

| Platform | Export Format | API Access | RSS/Atom | Best Path |
|----------|-------------|------------|----------|-----------|
| **Twitter/X** | ZIP (JS/JSON + media) | v2 API (expensive) | No | Archive upload |
| **Bluesky** | CAR (binary CBOR) | Public API (free) | No | API or archive |
| **Neocities** | ZIP (raw HTML) | Basic REST | Per-site | HTML parsing |
| **Medium** | ZIP (HTML files) | No read API | RSS | Archive upload |
| **Bear Blog** | CSV (Markdown) | No API | RSS | CSV upload |
| **Tumblr** | ZIP (HTML + media) | v2 API (OAuth) | RSS | Archive upload |
| **WordPress** | WXR (XML) | REST API (free) | RSS + Atom | WXR import |
| **Substack** | ZIP (HTML + CSV) | No API | RSS | Archive upload |
| **Mastodon** | ActivityStreams JSON | REST API | RSS + Atom | ActivityPub |
| **Ghost** | JSON | Content API | RSS | JSON import |
| **Blogger** | Atom XML | v3 API | Atom + RSS | XML import |

### Platform Details

#### Twitter/X
- **Export**: Settings > Download Archive. ZIP with `.js` files (JSON with a JS wrapper — strip `window.YTD.tweets.part0 =` prefix to get valid JSON). Includes all tweets + media files.
- **Content structure**: `tweet_id`, `timestamp` (UTC), `text`, `expanded_urls`, media references. Retweets and replies included.
- **Best tools**: [twitter-archive-parser](https://github.com/timhutton/twitter-archive-parser) (Python, converts to MD/HTML), [twitter-archive-reader](https://www.npmjs.com/package/twitter-archive-reader) (TypeScript, parses into typed structures)
- **Import strategy**: Archive upload. Parse JS files, extract original tweets (skip RTs), convert to Markdown, download embedded media, upload to R2. Tweets are short — could combine into threads or import individually.

#### Bluesky (AT Protocol)
- **Export**: Settings > Export My Data, or API `GET com.atproto.sync.getRepo`. Returns `.car` file (Content Addressable aRchive — binary CBOR in a Merkle Search Tree).
- **Content structure**: Posts contain `text`, `createdAt`, `embed` (images, links, quotes), `facets` (mentions, links, hashtags as byte-range annotations).
- **Best tools**: [@ipld/car](https://www.npmjs.com/package/@ipld/car) + [cbor-x](https://www.npmjs.com/package/cbor-x) for parsing, [@atproto/api](https://www.npmjs.com/package/@atproto/api) for API access
- **Import strategy**: API preferred (public, free, well-documented). Fetch author feed, extract posts with media, convert facets to Markdown links/mentions. Blobs (images) fetched via `com.atproto.sync.getBlob`.

#### Medium
- **Export**: Settings > Security > Download your information. ZIP with HTML files. **Caveat**: Every comment you ever wrote is in the Posts folder as a separate HTML file — must filter to actual articles.
- **Content structure**: Semantic HTML with Medium-specific classes. Metadata in HTML meta tags (title, subtitle, publish date, canonical URL, tags).
- **Best tools**: [Meddler](https://dev.to/brennan/introducing-meddler-a-medium-export-converter-4nka) (TypeScript monorepo, converts to clean Markdown with frontmatter). Images referenced via Medium CDN — must download and re-host.
- **Import strategy**: Archive upload. Use Meddler-style parsing to extract articles (not comments), convert HTML to Markdown via Turndown, download images, upload to R2.

#### Bear Blog
- **Export**: Dashboard > Settings > Export. CSV file with Markdown content.
- **Content structure**: CSV with post content (Markdown), published dates (ISO format), tags.
- **Import strategy**: Simplest of all platforms. Parse CSV, extract Markdown content directly (no conversion needed), map dates and tags.

#### WordPress (WXR)
- **Export**: Dashboard > Tools > Export. WXR (WordPress eXtended RSS) — XML based on RSS 2.0 with WP namespaces.
- **Content structure**: `<content:encoded>` (full post HTML), `<wp:post_date>`, `<wp:post_type>`, `<wp:status>`, categories, tags, custom fields. Media referenced by URL but not included in export.
- **Best tools**: [blog2md](https://github.com/palaniraja/blog2md) (converts WXR to Markdown files). WordPress is the de facto hub — many migration paths route through WXR.
- **Import strategy**: WXR is the most important format to support. Parse XML, extract posts and pages, convert HTML content to Markdown, download referenced images.
- **Note**: The WordPress Data Liberation project is building a next-gen format (WXZ — ZIP with JSON + media). Worth monitoring.

#### Tumblr
- **Export**: Settings > select blog > Export. ZIP with HTML per post + media folder (original uploads).
- **API**: v2 with OAuth 1.0a. Post types: text, photo, quote, link, chat, audio, video. Neue Post Format (NPF) for modern content.
- **Best tools**: [tumblr2markdown](https://github.com/jaanus/tumblr2markdown), official [tumblr.js](https://github.com/tumblr/tumblr.js) client
- **Import strategy**: Archive upload preferred (includes media). Map post types to Markdown: text posts are straightforward, photo posts become image embeds, quotes become blockquotes. Max 4 exports/month, retained 3 days.

#### Substack
- **Export**: Settings > Import/Export > New export. ZIP with HTML post files + CSV subscriber list.
- **No official read API**. Undocumented internal endpoints exist but are unreliable.
- **Import strategy**: Archive upload. Parse HTML files, convert to Markdown. Ignore subscriber data (privacy). Images referenced via Substack CDN — download and re-host.

#### Ghost
- **Export**: Settings > Advanced > Export. Single JSON file mirroring database.
- **Content structure**: Posts with `title`, `slug`, `html`, `mobiledoc`/`lexical`, `status`, `published_at`, `custom_excerpt`, `featured`, tags, authors. Well-structured — closest to Grove's own model.
- **Content API**: Key-based auth, no OAuth needed. `GET /ghost/api/content/posts` with pagination.
- **Import strategy**: JSON import. Ghost's format is the cleanest to work with. Direct field mapping to Grove's schema. Can also use Content API for live import.

#### Mastodon
- **Export**: Settings > Data Export. ActivityStreams 2.0 JSON for posts + media. CSV for follows/blocks/bookmarks. Post archive can only be requested every 7 days.
- **API**: REST API with OAuth 2.0. 300 req/5 min. `GET /api/v1/accounts/{id}/statuses`.
- **Import strategy**: API preferred for better structure. Posts are `Note` objects with HTML content. Convert to Markdown, download attached media. **Key insight**: Mastodon export cannot be re-imported into Mastodon — Grove accepting it would be a differentiator.

#### Blogger/Blogspot
- **Export**: Settings > Manage Blog > Back up content. Atom XML with Google extensions.
- **Best tools**: [blogger-archive-converter](https://github.com/cheshrkat/blogger-archive-converter) (to HTML/MD/JSON), [blog2md](https://github.com/palaniraja/blog2md)
- **Import strategy**: Parse Atom XML, extract entries, convert HTML content to Markdown. Images hosted on Blogger CDN — download and re-host.

#### Neocities
- **Export**: Dashboard > Download entire site. ZIP of raw HTML/CSS/JS/images.
- **Import strategy**: Hardest platform. No standard content structure — every site is hand-built HTML. Would need intelligent HTML parsing to identify "posts" vs. navigation vs. layout. Could start with a guided approach: "Select the pages you want to import."
- **Alternative**: If the Neocities site has an RSS feed (some do), use that instead.

### HTML-to-Markdown Conversion

The core library for most imports: **[Turndown](https://github.com/mixmark-io/turndown)**

- JavaScript, works in browser + Node.js
- Extensible with plugins (GFM tables, task lists, strikethrough via [turndown-plugin-gfm](https://github.com/mixmark-io/turndown-plugin-gfm))
- Configurable heading style, bullet markers, etc.
- Well-tested, largest ecosystem
- For batch processing where performance matters: [node-html-markdown](https://www.npmjs.com/package/node-html-markdown) (no jsdom dependency)

### Common Interchange Formats

| Format | Description | Relevance to Grove |
|--------|-------------|-------------------|
| **WXR** | WordPress Extended RSS (XML). De facto blog migration standard. | High — support this first |
| **Blog Archive Format (.bar)** | ZIP with h-feed HTML + JSON Feed + media. By Micro.blog. | Medium — clean, modern format |
| **Ghost JSON** | Ghost's native export. Well-structured. | High — easy to parse |
| **ActivityStreams 2.0** | W3C standard, JSON-LD. Used by Mastodon/Fediverse. | High — ties into federation |
| **JSON Feed** | Modern RSS alternative ([jsonfeed.org](https://jsonfeed.org/)). | Medium — easy to consume |
| **Micropub** | W3C protocol for creating/editing posts via HTTP. | Future — for live import |

---

## 3. Import Architecture

### Design Principles

1. **Archives, not scraping** — We plug into official export pipelines. Wanderers download their data from the source, then upload to Grove.
2. **API where available** — For platforms with good public APIs (Bluesky, Ghost, Mastodon), offer "connect your account" as an alternative to file upload.
3. **Draft by default** — Imported content lands as drafts. Wanderers review, curate, then publish what they want.
4. **Preserve dates** — Original publish dates are kept. The Wanderer's history is their history.
5. **Media re-hosting** — All images are downloaded and stored in R2. No hotlinking to source platforms (they could disappear).
6. **Sanitize thoroughly** — HTML sanitization, content length limits, image format validation. Every import goes through the same safety pipeline.
7. **Progress visibility** — Large imports take time. Show progress, let Wanderers walk away and come back.

### Proposed Pipeline

```
                    ┌──────────────────────────────────┐
                    │         Import Sources            │
                    ├──────────────────────────────────┤
                    │  Archive Upload (ZIP/XML/JSON)   │
                    │  Account Connect (OAuth/API key) │
                    │  RSS/Atom Feed URL               │
                    │  Paste a URL (single post)       │
                    └──────────┬───────────────────────┘
                               │
                    ┌──────────▼───────────────────────┐
                    │      Source Parser Layer          │
                    ├──────────────────────────────────┤
                    │  twitter-parser                   │
                    │  bluesky-parser                   │
                    │  medium-parser                    │
                    │  wordpress-parser (WXR)           │
                    │  ghost-parser                     │
                    │  tumblr-parser                    │
                    │  substack-parser                  │
                    │  mastodon-parser                  │
                    │  blogger-parser                   │
                    │  bear-blog-parser                 │
                    │  rss-parser (generic)             │
                    │  html-parser (Neocities/generic)  │
                    └──────────┬───────────────────────┘
                               │
                    ┌──────────▼───────────────────────┐
                    │   Normalized Intermediate Format  │
                    ├──────────────────────────────────┤
                    │  {                                │
                    │    title: string                  │
                    │    content: string (markdown)     │
                    │    publishedAt: Date              │
                    │    tags: string[]                 │
                    │    images: ImageRef[]             │
                    │    sourceUrl: string              │
                    │    sourcePlatform: string         │
                    │    metadata: Record<string, any>  │
                    │  }                                │
                    └──────────┬───────────────────────┘
                               │
                    ┌──────────▼───────────────────────┐
                    │     Content Transformer           │
                    ├──────────────────────────────────┤
                    │  HTML → Markdown (Turndown)       │
                    │  Image download → R2 upload       │
                    │  URL rewriting                    │
                    │  Content sanitization             │
                    │  Length validation                 │
                    │  Tag normalization                 │
                    │  Slug generation                  │
                    └──────────┬───────────────────────┘
                               │
                    ┌──────────▼───────────────────────┐
                    │       Grove Bloom Creator         │
                    ├──────────────────────────────────┤
                    │  Create draft Blooms              │
                    │  Attach media                     │
                    │  Set original publish dates       │
                    │  Tag with source platform         │
                    │  Generate import report           │
                    └──────────────────────────────────┘
```

### Implementation on Cloudflare

- **Durable Object** for import jobs — tracks state, handles long-running processes, survives Worker timeouts
- **R2** for staging uploaded archives before processing
- **Queues** for processing individual posts asynchronously (respect Worker CPU limits)
- **D1** for import job metadata and progress tracking
- The existing `ExportJobV2` Durable Object pattern (already in Amber SDK) can be mirrored for imports

### Input Methods

| Method | Best For | Complexity |
|--------|----------|------------|
| **Archive Upload** | Twitter, Medium, Tumblr, Substack, WordPress, Blogger | Medium — file parsing |
| **Account Connect** | Bluesky, Ghost, Mastodon | Medium — OAuth/API |
| **RSS Feed URL** | Any blog with RSS | Low — standardized |
| **Single URL** | One-off post import | Low — fetch + parse |

---

## 4. ActivityPub & the Fediverse

### The Vision

Every Grove blog becomes a Fediverse actor. People on Mastodon, Pixelfed, Lemmy, or any ActivityPub server can follow a Grove blog and see new posts in their timeline. Grove Wanderers can carry their audience with them if they ever leave. **Content portability isn't a feature — it's a promise.**

### How ActivityPub Works

ActivityPub is a W3C Recommendation with two layers:
- **Client-to-Server (C2S)**: Creating/modifying content
- **Server-to-Server (S2S)**: Delivering content between servers (federation)

The core model:
- **Actors** — entities with an Inbox and Outbox (each Grove blog = one Actor)
- **Activities** — actions like Create, Follow, Like, Announce (boost), Delete
- **Objects** — the content itself (Note, Article, Image)

Flow: Wanderer publishes a Bloom → Grove creates a `Create(Note)` activity → delivers via HTTP POST to every follower's Inbox on their respective servers.

### Minimum Endpoints for Federation

| Endpoint | Purpose |
|----------|---------|
| `/.well-known/webfinger` | Translates `@blog@grove.place` to actor URL |
| `/ap/users/{subdomain}` | Actor profile (JSON-LD with public key, inbox/outbox URLs) |
| `/ap/users/{subdomain}/inbox` | Receives incoming activities (follows, replies, likes) |
| `/ap/users/{subdomain}/outbox` | Collection of published activities |
| `/.well-known/nodeinfo` | Instance metadata (software, user counts) |

### HTTP Signatures (Required in Practice)

Every outbound POST must be signed with the actor's RSA-2048 keypair. The signature covers `(request-target)`, `host`, `date`, `digest`, and `content-type` headers. Uses the cavage-12 draft (not yet RFC 9421). ~30 second validity window.

### The Framework: Fedify

**[Fedify](https://fedify.dev/)** is the clear choice for Grove:

- TypeScript-native, MIT licensed, actively maintained (v2.0.3)
- **First-class Cloudflare Workers support** via `@fedify/cfworkers`
- Uses Cloudflare KV for key-value storage, Cloudflare Queues for activity delivery
- Type-safe ActivityPub objects, WebFinger, HTTP Signatures
- **Ghost uses Fedify** for their ActivityPub implementation — strong real-world validation

Workers integration pattern:
```typescript
import { createFederationBuilder } from "@fedify/fedify";
import { WorkersKvStore, WorkersMessageQueue } from "@fedify/cfworkers";

const builder = createFederationBuilder<Env>();
// Register actor dispatchers, inbox listeners, etc.

export default {
  async fetch(request, env): Promise<Response> {
    const federation = await builder.build({
      kv: new WorkersKvStore(env.KV_NAMESPACE),
      queue: new WorkersMessageQueue(env.QUEUE),
    });
    return federation.fetch(request, { contextData: env });
  },
  async queue(batch, env) {
    const federation = await builder.build({ /* same config */ });
    for (const message of batch.messages) {
      await federation.processQueuedTask(message);
    }
  },
};
```

### Content Type Decision: Note vs. Article

A critical gotcha: **Mastodon only fully renders `Note` and `Question` types**. An `Article` gets truncated with a link back. WordPress's ActivityPub plugin sends blog posts as `Note` for this reason.

**Recommendation**: Send as `Note` with HTML in `content` for maximum compatibility. Include original Markdown in `source.content` with `source.mediaType: "text/markdown"` for clients that support it. Yes, this means long blog posts will appear in full on Mastodon timelines — but that's better than being invisible.

### What Federation Enables for Import

- **Follow-based import**: If a Wanderer was on Mastodon, their followers can follow their new Grove blog. The audience transfers.
- **Account migration**: The `Move` activity lets a Mastodon user formally redirect followers to their new Grove actor. Receiving servers automatically update follows.
- **Outbox fetching**: In theory, Grove could read a Fediverse actor's outbox to import their post history. In practice, servers may paginate or limit what they expose.
- **Bidirectional discovery**: People find Grove blogs through the Fediverse, not just through grove.place.

### What Federation Does NOT Solve

- Post history migration — there's no standard mechanism to pull complete history
- Media transfer — remote media URLs may break
- Mastodon's own export cannot be re-imported into Mastodon (Grove accepting it is a differentiator)
- Moderation — ActivityPub has no built-in spam prevention; must build our own

### Platforms Already Doing This

| Platform | Approach | Lessons for Grove |
|----------|----------|-------------------|
| **Ghost** | Sidecar service with Fedify, each site is an actor | Sidecar pattern works. Separate federation from CMS. |
| **WriteFreely** | Built-in, each blog is an actor, minimal social features | Blog-as-actor is the simplest path. Don't over-socialize. |
| **Micro.blog** | Supports both IndieWeb AND ActivityPub | Both standards can coexist. Keep AP implementation minimal. |
| **WordPress** | Plugin-based, sends `Note` type, extensive moderation tools | Note > Article for compatibility. Invest in moderation early. |

### Moderation Considerations

Since ActivityPub has no spam prevention, Grove must build:
- **Domain blocking** (defederation) — per-instance and globally
- **Keyword/actor filtering** — both site-wide and per-Wanderer
- **Rate limiting** — per-server and per-actor, using Cloudflare's built-in tools
- **HTML sanitization** — strip unsupported/dangerous elements from incoming content
- **Shared blocklists** — integrate with community lists (IFTAS DNI, The Bad Space)

### Reference: Cloudflare's Wildebeest (Archived)

Cloudflare built [Wildebeest](https://github.com/cloudflare/wildebeest), a Mastodon-compatible server on Workers (D1, Durable Objects, Queues, Images). It's been **archived and abandoned**, but the codebase is a useful reference for building ActivityPub on Cloudflare's stack. The architecture decisions (and the reasons it was abandoned) are both instructive.

---

## 5. IndieWeb Standards

### The IndieWeb Stack

| Standard | Purpose | ActivityPub Equivalent |
|----------|---------|----------------------|
| **IndieAuth** | Authentication (your domain = your identity) | Actor URL |
| **Micropub** | Creating/editing posts via HTTP | C2S API |
| **Webmention** | Cross-site notifications ("someone linked to you") | Inbox delivery |
| **Microformats2** | Semantic HTML markup (h-entry, h-feed) | ActivityStreams JSON-LD |

### Can Grove Support Both?

Yes. [Micro.blog](https://book.micro.blog/activitypub/) and [microblog.pub](https://github.com/tsileo/microblog.pub) prove it's viable. The key insight: IndieWeb is HTML-centric (your website IS the source of truth), while ActivityPub is API-centric (JSON documents delivered between servers). They complement rather than compete.

[Bridgy Fed](https://fed.brid.gy/docs) bridges the two worlds, but if Grove already speaks ActivityPub natively, we don't need a bridge — we ARE the bridge.

### RSS/Atom as Foundation

Grove already generates RSS feeds (via Threshold). This is the simplest form of content syndication and the foundation everything else builds on:
- RSS works everywhere, immediately, with zero setup
- [rss-to-activitypub](https://github.com/dariusk/rss-to-activitypub) can convert any RSS feed into a followable Fediverse actor — we could prototype federation by wrapping existing RSS feeds

---

## 6. Recommended Phased Approach

### Phase 1: Archive Import (Near-term)

**Goal**: Wanderers can upload an export file from their old platform and get draft Blooms.

**Priority platforms** (by likely user overlap with Grove's audience):
1. **WordPress (WXR)** — the universal format, huge user base
2. **Medium** — writers fleeing algorithmic feeds
3. **Tumblr** — queer creative community, natural Grove audience
4. **Bear Blog** — indie web folks, simplest format (CSV with Markdown)
5. **Substack** — writers wanting independence

**Build**:
- Import job Durable Object (mirror existing ExportJobV2 pattern)
- Source parser plugins (one per platform)
- Normalized intermediate format
- Turndown-based HTML → Markdown pipeline
- Image download + R2 upload pipeline
- Import review UI (preview drafts, select what to publish)

### Phase 2: API-Connected Import

**Goal**: "Connect your account" for platforms with good APIs.

**Priority platforms**:
1. **Bluesky** — free public API, growing platform, AT Protocol is well-documented
2. **Ghost** — Content API with simple key auth, clean JSON
3. **Mastodon** — REST API, natural Fediverse bridge

**Build**:
- OAuth flows for Mastodon
- API key input for Ghost
- AT Protocol client for Bluesky
- Progress UI for paginated API fetching

### Phase 3: RSS/Atom Import

**Goal**: Import from any blog with an RSS feed.

**Build**:
- RSS/Atom parser (many good libraries exist)
- Content extraction from feed entries (may be excerpts — option to fetch full content from source URL)
- Generic HTML → Markdown conversion

### Phase 4: Federation (ActivityPub)

**Goal**: Every Grove blog is a Fediverse actor. Mastodon users can follow Grove blogs.

**Build** (incremental):
1. **WebFinger + Actor endpoints** — makes blogs discoverable (`@autumn@grove.place`)
2. **Outbox** — exposes published Blooms as ActivityStreams objects
3. **Inbox + Follow handling** — accepts follows, delivers new Blooms to followers
4. **Social interactions** — handle incoming replies, likes, boosts
5. **Account migration** — accept `Move` activities from Mastodon/other AP servers

**Infrastructure needed**:
- Cloudflare KV namespace for Fedify
- Cloudflare Queue for activity delivery
- RSA keypair generation and storage per actor (D1)
- HTTP Signature verification middleware

### Phase 5: Full Portability

**Goal**: Wanderers can leave Grove and take everything with them.

**Build**:
- Full data export (already partially exists via Amber SDK)
- ActivityPub account migration (send `Move` to redirect followers)
- Blog Archive Format (.bar) export for maximum portability
- WXR export for WordPress compatibility

---

## 7. Open Questions

### Content Decisions
- **Short-form content**: Tweets/skeets are very different from blog posts. Do we combine threads into single posts? Import them as individual micro-posts? Create a new "note" content type?
- **Comments**: Some platforms export comments. Do we import those too? Into Reeds?
- **Draft curation UI**: What does the "review your imported content" experience look like? Bulk actions? Preview?
- **Deduplication**: If someone imports from both their Medium and their WordPress (which was cross-posted), how do we detect duplicates?

### Technical Decisions
- **Worker CPU limits**: Large archives (thousands of posts + images) will exceed single Worker invocation limits. Queue-based processing is essential.
- **Storage quotas**: Imported media counts against the Wanderer's storage quota. Need clear communication about this. Should imports get a temporary quota boost?
- **Rate limiting**: API-connected imports must respect source platform rate limits. Need per-platform rate limit configuration.
- **Image format conversion**: Should we convert imported images to WebP/AVIF during import for storage efficiency?

### Federation Decisions
- **Actor granularity**: One actor per blog (subdomain)? One actor per Wanderer? Ghost does one per site.
- **Custom domains**: `@blog@custom-domain.com` is the dream for portability, but requires DNS verification. Worth the complexity?
- **Content visibility**: Should all published Blooms federate, or should Wanderers opt-in per post?
- **Meadow + Federation**: How does the community feed interact with federation? Are Meadow posts federated?
- **Moderation staffing**: Federation opens the door to abuse. Who moderates incoming content?

### Strategic Decisions
- **"Import" vs. "Migrate"**: Language matters. "Import" suggests copying; "Migrate" suggests moving. Grove should frame this as "bringing your words home" — the content lives here now.
- **Platform partnerships**: Could we work with Bear Blog, WriteFreely, or other indie platforms on mutual import/export? Shared standards benefit everyone.
- **AT Protocol bridge**: Bluesky's AT Protocol is separate from ActivityPub. [Bridgy Fed](https://fed.brid.gy/) bridges them. Should Grove connect to AT Protocol directly, or go through the ActivityPub bridge?

---

## Key Libraries & Tools Reference

| Library | Language | Purpose |
|---------|----------|---------|
| [Turndown](https://github.com/mixmark-io/turndown) | JS/TS | HTML → Markdown conversion |
| [turndown-plugin-gfm](https://github.com/mixmark-io/turndown-plugin-gfm) | JS/TS | GFM tables/task lists for Turndown |
| [Fedify](https://fedify.dev/) | TS | ActivityPub framework (Workers support) |
| [@fedify/cfworkers](https://jsr.io/@fedify/cfworkers) | TS | Fedify Cloudflare Workers adapter |
| [@atproto/api](https://www.npmjs.com/package/@atproto/api) | TS | Bluesky/AT Protocol client |
| [@ipld/car](https://www.npmjs.com/package/@ipld/car) | JS/TS | Parse Bluesky CAR exports |
| [twitter-archive-reader](https://www.npmjs.com/package/twitter-archive-reader) | TS | Parse Twitter archive ZIPs |
| [Meddler](https://dev.to/brennan/introducing-meddler-a-medium-export-converter-4nka) | TS | Medium export → Markdown |
| [tumblr.js](https://github.com/tumblr/tumblr.js) | JS | Tumblr API client |
| [blog2md](https://github.com/palaniraja/blog2md) | JS | WordPress/Blogger XML → Markdown |

---

## Sources

### Platform Documentation
- [Twitter Archive Format Guide](https://www.tweetarchivist.com/twitter-archive-format-explained)
- [Bluesky Repo Export](https://docs.bsky.app/blog/repo-export)
- [AT Protocol API Directory](https://docs.bsky.app/docs/advanced-guides/api-directory)
- [Medium Export Help](https://help.medium.com/hc/en-us/articles/115004745787)
- [Bear Blog Docs](https://docs.bearblog.dev)
- [Tumblr API v2](https://www.tumblr.com/docs/en/api/v2)
- [Tumblr Export Help](https://help.tumblr.com/knowledge-base/export-your-blog/)
- [WordPress WXR Format Decoded](https://devtidbits.com/2011/03/16/the-wordpress-extended-rss-wxr-exportimport-xml-document-format-decoded-and-explained/)
- [WordPress Data Liberation](https://wordpress.org/data-liberation/)
- [Substack Export Guide](https://mmacfadden.substack.com/p/how-i-backup-my-substack)
- [Ghost Migration Docs](https://ghost.org/docs/migration/custom/)
- [Ghost Content API](https://docs.ghost.org/content-api)
- [Blogger Backup Help](https://support.google.com/blogger/answer/41387)
- [Neocities API](https://neocities.org/api)
- [Mastodon Data Export](https://docs.joinmastodon.org/user/moving/)

### ActivityPub & Federation
- [W3C ActivityPub Spec](https://www.w3.org/TR/activitypub/)
- [How to Implement a Basic ActivityPub Server](https://blog.joinmastodon.org/2018/06/how-to-implement-a-basic-activitypub-server/)
- [ActivityPub from Scratch](https://grishka.me/blog/activitypub-from-scratch/)
- [Understanding ActivityPub (Jambor)](https://seb.jambor.dev/posts/understanding-activitypub/)
- [Fedify Documentation](https://fedify.dev/)
- [Fedify Cloudflare Workers Deploy Guide](https://fedify.dev/manual/deploy)
- [Ghost ActivityPub Repository](https://github.com/TryGhost/ActivityPub)
- [Ghost: Building ActivityPub](https://activitypub.ghost.org/the-story-so-far/)
- [WriteFreely Federation Docs](https://writefreely.org/docs/main/writer/federation)
- [Micro.blog and ActivityPub](https://book.micro.blog/activitypub/)
- [SWICG HTTP Signatures Report](https://swicg.github.io/activitypub-http-signature/)
- [Mastodon WebFinger Spec](https://docs.joinmastodon.org/spec/webfinger/)
- [LOLA Data Portability Standard](https://swicg.github.io/activitypub-data-portability/lola)
- [Wildebeest (Archived)](https://github.com/cloudflare/wildebeest)
- [Bridgy Fed](https://fed.brid.gy/docs)

### IndieWeb
- [Blog Archive Format](https://blogarchive.org/)
- [Micropub Spec](https://micropub.spec.indieweb.org/)
- [IndieWeb Microformats](https://indieweb.org/Microformats)

### Tools & Libraries
- [Turndown](https://github.com/mixmark-io/turndown)
- [twitter-archive-parser](https://github.com/timhutton/twitter-archive-parser)
- [twitter-archive-reader](https://www.npmjs.com/package/twitter-archive-reader)
- [Meddler](https://dev.to/brennan/introducing-meddler-a-medium-export-converter-4nka)
- [blog2md](https://github.com/palaniraja/blog2md)
- [blogger-archive-converter](https://github.com/cheshrkat/blogger-archive-converter)
