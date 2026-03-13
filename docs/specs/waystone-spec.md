---
title: Waystone — Contextual Help System
description: In-context help markers and knowledge base integration for Grove
category: specs
specCategory: platform-services
icon: signpost
lastUpdated: '2026-03-11'
aliases: []
date created: Sunday, December 1st 2025
date modified: Tuesday, March 11th 2026
tags:
  - lattice
  - ui-component
  - help-system
  - knowledge-base
type: tech-spec
---

```
                                          🌲
      🌲                    ╱╲
               🌲          ╱  ╲               🌲
                          ╱ ?  ╲
    ·  ·  ·  ·  ·  ·  · ╱──────╲ ·  ·  ·  ·  ·  ·  ·
    ─────────────────────────────────────────────────────
                      the path

               Markers for when you're lost.
```

> *Trail markers that guide you through the forest.*

# Waystone: Contextual Help System

Grove's contextual help system. Small question-mark icons placed throughout the admin panel and login flow that open glassmorphism popups with article excerpts, fetched from the knowledge base on `grove.place`. Wanderers get help where they are, without leaving the page.

**Public Name:** Waystone
**Internal Name:** GroveWaystone
**Version:** 2.0 (Production)
**Last Updated:** March 2026

Waystones are the markers travelers leave along forest paths. In Grove, they appear as small help circles beside features, settings, and tools. Click one and a popup opens with the first section of a knowledge base article. A link at the bottom takes you to the full article if you want more.

---

## Overview

### What This Is

Waystone is a two-part system: a Svelte component library (trigger icon + popup overlay) and a prerendered excerpt API that serves article content. Together they provide in-context help across all Grove properties without external dependencies or runtime parsing.

### Goals

- Help appears where the Wanderer needs it, not behind a separate docs site
- Zero runtime cost. Excerpts are prerendered at build time
- Progressive enhancement. Falls back to a plain link without JavaScript
- Accessible by default. WCAG 2.5.5 touch targets, keyboard navigation, screen reader labels

### Non-Goals

- Full-text search across articles (handled by the knowledge base UI)
- Article authoring or CMS workflow (articles are markdown files)
- Interactive tutorials or guided tours

---

## Architecture

```
Tenant Subdomain                         grove.place (Landing)
━━━━━━━━━━━━━━━━━                        ━━━━━━━━━━━━━━━━━━━━━

┌────────────┐   click    ┌──────────────┐
│  Waystone  │ ─────────→ │ WaystonePopup│
│  (? icon)  │            │ (overlay)    │
└─────┬──────┘            └──────┬───────┘
      │ hover (150ms)            │ fetch (if not cached)
      │ preloads                 │
      ▼                          ▼
┌─────────────────────────────────────────┐
│  https://grove.place/api/kb/excerpt/    │
│  [slug]                                 │
│                                         │
│  Prerendered at build time              │
│  Cache-Control: 1 day                   │
└──────────────────┬──────────────────────┘
                   │ reads at build time
                   ▼
          ┌─────────────────┐
          │ docs/help-center │
          │ /articles/*.md   │
          │ (100+ files)     │
          └─────────────────┘
```

The component renders on tenant subdomains (`username.grove.place`) but fetches excerpts from the landing site (`grove.place`). This cross-domain design keeps article content centralized. CSP `connect-src` on consuming apps allows both `https://grove.place` and `https://*.grove.place`.

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Trigger icon | Svelte 5, @lucide/svelte | Runes reactivity, tree-shakeable icons |
| Popup overlay | bits-ui Dialog | Focus trap, escape-to-close, ARIA labels |
| Glass effect | GlassCard component | Consistent glassmorphism from engine |
| XSS protection | sanitizeMarkdown() | Defense-in-depth on `{@html}` rendering |
| Excerpt API | SvelteKit prerender | Zero runtime cost, static JSON responses |
| Markdown parsing | gray-matter + MarkdownIt | Frontmatter extraction, HTML rendering |
| GroveTerm support | groveTermPlugin | Resolves Grove terminology in excerpts |

---

## Component API

### Waystone

The trigger component. Renders a circular help icon that opens a popup on click.

**Import:** `import { Waystone } from '@autumnsgrove/lattice/ui';`

**Source:** `libs/engine/src/lib/ui/components/ui/waystone/Waystone.svelte`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `slug` | `string` | required | KB article slug (e.g., `"custom-fonts"`) |
| `label` | `string` | `"Learn more"` | Screen reader label |
| `size` | `"sm" \| "md"` | `"sm"` | Visual size. `sm` = 20px, `md` = 24px |
| `inline` | `boolean` | `false` | Display inline with text (adds left margin) |
| `class` | `string` | `undefined` | Additional CSS classes |
| `manifest` | `WaystoneManifest` | `undefined` | Optional static manifest for build-time lookup |

**Usage:**

```svelte
<!-- Basic -->
<Waystone slug="custom-fonts" label="About custom fonts" />

<!-- Inline with text -->
<p>Configure your theme <Waystone slug="choosing-a-theme" inline /></p>

<!-- With static manifest (skips API fetch) -->
<script>
  import waystoneManifest from '$lib/data/waystone-manifest.json';
</script>
<Waystone slug="custom-fonts" manifest={waystoneManifest} />
```

**Behavior:**

1. Renders as an `<a>` tag pointing to the full article URL (progressive enhancement)
2. On click, prevents navigation and opens the popup overlay
3. On hover, starts a 150ms debounced preload of the excerpt
4. On focus, preloads immediately (keyboard users)
5. Excerpt loads from manifest first (synchronous), falls back to API fetch

**Accessibility:**

- Touch target extends to 44x44px via `::before` pseudo-element (WCAG 2.5.5)
- `role="button"` with `tabindex="0"` for keyboard activation
- `<span class="sr-only">` provides screen reader context
- Focus ring visible on keyboard navigation (`:focus-visible`)
- Respects `prefers-reduced-motion` (disables transitions)

### WaystonePopup

The overlay component. Displays article excerpt in a glassmorphism modal.

**Import:** `import { WaystonePopup } from '@autumnsgrove/lattice/ui';`

**Source:** `libs/engine/src/lib/ui/components/ui/waystone/WaystonePopup.svelte`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` (bindable) | `false` | Whether the popup is visible |
| `excerpt` | `WaystoneExcerpt \| null` | required | Excerpt data to display |
| `fullArticleUrl` | `string` | required | URL to the full KB article |
| `loading` | `boolean` | `false` | Shows skeleton loading state |
| `error` | `string \| null` | `null` | Error message if fetch failed |
| `onclose` | `() => void` | `undefined` | Called when popup closes |

**Layout:**

```
┌─────────────────────────────────────────────────┐
│  ╭─────╮                                        │
│  │  ?  │  Article Title                    [×]  │
│  ╰─────╯  One-sentence description              │
├─────────────────────────────────────────────────┤
│                                                  │
│  First section of the article, rendered as       │
│  HTML from markdown. Scrollable if content       │
│  exceeds 70vh.                                   │
│                                                  │
├─────────────────────────────────────────────────┤
│  📖 3 min read              [Close] [Read full] │
└─────────────────────────────────────────────────┘
```

**States:** Loading (skeleton pulse), Error (fallback message + link), Content (rendered HTML), Empty (no content message).

**Positioning:** Centered in viewport on mobile. On desktop, offset 128px right to account for the Arbor sidebar (256px wide, offset is half).

### Types

**Source:** `libs/engine/src/lib/ui/components/ui/waystone/types.ts`

```typescript
interface WaystoneExcerpt {
  slug: string;           // URL-safe article identifier
  title: string;          // Article title from frontmatter
  description: string;    // One-sentence description
  firstSection: string;   // Intro content rendered as HTML
  readingTime: number;    // Full article reading time (minutes)
  hasMedia: boolean;      // Whether excerpt contains images
}

type WaystoneManifest = Record<string, WaystoneExcerpt>;

interface WaystoneCache {
  get(slug: string): WaystoneExcerpt | undefined;
  set(slug: string, excerpt: WaystoneExcerpt): void;
  has(slug: string): boolean;
}

function createWaystoneCache(): WaystoneCache;
```

---

## Excerpt API

**Endpoint:** `GET /api/kb/excerpt/[slug]`

**Source:** `apps/landing/src/routes/api/kb/excerpt/[slug]/+server.ts`

**Prerendered:** Yes. Built at deploy time, served as static JSON from Cloudflare Workers.

### Request

```
GET https://grove.place/api/kb/excerpt/custom-fonts
```

### Response (200)

```json
{
  "slug": "custom-fonts",
  "title": "Custom Fonts",
  "description": "Learn how to add custom fonts to your site.",
  "firstSection": "<p>You can upload custom fonts...</p>",
  "readingTime": 3,
  "hasMedia": false
}
```

**Headers:** `Cache-Control: public, max-age=86400, s-maxage=86400`

### Errors

| Status | Condition |
|--------|-----------|
| 400 | Slug contains `..` or `/` |
| 404 | Slug not in WAYSTONE_ARTICLE_SLUGS allowlist |
| 404 | Article file not found on disk |
| 500 | Markdown parsing failure |

### Excerpt Extraction

The API extracts the "first section" of an article: everything between the `# Title` heading and the first `## Section` heading. This gives the popup a natural introduction without overwhelming the reader.

Processing steps:

1. Parse frontmatter with `gray-matter`
2. Find content between first `#` and first `##`
3. Strip video embeds (`![video]...`)
4. Collapse excess whitespace
5. Render markdown to HTML with GroveTerm plugin
6. Calculate reading time (words / 200 WPM)
7. Detect images in excerpt

### Supported Slugs (31)

The API only serves excerpts for articles in the `WAYSTONE_ARTICLE_SLUGS` allowlist. Adding a new Waystone requires adding the slug to this array and rebuilding the landing site.

Current categories of supported slugs:

| Category | Slugs |
|----------|-------|
| Features | `what-is-rings`, `what-are-trails`, `what-is-journey`, `what-is-gallery`, `what-are-curios`, `what-is-pulse`, `what-is-hum`, `what-are-blazes` |
| Platform | `what-is-arbor`, `what-is-flow`, `what-is-sentinel`, `what-is-scribe`, `what-is-prism`, `what-is-heartwood`, `what-is-plant`, `what-is-greenhouse`, `what-is-amber`, `what-are-grafts`, `what-are-vines` |
| Content | `formatting-your-posts`, `using-curios-in-content` |
| Customization | `choosing-a-theme`, `custom-fonts` |
| Privacy & Data | `understanding-your-privacy`, `how-grove-protects-your-content`, `how-grove-protects-your-secrets`, `exporting-your-content`, `data-portability`, `account-deletion`, `sessions-and-cookies` |
| Auth | `what-are-passkeys` |
| Troubleshooting | `image-upload-failures` |

---

## Help Articles

**Location:** `docs/help-center/articles/` (100+ markdown files)

**Knowledge base UI:** `apps/landing/src/routes/knowledge/help/`

Articles use standard frontmatter:

```yaml
---
title: Custom Fonts
description: Learn how to add custom fonts to your site.
category: customization
section: appearance
order: 2
keywords: fonts, typography, custom, upload
lastUpdated: '2026-02-15'
---
```

The knowledge base renders at `/knowledge/help` on the landing site with category navigation, article cards, reading time, and SEO metadata. Individual articles render at `/knowledge/[category]/[slug]`.

---

## Active Waystone Instances

21 Waystones are deployed across 2 packages as of March 2026.

### By Package

| Package | Count | Locations |
|---------|-------|-----------|
| Engine (Arbor) | 19 | Admin pages, settings, curios editors, feature cards |
| Login | 2 | Passkey explanation, privacy notice |

### By Placement Type

| Placement | Description | Count |
|-----------|-------------|-------|
| `page-header` | Beside h1 titles on major admin pages | 4 |
| `section-header` | Beside h2 section titles within pages | 4 |
| `feature-card` | Inside feature showcase cards (FeaturesCard.svelte) | 5 |
| `inline-help` | Inline with text for contextual hints | 5 |
| `error-context` | Within error messages linking to troubleshooting | 1 |
| `panel-header` | In panel/control headers (GraftControlPanel) | 1 |
| `auth-context` | Near auth UI for trust building (login page) | 2 |

### Most-Used Slugs

| Slug | Instances | Where |
|------|-----------|-------|
| `using-curios-in-content` | 3 | New post, edit post, edit page editors |
| `what-is-rings` | 2 | Analytics page, features card |
| `what-are-trails` | 2 | Timeline page, features card |
| `what-are-curios` | 2 | Curios page, features card |
| `how-grove-protects-your-secrets` | 2 | Timeline curio (token + key sections) |

---

## Inventory Tracking

Waystone placement is tracked automatically to prevent drift between code and documentation.

**Inventory file:** `.github/waystone-inventory.json`

**GitHub Actions workflow:** `.github/workflows/waystone-inventory.yml`

### Triggers

| Trigger | When |
|---------|------|
| Pull request | Any PR touching `.svelte` files in `apps/` or `libs/` |
| Schedule | Thursday 9:00 AM UTC (weekly) |
| Manual | `workflow_dispatch` |

### What It Checks

1. Counts `<Waystone` component usage across all packages
2. Extracts `slug="..."` values from each instance
3. Compares against the inventory JSON
4. Reports per-package breakdown

### On Drift

- **PR runs:** Comments on the PR with a diff summary and affected files
- **Scheduled runs:** Creates a GitHub issue with remediation steps and CLI commands to update the inventory

---

## Security

### XSS Protection

WaystonePopup renders excerpt HTML via `{@html}`. Two layers of defense:

1. **Source:** MarkdownIt configured with `html: false` (no raw HTML passthrough)
2. **Render:** `sanitizeMarkdown()` wrapper applied before `{@html}` rendering

Even if the markdown parser configuration changes upstream, the sanitizer at the rendering boundary catches it.

### Input Validation

The excerpt API validates slugs against an explicit allowlist (`WAYSTONE_ARTICLE_SLUGS`). Path traversal attempts (`..`, `/`) are rejected with 400. Only allowlisted slugs return content.

### CSP Configuration

Consuming apps must allow fetch requests to `grove.place`:

```javascript
// svelte.config.js
"connect-src": ["self", "https://grove.place", "https://*.grove.place"]
```

The login app and engine both have this configured.

---

## CSS Dependencies

Waystone components use CSS custom properties from the engine's token system:

| Property | Used For |
|----------|----------|
| `--glass-bg` | Trigger background (glassmorphism) |
| `--color-surface` | Trigger fallback background |
| `--color-border` | Trigger border |
| `--color-text-muted` | Trigger default color |
| `--color-accent` | Hover/focus state |
| `--color-primary` | Focus ring |

All properties are defined in `libs/engine/src/lib/styles/tokens.css`. Consuming apps must load the engine's token system for Waystones to render correctly.

---

## Adding a New Waystone

To place a new Waystone in the admin panel:

1. **Write the article** in `docs/help-center/articles/[slug].md` with proper frontmatter
2. **Add the slug** to `WAYSTONE_ARTICLE_SLUGS` in `apps/landing/src/routes/api/kb/excerpt/[slug]/+server.ts`
3. **Place the component** in your Svelte template:
   ```svelte
   <Waystone slug="your-article-slug" label="Description for screen readers" />
   ```
4. **Update the inventory** in `.github/waystone-inventory.json` with the new instance
5. **Rebuild the landing site** so the excerpt endpoint gets prerendered

---

## Future Considerations

These are potential enhancements, not planned work.

| Feature | Notes |
|---------|-------|
| Client-side search | Index excerpts for search within popups. Could use the existing knowledge base search on the landing site |
| Feedback collection | "Was this helpful?" buttons in the popup. Could route to the Trace system with `help:article:[slug]` paths |
| Database-backed articles | Migrate from markdown files to D1 for dynamic publishing. Current file-based approach works well at this scale |
| Inline term markers | Auto-generate Waystones from `[[term\|label]]` patterns in article content |

---

## Related Specifications

| Spec | Relationship |
|------|-------------|
| [Lattice](lattice-spec.md) | Waystone is an engine UI component |
| [Arbor](arbor-spec.md) | Primary consumer (19 of 21 instances) |
| [Trace](trace-spec.md) | Potential feedback integration |
| [Gossamer](gossamer-spec.md) | Glassmorphism effects used in popup |

---

*Every path through the grove has a marker. You just have to look for it.*
