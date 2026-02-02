---
title: What is Reverie?
description: Grove's composition layer that turns your dreams into decorations, powered by AI
category: help
section: how-it-works
lastUpdated: '2026-02-02'
keywords:
  - reverie
  - composition
  - ai
  - decorations
  - customization
  - malleable
  - agent
order: 14
---

# What is Reverie?

You know that moment when you're gazing at sunlight through branches, half-awake, and a scene forms in your mind? Not a plan. A feeling. "Something glowing... peaceful... like fireflies at dusk."

Reverie turns that feeling into your grove.

Instead of dragging components around a canvas or writing code, you describe what you want. An AI agent listens, searches Grove's library of nature components, and composes a scene that captures what you meant. You describe the dream. Reverie makes it real.

## Why Reverie exists

Grove has beautiful components: trees, butterflies, fireflies, flowers, lanterns. Terrarium lets you arrange them by hand. But there's a gap.

What if you don't know exactly which components you want? What if you just have a feeling, like "cozy" or "magical evening"? What if you'd rather describe the vibe than drag icons around?

Reverie fills that gap. It's the layer between "I have a feeling" and "here's my decoration." You stay in the dreamy part. Reverie handles the details.

## How it works

You chat with an AI agent. Maybe through Grove's assistant, maybe through another tool. You describe what you're imagining:

*"Add fireflies around my guestbook, something peaceful for evening"*

The agent uses Reverie to:
1. Understand your intent (glowing, peaceful, evening, around guestbook)
2. Search Grove's component library for matches
3. Compose a scene with the right elements
4. Show you a preview

If you like it, apply it. If you want changes, just say so. "More fireflies." "Less bright." "Add a moon."

**Note:** Reverie is currently in planning. The features described here represent what we're building toward.

## What this means for you

**Describe, don't design.** You don't need to know component names or configuration options. Just describe the feeling you want.

**The library does the work.** Grove has 60+ nature components, each tagged with qualities like "glowing," "animated," "seasonal." Reverie knows what's available and what works together.

**It's still your creation.** The agent proposes. You approve or adjust. The final scene is uniquely yours, just arrived at through conversation rather than configuration.

**Optional depth.** Behind every Reverie composition is a readable format called the Vision DSL. If you're curious, you can see exactly how your scene is built. Edit it directly if you want. The door to deeper customization stays open.

## For the technically curious

Reverie works through three parts:

**The Manifest** holds every Grove component with semantic tags. Not just "butterfly" but "flying, animated, colorful, small, spring." When you say "something that glows," the manifest knows fireflies, lanterns, and stars all match.

**The Vision DSL** describes compositions in a format simpler than code. It specifies which components, how many, where they go, and how they're configured. Agents generate it; humans can read and edit it.

**The Agent Interface** translates between natural language and technical composition. Your dream goes in; a structured vision comes out.

## Related

- [What is Terrarium?](/knowledge/help/what-is-terrarium) — The canvas where you can hand-arrange components
- [What is Foliage?](/knowledge/help/what-is-foliage) — Where themes and decorations get applied
- [What are Curios?](/knowledge/help/what-are-curios) — Interactive elements for your site
- [Reverie Specification](/knowledge/specs/reverie-spec)
- [Grove Workshop → Reverie](/workshop#tool-reverie)

---

*A reverie is that state between waking and dreaming. Something forms in your mind's eye. Not quite real yet. But close. That's what you're creating.*
