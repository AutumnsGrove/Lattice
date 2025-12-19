---
title: "Your RSS Feed"
slug: your-rss-feed
category: writing
order: 7
keywords: [rss, feed, subscribe, readers, syndication, atom, feedly, rss reader]
related: [what-is-grove, writing-your-first-post]
---

# Your RSS Feed

Your blog has an RSS feed. Here's how to share it and why it matters.

## What's RSS?

RSS (Really Simple Syndication) lets people subscribe to your blog in a feed reader—apps like Feedly, NetNewsWire, or even Apple News. When you publish something new, it shows up for them automatically. No algorithms deciding who sees what, no social media gatekeeping. They asked for your posts, they get your posts.

## Finding your feed URL

Your feed lives at:

```
yourblog.grove.place/api/feed
```

Or if you're using a custom domain:

```
yourdomain.com/api/feed
```

That's it. Share that link with anyone who wants to subscribe.

## What's included in your feed

Each entry contains:

- **Title** — Your post's title
- **Link** — Direct URL to the full post
- **Publication date** — When you published it
- **Excerpt** — The post description (or first part of content if you didn't set one)
- **Tags** — Any tags you've added, as categories

Your feed includes all your published posts, newest first. Drafts don't appear until you publish them.

## Sharing your feed

A few ways to let readers know:

**Add it to your sidebar or about page.** A simple "Subscribe via RSS" link works. Most feed readers can auto-discover your feed from your blog URL, but making it visible helps readers who don't know to look.

**Include it in your social bios.** If you're on Mastodon, Bluesky, or anywhere else, your RSS link is a good one to share.

**Mention it in posts.** When you write something you think people will want to follow up on, remind them they can subscribe.

## Feed readers your subscribers might use

If someone asks "how do I subscribe?"—here are solid options:

- **Feedly** — Popular, works on web and mobile
- **NetNewsWire** — Free, Mac and iOS, clean interface
- **Inoreader** — Powerful, good free tier
- **Feedbin** — Paid, privacy-focused
- **Apple News** — Built into Apple devices, supports RSS

There are dozens more. Any RSS reader will work with your Grove feed.

## Technical details

For the curious:

- **Format:** RSS 2.0 (standard, widely compatible)
- **Caching:** Feed updates within an hour of publishing
- **Encoding:** Proper XML escaping, handles special characters correctly

Your feed URL also works if someone enters just your blog URL into their reader—most will auto-discover the feed.

---

*RSS is one of the good parts of the old web. It still works, and Grove supports it by default.*
