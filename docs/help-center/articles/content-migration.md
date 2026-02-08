---
title: Bringing Your Content to Grove
description: How to move your existing blog content into Grove from another platform
category: help
section: getting-started
lastUpdated: '2026-02-08'
slug: content-migration
order: 6
keywords:
  - migrate
  - migration
  - import
  - move
  - transfer
  - WordPress
  - Ghost
  - Medium
  - Tumblr
  - copy
  - paste
  - markdown
  - switch
related:
  - writing-your-first-post
  - the-markdown-editor
  - adding-images-and-media
  - data-portability
---

# Bringing Your Content to Grove

If you're moving to Grove from another blogging platform, here's an honest look at what the migration process involves right now.

## The short version

Grove doesn't have an automated import tool yet. Moving your content means copying your text into Grove's editor and re-uploading your images manually. It's not glamorous, but it works—and your writing will look great once it's here.

## What transfers cleanly

**Your text.** This is the good news. Grove's editor uses Markdown, which is the closest thing the internet has to a universal writing format. If your old platform stored content in Markdown (Ghost, Hugo, Jekyll, many static site generators), you can paste it directly into Grove's editor and it should look right immediately.

**Your images.** Download them from your old platform, then upload them to Grove through the editor. Drag-and-drop works. The supported formats are JPEG, PNG, GIF, WebP, AVIF, JPEG XL, and HEIC—so most image files will work as-is.

## What needs manual adjustment

**WordPress content.** WordPress stores posts as HTML, not Markdown. The text itself copies fine, but you'll lose some formatting—things like custom layouts, shortcodes, and embedded widgets won't carry over. For most posts, copying the text from your WordPress editor and pasting it into Grove's Markdown editor works well enough. You may need to re-add bold, italic, headers, and links using Markdown syntax.

**Medium posts.** Medium lets you export your archive as HTML files. The text content copies over, but Medium-specific formatting (pull quotes, embedded tweets, section dividers) won't translate. Paste the plain text and reformat in Grove's editor.

**Tumblr posts.** Similar story—copy the text, re-upload images, reformat as needed. Short-form posts are quick to migrate. Image-heavy posts take longer because each image needs to be saved and re-uploaded.

**Embedded content.** If your posts embed YouTube videos, tweets, or other third-party content, you'll need to re-embed those manually. Copy the embed URL and paste it into your Grove post.

## Step by step

Here's a practical workflow for migrating a blog:

### 1. Export from your old platform

Most platforms have an export feature somewhere in their settings. Get a copy of all your content before you start. This is your backup—even if something goes wrong, your writing is safe.

- **WordPress:** **Tools → Export → All Content**
- **Ghost:** **Settings → Import/Export → Export**
- **Medium:** **Settings → Security and apps → Download your information**
- **Tumblr:** **Settings → [Blog name] → Export**

### 2. Start with your most important posts

Don't try to migrate everything at once. Pick your 5-10 best or most important posts and start there. This lets you get comfortable with the process before committing to the full catalog.

### 3. Copy text into Grove's editor

Open your old post and Grove's editor side by side.

- If your content is Markdown, paste it directly into Grove's source editor
- If it's HTML or rich text, paste the plain text and reformat using Markdown

Grove's editor supports standard Markdown: headings, bold, italic, links, lists, code blocks, blockquotes, and tables. If you used it on another platform, it works the same here.

### 4. Re-upload images

For each post, download the images from your old platform and upload them to Grove. The editor supports drag-and-drop—just pull the images in where they belong.

> **Tip:** Work through one post completely before moving to the next. It's easier to stay organized that way.

### 5. Set your metadata

For each migrated post, add:

- A title (which you'll already have)
- Tags, if you used them on the old platform
- A publication date, if you want to preserve the original

Save as a draft first, review it, then publish when you're satisfied.

## Markdown compatibility

Grove uses standard Markdown with a few extras. Here's what's supported:

- **Headings** (`# H1` through `###### H6`)
- **Bold** (`**text**`) and *italic* (`*text*`)
- **Links** (`[text](url)`)
- **Images** (`![alt text](url)`)
- **Lists** (bulleted and numbered)
- **Blockquotes** (`> text`)
- **Code blocks** (fenced with triple backticks, syntax highlighting included)
- **Tables** (GitHub-flavored Markdown style)
- **HTML** (basic tags work if you need them)

If your old platform used standard Markdown, it should paste in cleanly with no changes.

## What doesn't transfer

To be upfront about the limitations:

- **Comments and reactions** — These live on your old platform and can't be moved
- **Analytics and view counts** — These don't carry over
- **SEO history** — Search engine rankings are tied to your old URLs, not your content. They'll rebuild over time at your new Grove address
- **Platform-specific features** — WordPress plugins, Ghost members, Medium claps—anything unique to a platform stays there
- **Subscriber lists** — If people followed your old blog, you'll need to let them know your new address

## What's coming

We know manual migration isn't ideal. We're working on better tools:

- **Markdown file import** — Upload `.md` files directly
- **WordPress XML import** — Parse a WordPress export and create posts automatically
- **Batch image upload** — Upload multiple images at once

These aren't available yet, and we don't have a specific timeline. For now, the manual process is what we have. We'd rather be honest about that than promise something we can't deliver yet.

## A few encouraging words

Migrating a blog is tedious. There's no way around that. But there's also something nice about revisiting your old writing—you'll probably find posts you forgot about, posts you're still proud of, and posts that make you cringe. That's a blog well lived.

Take it at your own pace. There's no deadline, and your old platform isn't going anywhere while you work through it.

---

*Moving is never fun, but you'll be settled in before you know it. If you get stuck, [we're here](/contact).*
