---
title: Data Portability
description: 'Taking your Grove content to WordPress, Ghost, Hugo, or anywhere else'
category: help
section: privacy-security
lastUpdated: '2026-01-03'
keywords:
  - export
  - migrate
  - move
  - transfer
  - wordpress
  - ghost
  - hugo
  - markdown
  - portable
  - leaving
  - import
order: 2
---

# Data Portability

Your content belongs to you. Not just philosophically—practically. Here's what you can do with your exported Grove data.

## Current export format

Right now, Grove exports your data as a JSON file containing:

- **Posts** — Title, content (in Markdown), tags, status, dates
- **Pages** — Any custom pages you've created
- **Media** — Filenames, URLs, and metadata (visit the URLs to download files)

The post and page content is already in Markdown, which works everywhere. The JSON wrapper is temporary—we're building a friendlier format (see below).

## Moving to another platform

### WordPress

1. Open your Grove export in a text editor
2. Find each post's `"content"` field—that's your Markdown
3. Copy-paste into the WordPress editor, or use a Markdown plugin

For larger blogs, a simple script can parse the JSON and create individual files. The structure is straightforward.

### Ghost

Ghost uses Markdown natively:

1. Parse your Grove export JSON
2. Transform to Ghost's import format (similar structure, different field names)
3. Import via **Settings → Import/Export** in Ghost admin

The data shapes are similar. A few lines of code handles the conversion.

### Hugo, Jekyll, and other static site generators

Static generators expect Markdown files with frontmatter. To migrate:

1. Parse your Grove JSON export
2. Write each post as a separate `.md` file with YAML frontmatter
3. Download your images from their URLs in the export
4. Build and deploy

### Self-hosted solutions

The Markdown content in your export works anywhere. Parse the JSON, grab the `content` field from each post, and you have plain text that opens in any editor.

## What's coming

We're building a proper export system with our Amber update:

- **ZIP file** with organized folders (not JSON)
- **Markdown files** for each post and page
- **Actual media files** included (not just URLs)
- **README** explaining everything

No parsing required. Download, unzip, and your content is ready to use anywhere.

This arrives in the next feature season.

## Your domain comes with you

If you registered a domain through Grove (Evergreen tier), you own it. Not Grove.

When you leave:
- Request a transfer authorization code
- We provide it within 48 hours
- Transfer to any registrar you choose
- No fees from our side

Your domain was always yours. We just helped you find and register it.

## The 90-day window

After you cancel:
- Your content stays accessible for 90 days
- You can export anytime during this period
- After 90 days, content is permanently deleted

This isn't a threat, it's a promise. We don't keep data we don't need. But you have three months to make sure you have everything.

## No lock-in, period

Some platforms make leaving hard. Export fees. Proprietary formats. "Contact sales to discuss migration."

Grove's approach:
- Export is free, always
- Formats are standard, always
- No artificial delays
- No "pay to keep your data" schemes

If you want to leave, take your words and go. We'd rather you left happy than stayed trapped.

---

*For step-by-step export instructions, see [Exporting Your Content](/knowledge/help/exporting-your-content).*
