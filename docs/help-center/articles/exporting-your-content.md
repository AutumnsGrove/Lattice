---
title: Exporting Your Content
description: How to export your blog content from Grove
category: help
section: writing-publishing
lastUpdated: '2025-12-01'
keywords:
  - export
  - download
  - backup
  - data
  - portability
  - markdown
  - json
  - leaving
  - migrate
order: 1
---

# Exporting Your Content

Everything you write on Grove belongs to you. Here's how to get a complete copy of your data.

## How to export

1. Go to **Account & Subscription** in your admin panel
2. Scroll to the **Your Data** section
3. Choose what to export:
   - **Full Export**: All posts, pages, and media metadata
   - **Posts Only**: Just your blog posts
   - **Media Only**: Just your uploaded file information
4. Click **Export Data**
5. Your browser downloads a JSON file

The page shows an estimate before you export: how many posts, pages, and media files will be included.

## What's in the export

Your download is a JSON file. We know JSON isn't the friendliest format for non-developers, and we're working on a better solution (see "What's coming" below). For now, here's what you get and how to use it.

**Posts** include the title, content (in Markdown), tags, status, and publication date.

**Pages** include any custom pages you've created.

**Media** is a list of your uploaded files with filenames, URLs, and sizes. You can visit each URL to download the actual file.

Example structure:
```json
{
  "exportedAt": "2026-01-15T12:00:00.000Z",
  "type": "full",
  "posts": [
    {
      "slug": "my-first-post",
      "title": "My First Post",
      "content": "# Hello world\n\nThis is my post content in Markdown...",
      "tags": ["intro", "personal"],
      "status": "published",
      "publishedAt": "2026-01-10T10:00:00.000Z"
    }
  ],
  "pages": [...],
  "media": [
    {
      "filename": "sunset.jpg",
      "url": "https://cdn.grove.place/...",
      "size": 245000,
      "mimeType": "image/jpeg"
    }
  ]
}
```

## Working with your export

**If you're comfortable with code:** The JSON structure is straightforward. Parse it with any programming language, extract the `content` field from each post (it's already Markdown), and you have portable files.

**If you're not a developer:** Open the JSON file in any text editor. Your post content is in the `"content"` fields, already in Markdown format. You can copy-paste this text into any other blogging platform or text editor. For images, copy each URL from the `"media"` section and paste it into your browser to download the file.

**Quick tip:** Search for `"content":` in the file to jump between your posts. Everything between the quotes after `"content":` is your actual writing.

We apologize for the extra steps. A proper export with organized folders and actual files is coming soon.

## Limits

**Rate limit**: 10 exports per hour. This prevents abuse while giving you plenty of room for regular use.

**Size limit**: 5,000 items per category (posts, pages, or media). If you have more than that, contact support for a bulk export.

## What's coming

We're building a better export system that will give you a proper ZIP file with:

- **Markdown files** for each post and page (not wrapped in JSON)
- **Actual image files** organized in folders (not just URLs)
- **A README** explaining the folder structure
- **Everything ready to use** without any technical knowledge

This will arrive with our [[amber|Amber]] update in the next feature season. Your exports will look like this:

```
grove-export-yourusername-2026-03-15.zip
├── posts/
│   ├── 2026-01-15-my-first-post.md
│   ├── 2026-02-20-another-post.md
│   └── ...
├── pages/
│   └── about.md
├── media/
│   ├── sunset.jpg
│   └── ...
└── README.txt
```

Until then, the JSON export has all your data. It's just not as friendly as we'd like.

## When you might want to export

**Regular backups.** Even though we back up your data, having your own copy is smart. Export every few months if it gives you peace of mind.

**Moving to another platform.** If Grove stops being the right fit, your export has everything you need. The content is Markdown, which works almost everywhere.

**Archiving.** If you're winding down a blog but want to keep the content, export gives you a permanent local copy.

## If you're leaving Grove

We believe your data should never be held hostage. When you cancel:

- Export remains available through your admin panel
- Your data stays available for 90 days after cancellation
- After 90 days, it's permanently deleted from our servers

No transfer fees. No artificial delays. No "pay to keep your data" schemes.

## What about my domain?

If you're on Evergreen with a domain included:

- The domain is registered in your name. You own it
- Request a transfer authorization code anytime
- We provide it within 48 hours
- No transfer fees from our side

Your domain goes where you go.

---

*Your content is yours. We mean that literally. Take it whenever you want.*
