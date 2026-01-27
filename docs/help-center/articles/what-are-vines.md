---
title: What are Vines?
description: Margin notes that climb alongside your writing—adding context without interrupting the flow
category: help
section: how-it-works
lastUpdated: '2026-01-27'
keywords:
  - vines
  - margin notes
  - annotations
  - sidebar
  - gutter comments
  - asides
  - marginalia
  - flow
  - scribe
order: 7
---

# What are Vines?

Sometimes you want to say something that doesn't quite fit in the main text. An aside. A footnote. A "by the way" that adds context without derailing your argument.

Vines are those margin notes.

## The short version

Vines are annotations that appear in the margins of your posts. They anchor to specific sections of your writing—a header, a paragraph—and display alongside the content without interrupting it. Think marginalia in old books, those handwritten notes in the margins that add depth without cluttering the page.

You can fill them with text, photos, galleries, or anything else that helps tell the story.

## Why "Vines"?

In a grove, vines climb the trees and trellises. They don't replace what's already growing—they wrap around it, adding texture and life.

That's what these notes do. Your main text is the tree. Vines climb beside it, offering context, asides, tangents, supplementary images. The two grow together.

## What you can put in a Vine

Right now, Vines support:

- **Text** — Commentary, definitions, corrections, personal notes
- **Photos** — Supporting images that don't belong in the main flow
- **Galleries** — Multiple images grouped together

More content types are coming. Eventually Vines will support components (called Cheerios in Grove)—embeddable interactive elements that bring your margins to life.

## How they work

Vines anchor to sections of your content. You might attach a note to a heading, explaining why you chose that framing. Or anchor a photo gallery to a paragraph describing a trip, letting readers see the images without scrolling away from the text.

In the Flow editor (Grove's markdown editor), you'll find a Vines section that expands to show your margin notes. Create a new Vine, write your content, and anchor it to the right spot. The anchoring is currently manual—you specify which section the Vine belongs to—but click-to-anchor is coming soon.

Readers see Vines in the margin on desktop, or collapsed below sections on mobile. The experience adapts to the screen.

## Automatic Vines with Scribe

Here's where it gets interesting.

[Scribe](/knowledge/help/what-is-scribe) is Grove's voice transcription tool. When you use Draft mode—where Scribe structures your rambling speech into organized prose—it listens for tangents. Phrases like "by the way," "quick aside," or "this reminds me" signal that you've wandered off topic.

Instead of cluttering your main text with those tangents, Scribe pulls them out and turns them into Vines automatically. Your asides become margin notes. Your main argument stays clean. You didn't have to do anything.

This transforms Vines from a nice feature that most people ignore into something that happens naturally while you speak.

## For the technically curious

Behind the scenes, Vines are stored as sidecar JSON files. If you have a post at `my-post.md`, the Vines live in `my-post.vines.json`. You'll never touch this file directly—the editor handles everything—but it means your margin notes are structured data, not embedded markup.

This separation keeps your markdown clean and makes Vines portable. The system can render them differently on different devices, reorder them, or style them according to your theme. The content stays the same; the presentation adapts.

When Scribe auto-generates Vines, it passes through Lumen (Grove's AI gateway). The model understands the Vine syntax and creates proper anchored notes from your speech. Zero data retention applies—your voice is transcribed, processed, and forgotten.

## What this changes

Traditional footnotes bury your asides at the bottom of the page. In-text parentheticals interrupt the reading flow. Most people avoid both, keeping their writing simpler than it could be.

Vines give you a third option: present asides alongside the content, visible but unobtrusive. Readers who want them can glance over. Readers who don't can ignore them entirely.

Your writing can be richer without being cluttered. That's the point.

---

*Some thoughts belong in the margins. Vines give them a place to grow.*
