# Grove OG Image Worker

Dynamic Open Graph image generation service for Grove.

## What It Does

Generates dynamic OG (Open Graph) images for social media previews. When someone shares a Grove link on Discord, Twitter, iMessage, etc., this service creates a customized preview image with the page title, subtitle, and Grove branding.

## Why a Separate Worker?

WASM libraries (`workers-og`, `@cf-wasm/resvg`, `satori`) don't bundle correctly with SvelteKit + Cloudflare Pages. The Vite build process runs in Node.js and can't properly resolve WASM imports for the Cloudflare Pages runtime.

**Solution:** Deploy OG generation as a standalone Cloudflare Worker that handles WASM natively.

## Endpoints

### `GET /` or `GET /og`

Generates an OG image.

**Query Parameters:**
| Parameter | Default | Description |
|-----------|---------|-------------|
| `title` | "Grove" | Main title text (max 100 chars) |
| `subtitle` | "A place to Be." | Subtitle text (max 200 chars) |
| `accent` | "16a34a" | Hex color for accent (no #) |

**Example:**
```
https://og.grove.place/?title=The%20Workshop&subtitle=Tools%20being%20built&accent=f59e0b
```

**Response:** PNG image (1200×630)

### `GET /health`

Health check endpoint.

**Response:** `{"status":"ok"}`

## Architecture

```
grove.place/api/og
       ↓ 302 redirect
og.grove.place/?title=...&subtitle=...
       ↓ generates
PNG image (1200×630)
```

The landing site's `/api/og` endpoint redirects to `og.grove.place` with query params preserved.

## Development

```bash
# Install dependencies
pnpm install

# Run locally
pnpm dev

# Type check
pnpm check

# Deploy
pnpm deploy
```

## Technical Details

- **Font:** Lexend Regular from cdn.grove.place
- **Image Library:** workers-og (uses Yoga for layout, Resvg for PNG)
- **Caching:** 24h browser cache, 7d CDN cache
- **CORS:** Enabled for cross-origin requests

## Routing

The grove-router at `*.grove.place` proxies `og.grove.place` requests to this Worker's `workers.dev` URL.

## Related Files

- `landing/src/routes/api/og/+server.ts` - Proxy endpoint
- `landing/src/routes/api/og/forest/+server.ts` - Forest-themed proxy
- `landing/src/lib/components/SEO.svelte` - Uses OG images in meta tags
