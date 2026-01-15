---
title: "Exporting Your Content"
slug: exporting-your-content
category: data
order: 1
keywords: [export, download, backup, data, portability, markdown, json, leaving, migrate]
related: [understanding-your-privacy, account-deletion]
---

# Exporting Your Content

Everything you write on Grove belongs to you. Here's how to get a complete copy of your data.

## How to export

1. Go to **Account & Subscription** in your admin panel
2. Scroll to the **Your Data** section
3. Choose what to export:
   - **Full Export**: All posts, pages, images, and settings
   - **Posts Only**: Just your blog posts
   - **Media Only**: Just your uploaded images and files
4. Click **Export Data**
5. Your browser downloads a JSON file

The page shows an estimate before you export: how many posts, pages, and media files will be included.

## What's in the export

Your download is a JSON file containing:

**Posts** include the title, content (in Markdown), tags, status, publication date, and featured image URL.

**Pages** include any custom pages you've created.

**Media** is a list of your uploaded files with filenames, URLs, sizes, and alt text. The actual image files aren't bundled, but the URLs let you download them.

Example structure:
```json
{
  "exportedAt": "2026-01-15T12:00:00.000Z",
  "type": "full",
  "posts": [
    {
      "slug": "my-first-post",
      "title": "My First Post",
      "content": "# Hello world...",
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

## Limits

**Rate limit**: 10 exports per hour. This prevents abuse while giving you plenty of room for regular use.

**Size limit**: 5,000 items per category (posts, pages, or media). If you have more than that, contact support for a bulk export.

## When you might want to export

**Regular backups.** Even though we back up your data, having your own copy is smart. Export every few months if it gives you peace of mind.

**Moving to another platform.** If Grove stops being the right fit, your export has everything you need. The JSON format is easy to parse, and your post content is already in Markdown.

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
