---
title: What is Lattice?
description: The framework that powers every Grove blog
category: help
section: how-it-works
lastUpdated: '2026-01-25'
keywords:
  - lattice
  - framework
  - platform
  - engine
  - infrastructure
  - how grove works
  - architecture
order: 3
---

# What is Lattice?

You clicked a footer link on someone's blog and ended up here. Welcome.

That blog runs on Lattice. So does every other site in the Grove ecosystem. If you're just reading blogs, you don't need to know any of this. But if you're curious about what's under the hood, here's the story.

## The short version

Lattice is the framework that powers Grove blogs. It handles everything: the writing editor, the themes, the admin panel, the comments, the way posts appear on your screen. Every Grove blog shares this foundation while looking and feeling unique.

Think of it like the trellis in a garden. Each plant grows differently, but they all climb the same structure.

## What it actually does

When someone creates a Grove blog, they get their own space at `theirname.grove.place`. That site needs to do a lot of things: display posts, manage drafts, handle images, show comments, respect the blogger's theme choices, keep everything fast.

Lattice handles all of it. The blogger focuses on writing. Lattice handles the rest.

Here's what's happening behind the scenes:

**Theming.** Each blog can look different: colors, fonts, layout choices. Lattice renders these preferences without the blogger touching code.

**Content management.** The writing editor, draft system, scheduling, and publishing flow all live in Lattice. Bloggers write in Markdown. Lattice turns it into the page you're reading.

**Performance.** Pages load fast because Lattice runs on servers around the world, close to wherever you are. Your connection travels a short distance, not across oceans.

**Isolation.** Every blog's data stays separate from every other blog's. Privacy is baked into how the system works.

## Why "Lattice"?

The name comes from garden trellises: the wooden or wire frames that support climbing plants. Vines wrap around them. Flowers bloom along their edges. The lattice itself fades into the background while the garden flourishes.

That's the idea here. Lattice provides structure so bloggers can grow something beautiful. You shouldn't notice the framework. You should notice the writing.

## What this means for readers

Honestly? Nothing you need to think about.

The blog you were reading loads quickly. It respects your privacy. It works on your phone. It doesn't track you around the web. These things happen because of how Lattice is built, but you don't have to care about that.

Just read. Enjoy the writing. That's what matters.

## What this means for bloggers

If you're considering starting a Grove blog, Lattice is why you don't need technical skills. You won't configure servers, install updates, or debug code. You write. Lattice handles infrastructure.

Updates happen automatically. Security patches apply without you noticing. New features appear when they're ready. Your job is words, not maintenance.

## For the technically curious

Lattice is a SvelteKit application running on Cloudflare's edge network. It uses D1 for persistent data, KV for caching, and R2 for media storage. The multi-tenant architecture routes requests by subdomain, keeping each blog isolated while sharing the underlying infrastructure.

Session management, real-time features, and analytics coordination happen through Loom (our Durable Objects layer). If that sentence means nothing to you, that's fine. If it does, you might enjoy [What is Loom?](/knowledge/help/what-is-loom).

The name "GroveEngine" appears in the codebase. That's the internal name. Lattice is what we call it publicly, because lattices support growth and GroveEngine sounds like middleware.

## Why we tell you this

Most platforms don't explain their infrastructure. You use the product; you don't learn how it works.

Grove is different. Transparency matters here. The people reading Grove blogs, the people writing them: you deserve to understand what you're part of. At whatever level interests you.

This article exists because someone clicked a footer link and wondered what Lattice was. That curiosity deserves an answer.

---

*The best frameworks disappear into what grows on them.*
