---
title: "Hum: Universal Music Link Previews"
status: active
category: features
---

# Hum: Universal Music Link Previews

> _Share a song. The grove hums along._

**Priority:** Tier 2 — Build Next
**Complexity:** Medium
**Category:** Content Enhancement
**Related:** [Now Playing Curio](curios/06-now-playing.md) (live status — complementary, not overlapping)

---

## What

When someone pastes a music link into a post — Apple Music, Spotify, YouTube Music, Tidal, Deezer, SoundCloud, Bandcamp, whatever — it transforms into a beautiful, Grove-branded preview card. Album art, track name, artist, source platform. Click it, and it opens in the original service. No ugly bare URLs. No clunky provider iframes. Just a clean, warm card that says _"here's what I'm listening to."_

## Why

Sharing music is one of the most intimate, human things we do online. "Listen to this" is a love language. But right now, a music link in a post is just... a URL. Cold, uninviting, easy to scroll past. And provider embeds (Spotify's iframe, Apple Music's widget) each look different, clash with the site's aesthetic, and load heavy third-party scripts.

Hum solves this by creating a **unified music card** — same beautiful design regardless of where the link came from. An Apple Music link and a Spotify link for the same song should feel equally at home in the grove. The source matters (we show it), but it doesn't dictate the design.

This is also the kind of feature that makes Grove feel _alive_ and _opinionated_. Most platforms just linkify URLs. We make them hum.

---

## Design Philosophy

### One card to rule them all

Every music link renders through the same `HumCard` component. The card is ours — Grove-designed, Grove-styled, seasonal-aware. Provider logos appear as a subtle badge (top-right corner), but the card itself never looks like "a Spotify embed" or "an Apple Music widget."

### Content pipeline integration

Hum lives in the **markdown processing pipeline**, not in a separate embed system. When `renderMarkdown()` encounters a music URL, it outputs a semantic placeholder. The client hydrates it into the card component. Same pattern as GroveTerm — server marks it up, client makes it interactive.

### Click-through, not playback

We don't need 30-second previews or audio players. The goal is **discovery and sharing** — show what someone's listening to, make it look gorgeous, and let anyone tap through to hear it on their own platform. This keeps the implementation lean and avoids licensing headaches.

### Provider-agnostic metadata

We use cross-platform APIs to resolve metadata, falling back gracefully when a specific provider isn't supported. The card renders the same whether we got the data from Odesli, the iTunes API, Spotify oEmbed, or OG tags scraped from the page.

---

## Supported Providers

| Provider      | URL Pattern                               | Priority                   |
| ------------- | ----------------------------------------- | -------------------------- |
| Apple Music   | `music.apple.com/{cc}/{type}/{slug}/{id}` | Phase 1                    |
| Spotify       | `open.spotify.com/{type}/{id}`            | Phase 1                    |
| YouTube Music | `music.youtube.com/watch?v={id}`          | Phase 1                    |
| SoundCloud    | `soundcloud.com/{user}/{track}`           | Phase 1                    |
| Tidal         | `tidal.com/browse/{type}/{id}`            | Phase 2                    |
| Deezer        | `deezer.com/{type}/{id}`                  | Phase 2                    |
| Amazon Music  | `music.amazon.com/{type}/{id}`            | Phase 3                    |
| Bandcamp      | `{artist}.bandcamp.com/{type}/{slug}`     | Future (needs OG scraping) |

Phase 1 covers the providers you and your friends actually use. Phase 2 and 3 add coverage as demand appears — the architecture supports adding new providers by dropping a regex + URL extractor into the registry.

---

## Architecture

### The Pipeline

```
Post content (markdown in D1)
  │
  ▼
renderMarkdown() — markdown-it processes content
  │
  ├── linkify detects bare URLs (existing behavior)
  │
  ▼
hum markdown-it plugin (NEW)
  │
  ├── Matches URL against music provider patterns
  ├── Outputs: <div class="hum-card" data-url="..." data-provider="spotify">
  │            <a href="...">Loading music preview...</a>
  │            </div>
  │   (The <a> fallback is the progressive enhancement — works without JS)
  │
  ▼
sanitizeMarkdown() — allows hum divs + data attributes
  │
  ▼
html_content stored in D1 (alongside markdown_content)
  │
  ▼
Page load: +page.svelte renders {@html content}
  │
  ▼
Client-side $effect in ContentWithGutter.svelte (NEW)
  │
  ├── Finds .hum-card elements in rendered HTML
  ├── Fetches metadata from /api/hum/resolve?url={encoded}
  ├── Mounts HumCard component into each placeholder
  │
  ▼
HumCard.svelte renders: artwork, title, artist, provider badge
  │
  ▼
Click → opens original URL in new tab
```

### Metadata Resolution (Server-side API)

The `/api/hum/resolve` endpoint handles metadata fetching with a cascading fallback strategy:

```
Incoming URL
  │
  ▼
1. Check KV cache (key: hum:{url_hash})
  │
  ├── HIT → return cached metadata (TTL: 7 days)
  │
  ▼
2. Odesli/Songlink API (free, no auth, cross-platform)
  │   GET https://api.song.link/v1-alpha.1/links?url={url}
  │
  ├── Returns: title, artistName, thumbnailUrl, cross-platform links
  ├── Rate limit: 10 req/min (free), higher with free API key
  │
  ├── SUCCESS → normalize, cache in KV, return
  │
  ▼
3. Provider-specific fallback
  │
  ├── Apple Music → iTunes Lookup API (free, no auth, 20 req/min)
  │   GET https://itunes.apple.com/lookup?id={id}
  │   Returns: trackName, artistName, artworkUrl, collectionName
  │
  ├── Spotify → Spotify oEmbed (free, no auth)
  │   GET https://open.spotify.com/oembed?url={url}
  │   Returns: title, thumbnail_url, author_name
  │
  ├── SoundCloud → SoundCloud oEmbed (free, no auth)
  │   GET https://soundcloud.com/oembed?url={url}&format=json
  │
  ├── YouTube Music → YouTube oEmbed (free, no auth)
  │   GET https://www.youtube.com/oembed?url={url}&format=json
  │
  ├── SUCCESS → normalize, cache in KV, return
  │
  ▼
4. Graceful degradation
  │
  └── Return minimal metadata: { url, provider, status: "unresolved" }
      Client renders a styled link card with provider logo (still pretty, just no artwork)
```

### Why this cascade order?

**Odesli first** because it resolves _any_ music URL from _any_ provider in one call, and it returns cross-platform links as a bonus. If Odesli is down or rate-limited, we fall back to each provider's own free API. If _that_ fails, the card still renders — it just shows the provider logo and a clean link instead of album art.

---

## Data Model

### Normalized Metadata

```typescript
interface HumMetadata {
	/** The original URL that was shared */
	sourceUrl: string;
	/** Which provider the link came from */
	provider: HumProvider;
	/** Content type */
	type: "track" | "album" | "playlist" | "artist" | "unknown";
	/** Track or album title */
	title: string | null;
	/** Artist name */
	artist: string | null;
	/** Album name (if available and different from title) */
	album: string | null;
	/** Album artwork URL (proxied through our CDN) */
	artworkUrl: string | null;
	/** High-res artwork URL for OG images */
	artworkUrlLarge: string | null;
	/** Cross-platform links (from Odesli) */
	platformLinks: Partial<Record<HumProvider, string>>;
	/** When this metadata was resolved */
	resolvedAt: string;
	/** Resolution quality */
	status: "resolved" | "partial" | "unresolved";
}

type HumProvider =
	| "apple-music"
	| "spotify"
	| "youtube-music"
	| "soundcloud"
	| "bandcamp"
	| "tidal"
	| "deezer"
	| "amazon-music"
	| "unknown";
```

### KV Cache

- **Namespace:** `HUM_CACHE` (or reuse existing KV with prefix)
- **Key:** `hum:{sha256(normalized_url)}`
- **Value:** JSON-serialized `HumMetadata`
- **TTL:** 7 days (music metadata rarely changes; album art URLs are stable)
- **Miss behavior:** Fetch from API cascade, cache result, return

No D1 table needed. This is pure cache — if KV expires, we re-fetch. Music metadata is effectively immutable.

---

## URL Detection

### Regex Patterns

```typescript
const HUM_PATTERNS: Record<HumProvider, RegExp[]> = {
	"apple-music": [
		/^https?:\/\/music\.apple\.com\/[a-z]{2}\/(album|playlist|music-video)\/[^/]+\/[a-zA-Z0-9.]+/,
		/^https?:\/\/music\.apple\.com\/[a-z]{2}\/artist\/[^/]+\/\d+/,
	],
	spotify: [
		/^https?:\/\/open\.spotify\.com\/(track|album|playlist|episode|show|artist)\/[a-zA-Z0-9]+/,
	],
	"youtube-music": [
		/^https?:\/\/music\.youtube\.com\/watch\?v=[a-zA-Z0-9_-]+/,
		/^https?:\/\/music\.youtube\.com\/playlist\?list=[a-zA-Z0-9_-]+/,
	],
	soundcloud: [/^https?:\/\/(www\.)?soundcloud\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/],
	bandcamp: [/^https?:\/\/[a-zA-Z0-9_-]+\.bandcamp\.com\/(track|album)\/[a-zA-Z0-9_-]+/],
	tidal: [
		/^https?:\/\/(www\.|listen\.)?tidal\.com\/(browse\/)?(track|album|playlist|artist)\/[a-zA-Z0-9-]+/,
	],
	deezer: [/^https?:\/\/(www\.)?deezer\.com\/(track|album|playlist|artist)\/\d+/],
	"amazon-music": [
		/^https?:\/\/music\.amazon\.(com|co\.\w+)\/(albums|tracks|playlists)\/[a-zA-Z0-9]+/,
	],
};
```

### Where detection happens

The **markdown-it plugin** intercepts link tokens during rendering. When `linkify: true` converts a bare URL into a link token, or when a user writes `[text](url)`, the plugin checks the href against `HUM_PATTERNS`. On match, it replaces the default `<a>` output with the hum placeholder div.

This means detection happens at **write time** (when the post is saved), not at read time. The `html_content` column already contains the hum placeholders. The client just hydrates them.

---

## Components

| Component                 | Purpose                                                |
| ------------------------- | ------------------------------------------------------ |
| `HumCard.svelte`          | Main display — artwork, title, artist, provider badge  |
| `HumCardSkeleton.svelte`  | Loading state (shimmer animation matching card layout) |
| `HumCardFallback.svelte`  | Unresolved state — provider logo + styled link         |
| `HumProviderBadge.svelte` | Small provider logo (Apple, Spotify, etc.)             |
| `HumPlatformTray.svelte`  | Slide-out tray showing cross-platform links            |

### Component location

```
libs/engine/src/lib/ui/components/content/hum/
├── index.ts
├── types.ts
├── HumCard.svelte
├── HumCardSkeleton.svelte
├── HumCardFallback.svelte
├── HumProviderBadge.svelte
├── HumPlatformTray.svelte
└── providers.ts                  # URL patterns + provider metadata
```

### HumCard visual design

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  ┌──────────┐                        ┌──────┐  │
│  │          │  Song Title             │  🎵  │  │
│  │ Artwork  │  Artist Name            │ logo │  │
│  │  (80px)  │  Album Name             └──────┘  │
│  │          │                                   │
│  └──────────┘                                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

- **Glass card** with subtle backdrop blur (follows Grove glassmorphism)
- **Album artwork** on the left, rounded corners (grove border radius)
- **Text** right of artwork: title (bold), artist (regular), album (muted, if different from title)
- **Provider badge** top-right: small logo icon (16×16), clickable → opens source URL
- **Platform tray:** tap badge to slide out a row of platform icons (Spotify, Apple Music, YouTube, etc.) from Odesli data. Each icon links to that platform. Tray slides back on blur/outside click. This is the one interactive element.
- **Hover state:** subtle lift + glow, cursor pointer
- **Click (card body):** opens source URL in new tab
- **Dark mode:** warm dark glass, not cold — "album cover at night"
- **Reduced motion:** no hover animation, still fully functional
- **Mobile:** card goes full-width, artwork stays proportional

### Seasonal touches (future, not Phase 1)

- Spring: faint petal overlay on hover
- Autumn: warm amber glow around artwork
- Winter: frost on the glass edge
- Midnight: subtle starfield in the glass blur

---

## API Endpoint

| Method | Route                            | Purpose                          | Auth                  |
| ------ | -------------------------------- | -------------------------------- | --------------------- |
| `GET`  | `/api/hum/resolve?url={encoded}` | Resolve metadata for a music URL | Public (rate-limited) |

### Rate limiting

- **Per-IP:** 30 requests/minute (generous for normal browsing)
- **Per-tenant:** 100 requests/minute (covers pages with many music links)
- **Global:** Odesli and iTunes API limits are handled server-side with queuing

### Response shape

```json
{
	"status": "resolved",
	"provider": "apple-music",
	"type": "track",
	"title": "Running Up That Hill",
	"artist": "Kate Bush",
	"album": "Hounds of Love",
	"artworkUrl": "https://cdn.grove.place/hum/abc123.jpg",
	"sourceUrl": "https://music.apple.com/us/album/running-up-that-hill/1558627166?i=1558627175",
	"platformLinks": {
		"spotify": "https://open.spotify.com/track/75FEaRjZTKLhTrFGsfMUXR",
		"youtube-music": "https://music.youtube.com/watch?v=...",
		"tidal": "https://tidal.com/browse/track/..."
	}
}
```

---

## Artwork Proxying

We should **not** hotlink provider CDNs directly. Album art URLs from Apple/Spotify could change, get rate-limited, or leak referrer data.

**Strategy:** On first resolve, the **server-side** `/api/hum/resolve` endpoint fetches the artwork (never the browser — avoids CORS issues with provider CDNs) and stores it as a base64 blob in **KV** alongside the metadata.

- **KV key:** `hum:art:{sha256(artworkSourceUrl)}`
- **Dimensions:** Fetch at 300×300 for card display (swap `100x100bb` → `300x300bb` in Apple URLs; use thumbnail sizes from other providers)
- **TTL:** 7 days, matching metadata cache
- **Size guard:** Only cache artwork under 100KB as base64; larger images fall back to direct URL with `referrerpolicy="no-referrer"`
- **Fallback:** If KV write fails or image is too large, serve the original URL proxied through the API endpoint

Can migrate to R2 later if permanence or storage costs become a concern — but KV keeps Phase 1 simple.

---

## Integration Points

### 1. Markdown-it Plugin

**File:** `libs/engine/src/lib/utils/markdown-hum.ts` (new)

Register on the `md` instance in `markdown.ts`:

```typescript
import { humPlugin } from "./markdown-hum";

const md = new MarkdownIt({ html: true, linkify: true, breaks: false });
md.use(humPlugin);
```

The plugin hooks into `core` rules (after linkify runs) and walks the token stream. When it finds a link token whose `href` matches a hum pattern, it replaces the link's open/content/close tokens with an `html_block` token containing the placeholder div.

### 2. Sanitizer allowlist

**File:** `libs/engine/src/lib/utils/sanitize.ts`

Add `div` to `ALLOWED_TAGS` (already present) and ensure these data attributes pass through:

```typescript
ALLOWED_ATTR: [
	// ... existing ...
	"data-hum-url",
	"data-hum-provider",
];
```

### 3. Client-side hydration

**File:** `libs/engine/src/lib/components/custom/ContentWithGutter.svelte`

Add a `$effect` that finds `.hum-card` elements in the rendered content and mounts `HumCard` into each one:

```typescript
$effect(() => {
	const cards = contentEl?.querySelectorAll(".hum-card[data-hum-url]");
	cards?.forEach((card) => {
		const url = card.getAttribute("data-hum-url");
		if (url) mountHumCard(card, url);
	});
});
```

### 4. oEmbed provider registry

**File:** `libs/engine/src/lib/server/services/oembed-providers.ts`

Add Apple Music, YouTube Music, Tidal, Deezer, Bandcamp to the existing registry. This isn't strictly needed for Hum (we use our own card, not iframes), but keeps the registry complete for any future gutter embed use.

---

## Implementation Phases

### Phase 1: Foundation (1-2 days)

1. Create `providers.ts` — URL patterns + provider metadata
2. Create `markdown-hum.ts` — markdown-it plugin
3. Wire plugin into `markdown.ts`
4. Update sanitizer allowlist
5. Create `/api/hum/resolve` endpoint with Odesli integration
6. Add KV caching layer
7. Create `HumCard.svelte` + skeleton + fallback components
8. Wire client-side hydration in `ContentWithGutter.svelte`
9. Test with Apple Music + Spotify URLs

### Phase 2: Polish (1 day)

1. `HumPlatformTray` slide-out with cross-platform links from Odesli
2. Add YouTube Music, SoundCloud providers
3. Provider-specific fallback APIs (iTunes Lookup, Spotify oEmbed)
4. Accessible focus states, reduced motion, screen reader labels
5. Dark mode refinement
6. Mobile responsive tweaks

### Phase 3: Enrichment (future)

1. OG image generation for social sharing
2. Seasonal card variations
3. Add Tidal, Deezer, Amazon Music providers
4. Bandcamp support (OG tag scraping — no free metadata API)
5. Integration with Now Playing curio (share what you're listening to → auto-creates a hum card in your feed)

---

## Edge Cases

| Scenario                                              | Handling                                                                                                         |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Odesli API is down                                    | Fall back to provider-specific API                                                                               |
| All APIs fail                                         | Render `HumCardFallback` — styled link with provider logo                                                        |
| URL is valid music link but for a removed track       | Show card with "Track unavailable" + provider logo                                                               |
| Same song shared from different providers             | Each renders its own card (cross-platform links shown if available)                                              |
| User shares a playlist with 200 tracks                | Card shows playlist artwork + title + track count, not individual tracks                                         |
| Non-music YouTube link matched by YouTube Music regex | YouTube Music URLs use `music.youtube.com`, regular YouTube uses `youtube.com` — different domains, no collision |
| Link is in a markdown `[text](url)` with custom text  | Plugin detects the href, replaces the full link with a hum card (the custom text becomes the fallback)           |
| Multiple music links in one post                      | Each gets its own card, fetched in parallel                                                                      |
| Image-heavy post with many cards                      | Cards lazy-load artwork (IntersectionObserver)                                                                   |
| KV cache miss + API rate limit hit                    | Queue and retry with backoff; serve fallback card immediately                                                    |

---

## Relationship to Now Playing Curio

**Hum** and **Now Playing** are complementary, not competing:

- **Now Playing** = live status widget ("I'm listening to this _right now_"), lives in vine slots, updates via polling
- **Hum** = content enhancement ("I want to share this song _in this post_"), lives inline in post content, static after render

They share some infrastructure (provider logos, artwork proxying, possibly the artwork cache), but serve different purposes. A future integration could let the Now Playing curio automatically create a "recently listened" feed that uses Hum cards — but that's Phase 3 territory.

---

## What We're NOT Building

- **Audio playback** — No 30-second previews, no play buttons. Click → opens in the provider app. This keeps us lean and avoids streaming license complexity.
- **Provider iframes** — No Spotify embeds, no Apple Music widgets. Our card, our design, our rules.
- **MusicKit / Apple Developer account** — Not needed. The iTunes Lookup API is free and gives us everything we need for metadata.
- **User authentication with providers** — No OAuth, no "connect your Spotify." That's the Now Playing curio's job. Hum works purely from public URLs and public APIs.
- **Music search** — We don't search for songs. Someone pastes a link, we make it pretty. That's it.

---

## Open Questions

1. ~~**Artwork caching strategy**~~ — **Decided: KV.** Base64 for small images (< 100KB), 7-day TTL matching metadata cache. Simpler to reason about, no R2 plumbing needed for v1. Can migrate to R2 later if permanence or storage costs become a concern.

2. ~~**Cross-platform links UX**~~ — **Decided: source badge + slide-out.** Card shows the source provider badge by default. Tap/click reveals a slide-out tray with icons for all available platforms (from Odesli). Keeps the card clean at rest, but lets people pick their preferred service. The slide-out is the one interactive element on the card.

3. ~~**Write-time vs. read-time resolution**~~ — **Decided: read-time.** Client calls `/api/hum/resolve` on page load, KV cache makes most hits instant (7-day TTL). No stale metadata baked into D1, no re-render needed when posts are edited. The architecture section already reflects this.

4. ~~**Existing Spotify/SoundCloud embeds in oEmbed registry**~~ — **Decided: coexist.** Hum handles music links in post content body; the oEmbed system continues to handle gutter embeds. Different contexts, different presentations. No migration needed.

5. ~~**Bandcamp edge case**~~ — **Decided: skip for now.** Bandcamp has no free metadata API and limited oEmbed. Moved to future enhancement — can revisit with OG tag scraping if there's demand. Not worth the complexity for Phase 1 or 2.

---

## Notes

Don't overthink Phase 1. The magic is in the _detection + beautiful card_, not in supporting every edge case from day one. Get Apple Music + Spotify working with Odesli, make the card look gorgeous, ship it. Everything else is iteration.

A hum is the ambient music of a living forest — bees in the undergrowth, wind through the canopy, the vibration of everything being alive. It's also what you do when a song won't leave your head. Not a performance. Not something you rehearse. Just music, living in you, leaking out. That's what this feature is. You paste a link, and the grove hums along.

_The forest was always humming. We just made it visible._

---

_Last updated: February 8, 2026_
