# GroveEngine Example Site

**The Midnight Bloom** - A demonstration site showcasing all GroveEngine features.

## Overview

This example site is a fictional late-night tea café called "The Midnight Bloom". It demonstrates:

- **Blog System** - 3 example posts with gutter annotations
- **Recipes** - Tea brewing guides with step-by-step instructions
- **Shop** - Product listings (coming soon functionality)
- **Gallery** - Image gallery with lightbox
- **Admin Panel** - CMS interface (demo mode, non-functional)
- **Theme System** - Dark/light mode with custom café theming

## Live Site

**URL:** https://example.grove.place
**Status:** ✅ Deployed and Active

The site is automatically deployed via GitHub Actions whenever changes are pushed to the `main` branch that affect `packages/example-site/` or `packages/engine/`.

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

### Automated Deployment

The site deploys automatically via GitHub Actions (`.github/workflows/deploy-example-site.yml`) when:
- Changes are pushed to the `main` branch
- Changes affect `packages/example-site/` or `packages/engine/`

You can also trigger a manual deployment from the GitHub Actions tab.

### Manual Deployment

If needed, you can deploy manually:

```bash
npm run build
npx wrangler pages deploy .svelte-kit/cloudflare --project-name=grove-example-site
```

### Shared Infrastructure

This site shares infrastructure with the main Grove platform:

- **KV Namespace:** grove-cache (514e91e81cc44d128a82ec6f668303e4)
- **R2 Bucket:** grove-media
- **D1 Database:** grove-engine-db (a6394da2-b7a6-48ce-b7fe-b1eb3e730e68)
- **Cloudflare Pages Project:** grove-example-site

## Features Demonstrated

### Content Features
- Markdown-based blog posts
- Gutter annotation system
- Table of contents generation
- Recipe pages with instructions
- Static pages (About, Contact)

### Shop Features (Stubs)
- Product listing page
- Product detail pages
- Shopping cart (UI only)
- Category filtering

### Admin Features (Demo UI)
- Dashboard with stats
- Blog post management
- Page management
- Media library
- Site settings

### UI/UX Features
- Responsive design
- Dark/light theme toggle
- Mobile navigation
- Search functionality
- Lightbox gallery

## Customization

The theme colors can be adjusted in `src/app.css`. The current theme uses:

- **Primary:** Deep Plum (#a85d7c) - like steeped black tea
- **Accent:** Golden Amber (#d4a037) - like honey
- **Background:** Deep night purple in dark mode

## File Structure

```
packages/example-site/
├── src/
│   ├── routes/           # SvelteKit pages
│   ├── lib/              # Utilities and components
│   └── app.css           # Theme and global styles
├── UserContent/          # Markdown content
│   ├── Posts/            # Blog posts with gutter content
│   ├── Recipes/          # Recipe pages
│   ├── Home/             # Homepage content
│   ├── About/            # About page
│   └── Contact/          # Contact page
├── static/               # Static assets
├── wrangler.toml         # Cloudflare configuration
└── package.json
```

## Adding Content

Blog posts and recipes use markdown with YAML frontmatter:

```yaml
---
title: Post Title
date: 2025-12-01
description: Brief description
tags:
  - tag1
  - tag2
---

Your markdown content here...
```

For gutter annotations, create a folder with the same name as your post:

```
Posts/
├── my-post.md
└── my-post/
    └── gutter/
        ├── manifest.json
        └── note.md
```
