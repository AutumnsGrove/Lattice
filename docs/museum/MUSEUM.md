---
title: Welcome to the Lattice Museum
description: A guided tour through how this forest grows
category: exhibit
exhibitWing: entrance
icon: signpost
lastUpdated: '2026-01-22'
---
# Welcome to the Lattice Museum

> *A guided tour through how this forest grows.*

---

## What You're Looking At

This is the story of Grove, told through the systems that make it work.

You're standing at the entrance to a museum. Not the dusty kind with ropes and "do not touch" signs. This is the kind where you can peek behind every curtain, ask why everything exists, and leave understanding something new.

Lattice is the framework that powers Grove. The name evokes a structure that supports growth. Vines climb it, gardens are built around it. This museum shows you how that lattice was built, piece by piece.

---

## The Wings

```
                         🌲
              ╭────────────────────────╮
              │                        │
              │   You are here: ◉      │
              │                        │
              │   ┌─────┐   ┌─────┐    │
              │   │ 1.  │   │ 2.  │    │
              │   │ARCH │───│NATU │    │
              │   │     │   │RE   │    │
              │   └──┬──┘   └──┬──┘    │
              │      │         │       │
              │   ┌──┴──┐   ┌──┴──┐    │
              │   │ 3.  │   │ 4.  │    │
              │   │TRUST│───│DATA │    │
              │   │     │   │     │    │
              │   └──┬──┘   └──┬──┘    │
              │      │         │       │
              │   ┌──┴──┐   ┌──┴──┐    │
              │   │ 5.  │   │ 6.  │    │
              │   │PERS │───│COMM │    │
              │   │ONAL │   │UNIT │    │
              │   └──┬──┘   └──┬──┘    │
              │      │         │       │
              │      └────┬────┘       │
              │       ┌───┴───┐        │
              │       │  7.   │        │
              │       │NAMING │        │
              │       └───────┘        │
              │                        │
              ╰────────────────────────╯
```

### [1. The Architecture Wing](./architecture/WING.md)

How Grove is built at the infrastructure level.

One deployment serves unlimited blogs. One engine prevents duplication. Cloudflare primitives (Workers, D1, KV, R2) compose together like instruments in an orchestra.

**Exhibits:**
- The Foundation (multi-tenant architecture)
- The Engine Room (engine-first pattern)
- The Loom (Durable Objects coordination)
- The Cloud Garden (Cloudflare primitives)

---

### [2. The Nature Wing](./nature/WING.md)

The visual and emotional language of Grove.

65 mathematically-driven SVG components create a living forest. Five seasons shift the mood. Glass surfaces layer over organic backgrounds. Ten font choices respect every reader.

**Exhibits:**
- The Forest (trees, creatures, weather)
- The Seasons (Spring, Summer, Autumn, Winter, Midnight)
- The Glass Garden (glassmorphism design)
- The Typography Gallery (10 accessible fonts)

---

### [3. The Trust Wing](./trust/WING.md)

Authentication, security, and identity.

Login should feel safe, not surveilled. Sessions refresh quietly. Protection happens without frustration. Heartwood is the name we gave to Grove's core of trust.

**Exhibits:**
- The Heartwood (OAuth and identity)
- The Session Gallery (remembering who you are)
- The Security Checkpoint (protection patterns)

---

### [4. The Data Wing](./data/WING.md)

How information flows and persists.

Posts travel from editor to database to cache to browser. Tenant isolation keeps your data yours. Type-safe helpers prevent the scary stuff.

**Exhibits:**
- The Filing Cabinet (D1 database patterns)
- The Quick-Lookup Shelf (KV caching)
- The Media Vault (R2 storage)
- The Query Builders (type-safe helpers)

---

### [5. The Personalization Wing](./personalization/WING.md)

Making each blog feel like home.

Feature flags have Grove vocabulary: Graft means enable, Prune means disable. Curios bring old-web energy: guestbooks, hit counters, custom cursors. Your space should feel like yours.

**Exhibits:**
- The Grafts Exhibit (feature flags)
- The Curios Collection (old-web personalization)
- The Theme Workshop (customization)

---

### [6. The Community Wing](./community/WING.md)

The social layer and shared spaces.

The Meadow is where blogs can share posts to a community feed. The Landing welcomes visitors to grove.place. The Clearing shows system health with transparency.

**Exhibits:**
- The Meadow (community feed)
- The Landing (welcome experience)
- The Clearing (status page)

---

### [7. The Naming Wing](./naming/WING.md)

How Grove names things, and why it matters.

Names aren't branding. They're world-building. Every service has a nature metaphor that genuinely fits. Each name was discovered through a walk through the forest, not a brainstorming session with sticky notes.

**Exhibits:**
- The Philosophy (names as ecosystem language)
- The Walk (the ritual of discovering names)
- The Walks Gallery (56 naming journeys, organized and accessible)
- The Ecosystem Map (40+ services, each with its story)

**Featured Journey:** Porch. Support isn't a ticket system. It's a porch conversation. You come up the steps, have a seat, and the grove keeper comes out to chat. This journey created the naming ritual.

---

## The Glossary Alcove

Before you explore, you might want to learn [Grove's vocabulary](./glossary.md).

| Term | Meaning |
|------|---------|
| **Wanderer** | Any visitor to Grove |
| **Rooted** | Someone who has created a blog (paid) |
| **Lattice** | The engine that powers everything |
| **Heartwood** | The authentication system |
| **Grafts** | Feature flags |
| **Curios** | Personalization features |

---

## How to Explore

**If you're curious about architecture:**
Start with [The Foundation](./architecture/foundation.md). It explains how one deployment serves unlimited blogs.

**If you're drawn to design:**
Start with [The Seasons](./nature/seasons.md). It shows how five color palettes create emotional depth.

**If you're building something similar:**
Start with [The Engine Room](./architecture/engine-room.md). It explains the pattern that prevented 11,925 lines of duplicate code.

**If you care about words:**
Start with [The Naming Wing](./naming/WING.md). See how "Porch" created the naming ritual and how "Lumen" emerged from staring into the void.

**If you just want to wander:**
Pick any wing. They're all connected. You'll find your way.

---

## Before You Go

This museum exists because documentation should be hospitable.

When you enter a codebase, you're a visitor unfamiliar with its architecture and decisions. Most codebases hand you a catalog and wish you luck. We'd rather walk alongside you, explaining why things exist before diving into how they work.

Every exhibit tells a story. Every pattern has a reason. Every decision has a lesson.

Take your time. Ask questions. The forest will still be here.

---

*— Welcome to Grove.*

*January 2026*
