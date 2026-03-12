---
title: "Waystone Developer Guide"
description: "How to add, debug, and maintain help markers throughout Grove apps."
category: guides
guideCategory: content-community
lastUpdated: "2026-03-12"
aliases: []
tags:
  - waystone
  - help-center
  - prerender
  - cors
---

# Waystone Developer Guide

How to add, debug, and maintain waystones (the `?` help markers throughout Arbor and other Grove apps).

## How Waystones Work

A waystone is a small help icon that opens a glassmorphism popup with a KB article excerpt. When clicked, it fetches article data from `grove.place/api/kb/excerpt/{slug}` and renders the first section inline. If the fetch fails, the popup shows "Unable to load help content."

The data flow:

1. Developer adds `<Waystone slug="what-is-rings" />` to a Svelte component
2. On click (or hover with 150ms debounce), the component fetches `https://grove.place/api/kb/excerpt/what-is-rings`
3. That endpoint is **prerendered at build time** from markdown files in `docs/help-center/articles/`
4. The response includes title, description, first section HTML, and reading time
5. The popup displays the excerpt with a "Read full article" link to `grove.place/knowledge/help/{slug}`

## Adding a New Waystone

Three things need to happen, in order. Miss one and the waystone will silently fail.

### 1. Write the help article

Create a markdown file in `docs/help-center/articles/` with frontmatter:

```markdown
---
title: "What is Rings"
description: "One-sentence summary of what Rings does."
lastUpdated: "2026-03-12"
---

# What is Rings

First paragraph here becomes the waystone excerpt. Keep it concise
and useful on its own. The excerpt ends at the first `##` heading.

## More Details

Content below the first section heading won't appear in the popup,
only on the full article page.
```

The slug is the filename without `.md`. So `what-is-rings.md` becomes slug `what-is-rings`.

### 2. Register the slug in the excerpt API allowlist

Open `apps/landing/src/routes/api/kb/excerpt/[slug]/+server.ts` and add your slug to `WAYSTONE_ARTICLE_SLUGS`:

```typescript
const WAYSTONE_ARTICLE_SLUGS = [
  "choosing-a-theme",
  "custom-fonts",
  // ...existing slugs...
  "your-new-slug", // Brief comment explaining where it's used
];
```

This array does two things:
- **Allowlist**: The GET handler rejects any slug not in this list (404)
- **Prerender entries**: The `entries` generator uses this list to tell SvelteKit which static JSON files to generate at build time

If you skip this step, SvelteKit never creates the JSON file and the CDN has nothing to serve.

### 3. Add the component

```svelte
<script>
  import Waystone from '$lib/ui/components/ui/waystone/Waystone.svelte';
</script>

<!-- Standalone -->
<h2>
  Analytics
  <Waystone slug="what-is-rings" label="Learn about Rings" />
</h2>

<!-- Inline with text -->
<p>
  Configure your theme
  <Waystone slug="choosing-a-theme" label="About themes" inline />
</p>
```

Or use the `waystone` prop on GlassCard (adds the icon to the card header):

```svelte
<GlassCard
  title="Typography"
  waystone="custom-fonts"
  waystoneLabel="Learn about fonts"
>
  <!-- card content -->
</GlassCard>
```

### 4. Update the inventory

Add your waystone to `.github/waystone-inventory.json` under the `slugs` array. The inventory tracks every waystone instance for drift detection.

## Why Waystones Break

Most waystone failures are silent. The popup opens, shows a spinner, then displays "Unable to load help content." Check the browser console for the actual error.

### Missing from the allowlist

The most common cause. If `WAYSTONE_ARTICLE_SLUGS` in the excerpt API doesn't include your slug, the API returns 404. The component catches this and shows the generic error.

Fix: Add the slug to the allowlist in `apps/landing/src/routes/api/kb/excerpt/[slug]/+server.ts`.

### CORS blocking the fetch

Waystones render on tenant subdomains (`username.grove.place`) but fetch from `grove.place`. These are different origins. The excerpt API is prerendered (static JSON files on Cloudflare's CDN), so it can't set CORS headers at runtime. Instead, `apps/landing/static/_headers` tells the CDN to add CORS headers to excerpt paths.

If someone removes the `_headers` file or changes its path patterns, every waystone on every tenant subdomain breaks. Same-origin waystones (on `grove.place` itself) would still work.

Fix: Verify `apps/landing/static/_headers` exists and covers `/api/kb/excerpt/*`.

### Slug doesn't match the article filename

The slug in your component must exactly match the article filename (minus `.md`). `slug="greenhouse-features"` won't find `what-is-greenhouse.md`. There's no fuzzy matching.

Fix: Check the filename in `docs/help-center/articles/` and make sure your slug matches.

### Article exists but has no content before the first `##`

The excerpt extractor grabs content between the `# Title` and the first `## Section`. If there's nothing there (title immediately followed by a section heading), the excerpt is empty. The popup will render but show nothing useful.

Fix: Add an introductory paragraph before your first `##` heading.

### CSP blocking the fetch

If an app's Content Security Policy doesn't allow `connect-src` to `grove.place`, the browser blocks the fetch silently. The login app hit this (fixed in `d57815f5`). Check both `https://grove.place` (apex) and `https://*.grove.place` (wildcard) are in `connect-src`.

## Architecture Notes

### Why the API is prerendered

The excerpt endpoint uses `readFileSync` to read markdown files from the filesystem and render them with MarkdownIt. Cloudflare Workers don't have filesystem access at runtime, so this has to happen at build time. SvelteKit's `export const prerender = true` bakes each slug into a static JSON file that the CDN serves directly.

The tradeoff: you can't set response headers dynamically. That's why we need the `_headers` file for CORS instead of setting headers in the handler like the CDN endpoint does.

This is temporary. When the engine deployment moves from Cloudflare Pages to a Worker (#1193), the excerpt API can switch to reading from KV or D1 at runtime and set CORS headers natively.

### Key files

| File | What it does |
|------|-------------|
| `libs/engine/src/lib/ui/components/ui/waystone/Waystone.svelte` | The component |
| `libs/engine/src/lib/ui/components/ui/waystone/WaystonePopup.svelte` | The popup overlay |
| `libs/engine/src/lib/ui/components/ui/waystone/types.ts` | Types and cache utilities |
| `apps/landing/src/routes/api/kb/excerpt/[slug]/+server.ts` | Excerpt API (prerendered) |
| `apps/landing/static/_headers` | CORS headers for the CDN |
| `docs/help-center/articles/` | Source markdown for all KB articles |
| `.github/waystone-inventory.json` | Tracks all waystone instances |
| `docs/specs/waystone-spec.md` | Original spec (covers Help Center vision, not implementation details) |

### The manifest prop

Waystone accepts an optional `manifest` prop for build-time excerpt lookup. If provided, the component skips the API fetch entirely and reads from the manifest object. This isn't used anywhere today but exists as an optimization path for apps that want to bundle excerpt data.

## Quick Checklist

Adding a waystone? Run through this:

- [ ] Article markdown exists in `docs/help-center/articles/{slug}.md`
- [ ] Article has content between `# Title` and first `## Heading`
- [ ] Slug is in `WAYSTONE_ARTICLE_SLUGS` in the excerpt API
- [ ] `<Waystone>` component uses the correct slug string
- [ ] Instance is recorded in `.github/waystone-inventory.json`
- [ ] If rendering on a non-`grove.place` origin, CORS is handled via `_headers`
