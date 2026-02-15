---
title: Using Curios in Your Content
description: Every curio directive you can embed in your posts and pages, with examples
category: help
section: how-it-works
lastUpdated: "2026-02-14"
keywords:
  - curios
  - directives
  - embed
  - markdown
  - guestbook
  - hitcounter
  - nowplaying
  - polls
  - moodring
  - badges
  - blogroll
  - webring
  - linkgarden
  - bookmarkshelf
  - activitystatus
  - artifacts
  - shrines
  - statusbadge
order: 22
---

# Using Curios in Your Content

Drop curios into any post or page with `::name::` in your markdown. They turn into live, interactive widgets when visitors see your page.

Configure each curio in **Admin → Curios** first, then embed it wherever you'd like. Some curios accept an argument in brackets — like `::poll[my-poll-id]::` — but most need nothing extra.

## Guestbook

```
::guestbook::
```

Displays your guestbook inline. Visitors can sign it right on the page — leave a name, a message, maybe a little drawing. The classic personal web tradition, alive in your content.

## Hit Counter

```
::hitcounter::
```

A nostalgic page view counter that ticks up with each visit. Customize the style in your curio settings — retro digits, minimal text, or something in between.

## Now Playing

```
::nowplaying::
```

Shows what you're listening to, complete with album art and track details. Connect your music service in curio settings and it updates automatically.

## Polls

```
::poll[your-poll-id]::
```

Embed a specific poll by its ID. Create polls in **Admin → Curios → Polls**, then drop them into posts to ask your visitors anything. Each poll gets its own ID you can reference.

## Mood Ring

```
::moodring::
```

A color that shifts with your mood, the time of day, or the season. Set it manually or let it drift on its own — a tiny emotional barometer right in your content.

## Badges

```
::badges::
```

Shows your earned and showcased badges. The digital equivalent of pins on a jacket — achievements, community recognition, and custom badges you've created.

## Activity Status

```
::activitystatus::
```

A little line that says what you're up to right now. "Writing." "Having tea." "Night owl mode." Set it from presets or write your own.

## Blogroll

```
::blogroll::
```

Your list of blogs and sites you read and admire, displayed inline. The old web tradition of linking to your friends and favorite writers.

## Webring

```
::webring::
```

Navigation links for webrings you belong to — previous, next, hub. The original decentralized discovery network, embedded right in your page.

## Link Garden

```
::linkgarden::
```

Curated collections of links organized into beds. A tended garden of places you love, displayed wherever you want it.

## Bookmark Shelf

```
::bookmarkshelf::
```

Your reading list as a visual shelf — titles, authors, cover images, "currently reading" and "favorite" markers. A cozy bookcase in your content.

## Artifacts

```
::artifacts::
```

Interactive curiosities — fortune cookies, magic 8-balls, little moments of serendipity. Each visit might show something different.

## Shrines

```
::shrines::
```

Dedicated spaces for things you love — a favorite album, a beloved game, a character who means something to you. Images, captions, and a little altar right in your post.

## Status Badge

```
::statusbadge::
```

A site status indicator showing whether things are up, down, or under maintenance. Visitors see what's happening at a glance.

## Tips

- **Configure first, embed second.** Each curio needs to be set up in Admin → Curios before the directive will render anything.
- **Polls need an ID.** Polls use `::poll[your-poll-id]::` because you can have multiple. Find the ID on the poll's admin page. Other curios that accept an argument (like `::webring[ring-name]::`) work fine without one too.
- **Site-wide curios** like custom cursors and ambient sounds don't use directives — they wrap around your whole site automatically once enabled.
- **Dark mode ready.** All embedded curios adapt to your visitor's theme preference.

## Related

- [[curios|What are Curios?]] — The full overview of the curio system
- [[the-markdown-editor|The Markdown Editor]] — Where you write and embed curios
- [[formatting-your-posts|Formatting Your Posts]] — Other markdown features
