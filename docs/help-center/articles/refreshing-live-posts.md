---
title: Refreshing Your Live Posts
description: How to make your edits visible immediately after updating a published post
category: help
section: writing-publishing
lastUpdated: '2026-11-13'
keywords:
  - refresh
  - cache
  - live
  - publish
  - update
  - edits
  - changes not showing
order: 8
---

# Refreshing Your Live Posts

When you edit a published post, the changes are saved immediately to your database. But visitors might not see the updates right away due to caching.

## Why caching exists

Grove caches your published posts at two levels to make your site fast:

1. **Application cache** (KV) - Stores processed content for 5 minutes
2. **CDN edge cache** - Cloudflare's global network holds your pages for up to 1 hour

This means your site loads in milliseconds for visitors worldwide. But it also means edits might not appear instantly.

## When to refresh

You'll want to refresh the live version when:

- You've fixed a typo or error in a published post
- You've updated important information that readers need to see now
- You've added or changed images
- You want to verify your edits look correct on the live site

**You don't need to refresh for:**

- Draft posts (they're not cached)
- Minor tweaks you're okay waiting an hour to appear
- Posts you're still actively editing

## How to refresh

After saving your changes to a published post:

1. Click the **⋯ More** menu in the editor toolbar
2. Choose **Refresh live version**
3. Wait a few seconds for the success message

That's it. Your changes are now live for all visitors.

## What happens behind the scenes

When you click "Refresh live version":

1. Grove clears the application cache for that post
2. Grove tells Cloudflare to purge the CDN cache for that URL
3. The next visitor triggers a fresh render with your latest content
4. That fresh version gets cached again

## Refresh vs. Re-publish

The More menu has two similar-sounding options:

**Refresh live version** - Clears caches so visitors see your latest edits. Doesn't change the post's published date or feed position.

**Re-publish (bump in feeds)** - Updates the published timestamp so the post appears fresh in RSS feeds. Doesn't clear caches.

Use "Refresh" when you want edits to show up. Use "Re-publish" when you want the post to climb back to the top of feeds.

## Troubleshooting

**"Changes still not showing after refresh"**

- Clear your browser cache or open an incognito window
- Some browsers aggressively cache - try a different device
- Wait 30-60 seconds and refresh the page

**"CDN cache purge unavailable"**

This message means the Cloudflare API credentials aren't configured on your site. The application cache is still cleared, so changes will appear within 5 minutes. Contact support if you need immediate CDN purging enabled.

---

*Edit confidently. Refresh when it matters.*
