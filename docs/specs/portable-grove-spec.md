---
aliases: []
date created: Sunday, February 22nd 2026
date modified: Sunday, February 22nd 2026
tags:
  - portability
  - export
  - static-site
  - decentralization
type: tech-spec
---

```
              ╭──────────────────────────────────╮
              │    📦 .grove                      │
              │    ╭────────────────────────╮     │
              │    │ manifest.json          │     │
              │    │ posts/                 │     │
              │    │ media/                 │     │
              │    │ theme/                 │     │
              │    │ ┌──────────────────┐   │     │
              │    │ │ 🌿 grove-shim/  │   │     │
              │    │ │   index.html    │   │     │
              │    │ │   reader.js     │   │     │
              │    │ │   styles.css    │   │     │
              │    │ └──────────────────┘   │     │
              │    ╰────────────────────────╯     │
              ╰──────────────────────────────────╯
                          │
                    unzip + deploy
                          │
                  ┌───────┴───────┐
                  │   anywhere    │
                  │  Netlify      │
                  │  Vercel       │
                  │  GitHub Pages │
                  │  your server  │
                  └───────────────┘

         Unzip it. Open it. Your grove lives on.
```

> _Unzip it. Open it. Your grove lives on._

# Portable Grove: Deployable Static Exports

> _Unzip it. Open it. Your grove lives on._

Portable Grove extends the `.grove` file format with a deployable HTML shim. Unzip a `.grove` file, drop it on any static host, and your blog works. No build step. No server. No Grove account required. The shim reads the Markdown files and renders them in the browser, exactly like the original autumnsgrove.com worked before Grove existed.

**Public Name:** Portable Grove
**Internal Name:** GrovePortable
**Extends:** `.grove` file format (`@autumnsgrove/grove-format`)
**Location:** `libs/grove-format/src/portable/`
**Last Updated:** February 2026

A seed carries everything it needs to grow. Soil, sunlight, water come from wherever it lands. The Portable Grove is a seed: the content, the theme, the reader. Plant it on Netlify, Vercel, GitHub Pages, a Raspberry Pi in your closet. It grows wherever it lands.

---

## Overview

### What This Is

An extension to the existing `.grove` export format that includes a lightweight HTML/JavaScript reader (the "shim") alongside the content. When the export is unzipped and served as static files, the shim dynamically renders the Markdown content into a fully functional blog. No build process, no server-side rendering, no dependencies.

### Goals

- A `.grove` export that works as a website when unzipped and served
- Zero build step. Unzip and deploy.
- Works on any static hosting: Netlify, Vercel, GitHub Pages, S3, file:// protocol
- Preserves the Wanderer's theme, typography, and layout
- Readable offline (file:// in a browser)
- Falls back gracefully without JavaScript (raw Markdown files are still readable)

### Non-Goals (Out of Scope)

- Server-side rendering or dynamic features (comments, analytics, Meadow)
- Full feature parity with the hosted Grove experience
- Progressive web app capabilities
- Search functionality (future enhancement)
- Interactive features like Curios

---

## Architecture

### How It Works

```
.grove file (ZIP)
    │
    ├── manifest.json          ← existing format
    ├── content-index.json     ← existing format
    ├── posts/                 ← existing Markdown files
    ├── pages/                 ← existing Markdown files
    ├── media/                 ← existing images, fonts
    ├── theme/                 ← existing theme data
    │
    └── grove-shim/            ← NEW: the portable reader
        ├── index.html         ← entry point
        ├── reader.js          ← Markdown renderer + router
        └── styles.css         ← base styles + theme injection
```

When served statically:

```
Browser requests /
    │
    ▼
grove-shim/index.html loads
    │
    ▼
reader.js initializes
    │
    ├── Reads manifest.json (site metadata)
    ├── Reads content-index.json (post list)
    ├── Reads theme/ (colors, fonts, layout)
    │
    ▼
Renders post listing page
    │
    User clicks a post
    │
    ▼
reader.js fetches posts/{slug}.md
    │
    ▼
Parses YAML frontmatter + Markdown → HTML
    │
    ▼
Renders post with theme styles
```

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Renderer | Vanilla JavaScript | No build step, no framework dependency |
| Markdown | marked.js (bundled) | Small, fast, well-tested |
| Frontmatter | gray-matter (minimal port) | Parse YAML from Markdown files |
| Routing | Hash-based (#/post/slug) | Works on file:// protocol |
| Styles | CSS custom properties | Theme values injected at runtime |

---

## The Shim

### index.html

The entry point. A single HTML file that loads the reader and provides the shell.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Loading...</title>
  <link rel="stylesheet" href="grove-shim/styles.css">
</head>
<body>
  <noscript>
    <h1>This grove requires JavaScript to render.</h1>
    <p>You can still read the raw Markdown files in the posts/ directory.</p>
    <p><a href="content-index.json">View content index</a></p>
  </noscript>

  <div id="grove-root"></div>

  <footer id="grove-footer">
    <p>
      Exported from <a href="https://grove.place">Grove</a> ·
      <a href="https://grove.place/open">What is a .grove file?</a>
    </p>
  </footer>

  <script src="grove-shim/reader.js"></script>
</body>
</html>
```

### reader.js

The core reader. Under 15KB minified. Handles:

1. **Manifest loading** — Read site title, description, author info
2. **Content index** — Build post/page listing from `content-index.json`
3. **Markdown rendering** — Parse frontmatter, convert Markdown to HTML
4. **Hash routing** — `#/` (home), `#/post/{slug}`, `#/page/{slug}`, `#/tag/{tag}`
5. **Theme injection** — Read theme data, set CSS custom properties
6. **Media resolution** — Rewrite image paths to relative `../media/` references

```typescript
// Conceptual structure (ships as bundled vanilla JS)

class GroveReader {
  private manifest: GroveManifest;
  private contentIndex: ContentIndex;
  private theme: ThemeData;

  async init(): Promise<void> {
    this.manifest = await this.loadJson("manifest.json");
    this.contentIndex = await this.loadJson("content-index.json");
    this.theme = await this.loadTheme();

    document.title = this.manifest.grove.displayName;
    this.applyTheme();
    this.setupRouter();
    this.navigate(window.location.hash || "#/");
  }

  private applyTheme(): void {
    const root = document.documentElement;
    root.style.setProperty("--grove-bg", this.theme.colors.background);
    root.style.setProperty("--grove-text", this.theme.colors.text);
    root.style.setProperty("--grove-accent", this.theme.colors.accent);
    root.style.setProperty("--grove-font-body", this.theme.fonts.body);
    root.style.setProperty("--grove-font-heading", this.theme.fonts.heading);
    // ... more theme properties
  }

  private async renderPost(slug: string): Promise<void> {
    const markdown = await this.loadFile(`posts/${slug}.md`);
    const { frontmatter, content } = this.parseFrontmatter(markdown);
    const html = this.renderMarkdown(content);

    this.root.innerHTML = `
      <article class="grove-post">
        <h1>${frontmatter.title}</h1>
        <time>${this.formatDate(frontmatter.published_at)}</time>
        <div class="grove-content">${html}</div>
      </article>
      <nav class="grove-nav">
        <a href="#/">← Back to all posts</a>
      </nav>
    `;
  }

  private async renderIndex(): Promise<void> {
    const posts = this.contentIndex.posts
      .filter(p => p.status === "published")
      .sort((a, b) => b.published_at - a.published_at);

    this.root.innerHTML = `
      <header class="grove-header">
        <h1>${this.manifest.grove.displayName}</h1>
      </header>
      <main class="grove-post-list">
        ${posts.map(p => `
          <article class="grove-post-card">
            <a href="#/post/${p.slug}">
              <h2>${p.title}</h2>
              <time>${this.formatDate(p.published_at)}</time>
              ${p.description ? `<p>${p.description}</p>` : ""}
            </a>
          </article>
        `).join("")}
      </main>
    `;
  }
}

// Initialize
const reader = new GroveReader();
reader.init();
```

### styles.css

Base styles that use CSS custom properties for theming. The reader injects theme values at runtime.

```css
:root {
  /* Defaults (overridden by theme data) */
  --grove-bg: #faf9f6;
  --grove-text: #2d2d2d;
  --grove-accent: #4a7c59;
  --grove-font-body: Georgia, serif;
  --grove-font-heading: system-ui, sans-serif;
  --grove-max-width: 680px;
  --grove-line-height: 1.7;
}

body {
  font-family: var(--grove-font-body);
  color: var(--grove-text);
  background: var(--grove-bg);
  line-height: var(--grove-line-height);
  max-width: var(--grove-max-width);
  margin: 0 auto;
  padding: 2rem 1rem;
}

/* ... post styles, navigation, responsive design */
```

---

## Export Flow

### Adding the Shim to Exports

The shim gets bundled into `.grove` exports when the Wanderer selects "Portable export" (vs. standard export).

```
Export Options:
    │
    ├── Standard export (.grove)
    │     Posts, media, theme. For import into another Grove.
    │
    └── Portable export (.grove + shim)
          Everything above, plus the reader shim.
          Deployable as a static website.
```

### Manifest Extension

The manifest gains a `portable` field when the shim is included:

```json
{
  "format": "grove",
  "formatVersion": "1.1.0",
  "grove": {
    "subdomain": "autumn",
    "displayName": "Autumn's Grove"
  },
  "portable": {
    "shimVersion": "1.0.0",
    "entryPoint": "grove-shim/index.html",
    "features": ["markdown-rendering", "theme-injection", "hash-routing"],
    "offlineCapable": true
  },
  "contents": { ... },
  "checksums": { ... }
}
```

### Deployment Instructions

The export includes a `DEPLOY.md` file in the root:

```markdown
# Deploying Your Grove

You exported your grove as a portable website. Here's how to put it online.

## Quick Start

1. Unzip this file
2. Upload the contents to any static host
3. Done. Your blog is live.

## Hosting Options

### Netlify (free)
1. Go to netlify.com and sign up
2. Drag the unzipped folder onto the Netlify dashboard
3. Your site is live at a .netlify.app URL

### Vercel (free)
1. Go to vercel.com and sign up
2. Import the unzipped folder
3. Your site is live at a .vercel.app URL

### GitHub Pages (free)
1. Create a new GitHub repository
2. Push the unzipped contents to the repo
3. Enable GitHub Pages in settings
4. Your site is live at username.github.io/repo

### Any Web Server
Upload the contents to your server's web root. That's it.

### Local Preview
Open grove-shim/index.html in your browser. It works offline.
```

---

## Origin Story Integration

This feature connects directly to Grove's origin. Before Grove was a platform, autumnsgrove.com was a static site with Markdown files that a small JavaScript reader rendered in the browser. Portable Grove brings that full circle: even if Grove as a platform ceases to exist, every Wanderer's content can return to that original form.

```
2024: autumnsgrove.com            2026: Portable Grove
  Markdown files                    .grove export
  + tiny JS reader                  + grove-shim/
  = working blog                    = working blog

  Same idea. Better execution.
```

---

## Compatibility with grove.place/open

The existing `grove.place/open` viewer (specified in the file-formats spec) is a web-based tool for browsing `.grove` files. The Portable Grove shim is different: it ships inside the export itself. But they share the same rendering logic.

```
grove.place/open              Portable Grove shim
    │                              │
    │  Hosted viewer              │  Bundled reader
    │  User uploads .grove file   │  Lives inside .grove file
    │  Runs on grove.place        │  Runs on any static host
    │                              │
    └──────────┬───────────────────┘
               │
        Same rendering core:
        Markdown → HTML, theme injection,
        frontmatter parsing
```

The rendering logic lives in `@autumnsgrove/grove-format` and gets compiled into both targets.

---

## Content Signing in Portable Exports

When content signing is enabled (see content-signing-spec), the Portable Grove shim can display verification status:

```
┌─────────────────────────────────────────────────────────────┐
│  Hello World                                                 │
│  ─────────────────────────────────────────────               │
│  February 22, 2026 · 5 min read                             │
│                                                              │
│  [Post content...]                                           │
│                                                              │
│  ─────────────────────────────────────────────               │
│  ✓ Signed · Human · Exported from autumn.grove.place         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

The signature data from `content-index.json` lets the shim display the authorship badge without needing network access.

---

## Limitations

Things the Portable Grove deliberately does not do:

| Feature | Hosted Grove | Portable Grove |
|---------|-------------|---------------|
| Comments | Yes | No |
| Analytics | Vista | No |
| RSS feed | Yes | No (static file listing only) |
| Search | Yes | No |
| Meadow (social) | Yes | No |
| Curios (interactive) | Yes | No |
| Custom domain | Yes | Yes (depends on host) |
| Themes | Full | Colors + fonts only |
| Media | Full processing | Raw files |
| AI protection | Shade (8 layers) | None (it's static) |

The Portable Grove is a read-only snapshot. It's the fire escape, not the penthouse.

---

## Security Considerations

- **No server-side code.** The shim is pure client-side JavaScript. No XSS vectors from server rendering.
- **Markdown sanitization.** The Markdown renderer strips `<script>` tags and dangerous HTML. Only safe HTML subset allowed.
- **Relative paths only.** All asset references use relative paths. No hardcoded URLs to grove.place or external services.
- **No tracking.** The shim includes no analytics, no external requests, no phone-home behavior.
- **Content-Security-Policy.** The index.html includes a strict CSP that blocks inline scripts and external resource loading.

---

## Implementation Checklist

### Phase 1: Shim Development (Week 1-2)

- [ ] Build `reader.js` with Markdown rendering (marked.js bundle)
- [ ] Implement hash-based routing (#/, #/post/slug, #/page/slug)
- [ ] Implement theme injection via CSS custom properties
- [ ] Implement frontmatter parsing (YAML subset)
- [ ] Build `styles.css` with responsive base styles
- [ ] Create `index.html` with noscript fallback
- [ ] Target: under 15KB minified for reader.js

### Phase 2: Export Integration (Week 2-3)

- [ ] Add "Portable export" option to Amber export flow
- [ ] Bundle shim files into `.grove` ZIP when selected
- [ ] Extend manifest with `portable` field
- [ ] Generate `DEPLOY.md` with hosting instructions
- [ ] Update `grove-format` package types

### Phase 3: Shared Rendering Core (Week 3)

- [ ] Extract shared rendering logic from `grove.place/open`
- [ ] Compile rendering core into both shim and viewer targets
- [ ] Ensure visual parity between hosted Grove and portable export

### Phase 4: Testing (Week 3-4)

- [ ] Test on Netlify, Vercel, GitHub Pages
- [ ] Test offline via file:// protocol
- [ ] Test with various themes (light, dark, custom fonts)
- [ ] Test with large exports (100+ posts, 500MB+ media)
- [ ] Accessibility audit of rendered output

### Phase 5: Content Signing Integration (Week 4)

- [ ] Display signature badges in portable exports
- [ ] Include public key in export for offline verification
- [ ] Show authorship type (Human / AI-Assisted)

---

*Unzip it. Open it. Your grove lives on.*
