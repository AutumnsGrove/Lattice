---
title: What is Hum?
description: Music link previews that transform bare URLs into beautiful, informative cards
category: help
section: writing-publishing
lastUpdated: '2026-02-08'
keywords:
  - hum
  - music
  - link preview
  - spotify
  - apple music
  - youtube music
  - soundcloud
  - embed
  - music widget
order: 20
---

# What is Hum?

Hum turns music links into something you can actually see.

## The short version

Paste a Spotify, Apple Music, YouTube Music, or SoundCloud link into a [[blooms|bloom]], and it transforms into a warm little card showing the album art, track name, and artist. No embed. No iframe. Just a beautiful glass card that feels like part of your grove.

## Why "hum"?

A hum is the sound a forest makes when everything's alive. Bees in the undergrowth, wind through leaves, the low vibration of a living place. It's also what people do without thinking — you hear a song, and hours later you're humming it in the kitchen.

Hum is the ambient music layer in your writing. It doesn't demand attention. It doesn't autoplay. It just sits there, warm and inviting, saying *here's what I was listening to when I wrote this*.

## How it works

Write a [[blooms|bloom]] in [[flow|Flow]]. On its own line, paste a music link:

```
https://open.spotify.com/track/75FEaRjZTKLhTrFGsfMUXR
```

When you publish, that bare URL becomes a Hum card — a glassmorphism preview with the album artwork, track title, artist name, and the streaming service badge. Click the card to open the song. Click the badge to see it on other platforms.

That's it. No configuration. No embed codes. Just paste and go.

## What links work?

Hum currently recognizes links from:

- **Apple Music** — albums, tracks, playlists, artists
- **Spotify** — tracks, albums, playlists, artists, episodes, shows
- **YouTube Music** — videos, playlists
- **SoundCloud** — tracks, sets

Coming soon: Tidal, Deezer, Bandcamp, Amazon Music.

## What about links with custom text?

If you write a markdown link with your own text — like `[my favorite song](spotify-url)` — Hum leaves it alone. It only transforms bare URLs on their own line. Your words, your choice.

## Cross-platform links

When Hum resolves a track, it finds the same song on other streaming services automatically. A small platform tray appears when you click the provider badge, so your readers can listen wherever they prefer. Share a Spotify link, and someone on Apple Music can still find the song.

## The card design

Hum cards follow Grove's glassmorphism aesthetic — translucent glass over your blog's background, soft rounded corners, subtle hover animations. They respect your theme, your season, and `prefers-reduced-motion`. In dark mode, they glow softly. In light mode, they float.

## How Hum relates to Aria

[[aria|Aria]] is active music curation — give it a song, get a playlist. Hum is passive music sharing — paste a link, get a preview. They're complementary. Aria discovers. Hum remembers.

## Privacy

Hum never embeds third-party players. No tracking pixels, no autoplay, no cookies from streaming services. The card is rendered entirely by Grove. When a reader clicks through to Spotify or Apple Music, that's their choice — not something forced on them.

Metadata is cached server-side (title, artist, artwork URL) so the streaming services don't see your readers' IP addresses on every page load.

---

*The forest hums. The music plays on.*
