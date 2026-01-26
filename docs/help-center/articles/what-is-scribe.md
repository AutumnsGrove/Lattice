---
title: What is Scribe?
description: Voice-to-text for your blog—speak your thoughts and watch them become posts
category: help
section: how-it-works
lastUpdated: '2026-01-25'
keywords:
  - scribe
  - voice
  - transcription
  - dictation
  - speech to text
  - flow mode
  - arbor
  - vines
  - draft mode
order: 6
---

# What is Scribe?

Some thoughts flow better when spoken. Maybe you're walking and an idea hits. Maybe typing feels like friction when you just want to get something down. Maybe you think more clearly out loud than staring at a blinking cursor.

Scribe lets you speak your posts into existence.

## The short version

Scribe is voice transcription for Grove. Press and hold a button, say what you're thinking, and watch your words appear as text. No apps to install, no models to download—just your voice and a patient listener.

## Two ways to use it

**Raw mode** gives you exactly what you said. Every word, transcribed 1:1. Fast and literal. Perfect for quick capture when you want to edit later.

**Draft mode** is the magic. Speak naturally—ramble, go on tangents, say "um" as much as you want—and Scribe transforms your speech into a structured draft. Filler words disappear. Headers appear where topics shift. And those tangents? They become Vines.

## Wait, what are Vines?

Vines are sidebar annotations—little notes that live in the margin next to your post. They add context without interrupting the flow of your writing. (Think marginalia, footnotes, or that friend who whispers helpful asides.)

Creating Vines manually is tedious. You have to add them one by one, anchor them to the right spot, write the content. Most people don't bother.

Draft mode changes that. When Scribe detects an aside in your speech—phrases like "by the way," "quick tangent," or "this reminds me"—it pulls that aside out of the main text and turns it into a Vine automatically. Your tangents become margin notes without any extra work.

## How it works

You're in Flow mode (the markdown editor in Arbor). You see the microphone button. You hold it down and start talking:

> "So I've been thinking about how we handle authentication, and the token refresh is kind of a mess right now. Oh by the way, Jake found a related bug yesterday that's been causing crashes on iOS. Anyway, the main thing is we need proper token rotation..."

In Raw mode, you get that text verbatim.

In Draft mode, you get something like this:

**Your post:**
> ## Authentication Token Handling
>
> I've been thinking about how we handle authentication. The token refresh is a mess right now—we need proper token rotation...

**Auto-created Vine (in the margin):**
> Jake found a related bug yesterday causing crashes on iOS.

The tangent became a note. The main argument stayed clean. You didn't have to do anything.

## Why it doesn't require downloads

Some voice tools ask you to download large AI models (500MB+). That works for native apps, but not for a web-based blog editor. Nobody wants to wait for a massive download just to dictate a post.

Scribe runs through Lumen, Grove's AI gateway. Your voice goes to the edge, gets transcribed by Cloudflare's Whisper models, and comes back as text—all in a couple seconds. No downloads. No device requirements. Works on your phone, your laptop, wherever you write.

## What this means for you

**Write while walking.** Capture ideas during a commute, a hike, or a late-night pace around your apartment.

**Skip the blank page.** Some people freeze when they see a cursor. If you can talk about your idea, you can get it down.

**Get structured drafts faster.** Draft mode means less editing. Your rambling becomes readable.

**Vines without the hassle.** Those little asides that add personality to a post? They appear automatically now.

## Where you'll find it

Scribe lives in Flow mode—the markdown editor in Arbor. Look for the microphone icon. Two ways to record:

- **Hold to record** — Press and hold the button (or shortcut), release to stop
- **Toggle mode** — Click once to start, click again to stop (better for longer recordings or if holding is difficult)

The keyboard shortcut is `Cmd+Shift+U` (or `Ctrl+Shift+U` on Windows/Linux) for quick access. Think "U" for utterance.

## Usage and quotas

Scribe uses your daily AI quota. Raw mode counts as one transcription request. Draft mode counts as two (transcription + the AI structuring step). Check your usage in the Arbor dashboard under Settings → Usage.

Higher tiers get more transcription requests per day. If you're doing a lot of voice writing, Sapling or above gives you room to breathe.

---

*Speak. The grove scribes.*
