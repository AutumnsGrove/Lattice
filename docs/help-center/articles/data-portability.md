---
title: "Data Portability"
slug: data-portability
category: data
order: 2
keywords: [export, migrate, move, transfer, wordpress, ghost, hugo, markdown, portable, leaving, import]
related: [exporting-your-content, account-deletion, understanding-your-privacy]
---

# Data Portability

Your content belongs to you. Not just philosophically—practically. Here's what you can do with your exported Grove data.

## What you get when you export

Grove exports your data as a JSON file containing:

- **Posts** — Title, content (in Markdown), tags, status, dates
- **Pages** — Any custom pages you've created
- **Media** — Filenames, URLs, and metadata (the actual files are accessible via their URLs)

The content itself is Markdown, which works everywhere. The JSON wrapper makes it easy to parse and transform into other formats.

## Moving to another platform

### WordPress

WordPress can import Markdown, though you'll need to convert from Grove's JSON format:

1. Parse the JSON export to extract your posts
2. Each post's `content` field is already Markdown
3. Use a Markdown import plugin (like "WP All Import"), or paste into the block editor

For smaller blogs, copy-pasting from the JSON file works fine. The Markdown content is right there in plain text.

### Ghost

Ghost uses Markdown natively and expects JSON imports:

1. Parse your Grove export
2. Transform it to Ghost's import format (similar structure, different field names)
3. Import via **Settings → Import/Export** in Ghost admin

A simple script can handle the conversion. The data shapes are similar.

### Hugo, Jekyll, and other static site generators

Static generators expect Markdown files with frontmatter. To migrate:

1. Parse your Grove JSON export
2. Write each post as a separate `.md` file with YAML frontmatter
3. Download your images from their URLs
4. Build and deploy

A few lines of script can automate the conversion.

### Self-hosted solutions

The Markdown content in your export works anywhere. Parse the JSON, grab the `content` field from each post, and you have plain text Markdown that opens in any editor.

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

*For the technical details of Grove's export format, see [Exporting Your Content](/knowledge/help/exporting-your-content).*
