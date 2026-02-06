# Embed Widget System

How the gutter handles interactive embeds and link previews.

---

## What This Is

Wanderers can add embedded content (polls, videos, music, code) to the gutter area alongside their posts. The system works in two modes:

1. **Interactive embed** — For trusted providers (YouTube, Strawpoll, Spotify, etc.), the URL becomes a live, sandboxed iframe in the gutter.
2. **Link preview** — For everything else, the URL becomes a styled OG card showing the page's title, description, and image.

The Wanderer just pastes a URL. The system figures out the rest.

---

## Architecture

```
Wanderer pastes URL in GutterManager
         |
         v
Client: GET /api/oembed?url=...
         |
         v
Server: Rate limit check (20/60s per IP)
         |
         v
Server: Normalize URL (lowercase, strip tracking params)
         |
         v
Server: Match against provider allowlist
         |
    ┌────┴────┐
    |         |
 Matched   Not matched
    |         |
    v         v
 Fetch     Fetch OG
 oEmbed    metadata
 from      (og-fetcher.ts
 provider   + SSRF check)
    |         |
    v         |
 Validate    |
 response    |
 (type,      |
  size,      |
  shape)     |
    |         |
    v         v
 Return    Return
 embed     preview
 data      data
 + CSP     + CSP
 headers   headers
         |
         v
Client: Render in gutter
  - EmbedWidget (sandboxed iframe or LinkPreview)
  - referrerpolicy="no-referrer"
  - DOMPurify sanitization for srcdoc
```

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/server/services/oembed-providers.ts` | Provider allowlist, URL normalization, response validation, CSP generation |
| `src/routes/api/oembed/+server.ts` | API endpoint with rate limiting, content-type/size checks, CSP headers |
| `src/lib/ui/components/content/EmbedWidget.svelte` | Renders sandboxed embeds (referrerpolicy, DOMPurify) or OG previews |
| `src/lib/components/custom/GutterItem.svelte` | Gutter item renderer (includes embed type) |
| `src/lib/components/admin/GutterManager.svelte` | Admin UI for adding gutter items |
| `src/lib/utils/markdown.ts` | GutterItem type definitions |

### Existing Infrastructure (Now Used)

This feature activates two systems that were built but never wired up:

- **`og-fetcher.ts`** — SSRF-protected OG metadata fetcher with KV caching. Production-ready, previously unused.
- **`LinkPreview.svelte`** — Glassmorphism link preview card. Exported from engine, previously unused.

---

## Provider Allowlist

The allowlist lives in `oembed-providers.ts`. This is the security boundary. Only URLs matching a registered provider get embedded as interactive content. Everything else falls back to a safe OG preview card.

### Current Providers

| Provider | Render Strategy | What It Embeds |
|----------|----------------|----------------|
| Strawpoll | iframe-src | Polls |
| YouTube | iframe-src | Videos (uses youtube-nocookie.com) |
| Vimeo | iframe-src | Videos |
| Spotify | iframe-src | Tracks, albums, playlists |
| SoundCloud | iframe-srcdoc | Tracks |
| Bluesky | iframe-srcdoc | Posts |
| CodePen | iframe-src | Code demos |

### Adding a New Provider

Add an entry to the `EMBED_PROVIDERS` array in `oembed-providers.ts`:

```typescript
{
  name: "ProviderName",
  patterns: [
    /^https?:\/\/(www\.)?provider\.com\/content\/[a-zA-Z0-9]+/,
  ],
  oembedUrl: "https://provider.com/oembed",
  renderStrategy: "iframe-src",  // or "iframe-srcdoc"
  sandboxPermissions: [
    "allow-scripts",
    "allow-same-origin",
  ],
  extractEmbedUrl: (url: string) => {
    const match = url.match(/provider\.com\/content\/([a-zA-Z0-9]+)/);
    return match ? `https://provider.com/embed/${match[1]}` : null;
  },
  aspectRatio: "16:9",
}
```

Then:
1. Add the provider's embed domain(s) to the `generateFrameSrcCSP()` switch statement in the same file
2. Add tests in `oembed-providers.test.ts` for the new URL patterns and embed URL extraction

### Render Strategies

**`iframe-src`** (preferred) — The provider has a dedicated embed URL. We put that URL directly in an `<iframe src>`. Safest option because the content stays on the provider's domain.

**`iframe-srcdoc`** — The provider returns HTML via oEmbed that we inline into an `<iframe srcdoc>`. Used when no dedicated embed URL exists. The `allow-same-origin` permission is stripped at render time to maintain opaque origin isolation.

**`og-preview`** — Not used in the registry (it's the automatic fallback for unmatched URLs). Shows a LinkPreview card with OG metadata.

---

## Security Model

Twelve layers, defense in depth:

1. **Allowlist (default-deny)** — Only registered providers get interactive embeds. Everything else becomes a safe OG card.
2. **URL normalization** — URLs are lowercased, tracking params stripped, and fragments removed before pattern matching. Prevents case-based bypasses (e.g., `YOUTUBE.COM`).
3. **Sandboxed iframes** — All embeds run in `<iframe sandbox>` with minimal permissions. No `allow-top-navigation` on any provider.
4. **Opaque origin isolation** — For `iframe-srcdoc` providers, `allow-same-origin` is stripped at render time to prevent sandbox escape.
5. **oEmbed response validation** — Provider responses are validated for type, shape, and size before use. Invalid responses are silently dropped.
6. **Content-Length limits** — oEmbed responses exceeding 512KB are rejected before reading the body. HTML within responses is capped at 256KB.
7. **Content-Type enforcement** — Only `application/json` and `text/json` responses from oEmbed providers are accepted.
8. **CSP frame-src headers** — The `/api/oembed` endpoint returns `Content-Security-Policy: frame-src` headers auto-generated from the provider registry. Browser-level enforcement that mirrors the JS allowlist.
9. **SSRF protection** — The OG fetcher blocks localhost, private IPs, and cloud metadata endpoints. Applied to all preview fallback requests.
10. **Referrer policy** — All embed iframes use `referrerpolicy="no-referrer"` to prevent leaking the user's page URL to providers.
11. **Rate limiting** — The `/api/oembed` endpoint is rate-limited (20 requests/60s per IP) to prevent abuse as an outbound proxy.
12. **Client-side sanitization** — Any `srcdoc` HTML passes through DOMPurify before rendering.

### What Each Sandbox Permission Does

| Permission | When Granted |
|------------|-------------|
| `allow-scripts` | Almost always (embeds need JS to function) |
| `allow-same-origin` | When the iframe loads from the provider's domain (iframe-src). Stripped for srcdoc. |
| `allow-forms` | Polls and interactive content (Strawpoll, CodePen) |
| `allow-popups` | Video players that open in new tabs |
| `allow-top-navigation` | Never. No provider should redirect the parent page. |

---

## Data Model

Embed items are stored in the `gutter_content` JSON column alongside other gutter items (comments, photos, galleries).

```json
{
  "type": "embed",
  "anchor": "## My Heading",
  "embedUrl": "https://strawpoll.com/polls/abc123",
  "embedProvider": "Strawpoll",
  "embedTitle": "Best Pizza Topping?",
  "embedThumbnail": "https://strawpoll.com/thumb/abc123.jpg"
}
```

We store the **source URL** (`embedUrl`), not the rendered HTML. This lets us:
- Re-fetch oEmbed data if a provider changes their format
- Apply updated security policies retroactively
- Keep the stored content auditable

The `embedProvider` field is optional. If present, the client skips the API call and renders directly. If absent, the client calls `/api/oembed` to resolve the URL.

---

## Testing

105 tests cover this feature:

- **86 unit tests** (`oembed-providers.test.ts`) — Provider matching, URL extraction, URL normalization, response validation, CSP generation, security properties, registry integrity
- **19 integration tests** (`oembed.test.ts`) — Full endpoint flow with mocked fetch, fallback behavior, response validation, content-type/size enforcement, URL normalization, SSRF protection

Run them:

```bash
cd packages/engine
npx vitest run src/lib/server/services/oembed-providers.test.ts
npx vitest run src/routes/api/oembed/oembed.test.ts
```

---

## Future Work

- **oEmbed response caching** — Cache resolved embed data in KV alongside OG metadata
- **Admin preview** — Show a live preview of the embed in GutterManager before saving
- **Provider discovery** — Support `<link rel="alternate" type="application/json+oembed">` for auto-detecting oEmbed endpoints on arbitrary pages
- **Curios integration** — When the Curios system ships, embeds could become a Curio type in the vine area
