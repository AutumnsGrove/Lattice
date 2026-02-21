---
title: Blazes — Content Type Indicators
description: Small visual markers on each Meadow post that identify its content type at a glance.
category: specs
specCategory: content-community
icon: flame
lastUpdated: "2026-02-21"
aliases: []
date created: Saturday, February 21st 2026
date modified: Saturday, February 21st 2026
tags:
  - meadow
  - ui
  - svelte
  - content-types
type: tech-spec
---

# Blazes — Content Type Indicators

```
        .↑.         .↑.         .↑.         .↑.
       /|||\\       /|||\\       /|||\\       /|||\\
      //|||\\\\    //|||\\\\    //|||\\\\    //|||\\\\
         │           │           │           │
        (*)         (~)         (*)         (~)
         │           │           │           │
    ═════╧═══════════╧═══════════╧═══════════╧═════
                     the trail ahead
             * = cherry (bloom)
             ~ = feather (note)

    A painted mark on a tree.
    You glance. You know the path. You keep walking.
```

> _A small mark that tells you everything._

The little indicator on each Meadow post that tells you what you're looking at. A bloom, a note, something else. Icon and label, or sometimes just the icon. You don't stop to read a blaze. You glance at it and keep walking. It orients you instantly.

**Public Name:** Blazes
**Internal Name:** Blaze (component), PostBlaze
**Domain:** _(part of Meadow)_
**Parent Spec:** [Meadow](./meadow-spec.md)
**Status:** Planned
**Last Updated:** February 2026

A trail blaze is a painted mark on a tree. A rectangle of color that tells hikers which path they're on. Blue blaze, white blaze, yellow blaze. Each trail has its own. You don't read a blaze. You scan for it, confirm the color, and move on. It's the smallest possible wayfinding signal.

Blazes bring that to Meadow. Right now, blooms and notes look structurally different (titles vs. body text, images vs. none), but there's no explicit marker that says "this is a bloom" or "this is a note." The difference is implied by layout. Blazes make it explicit: a small icon + label in the post header that names what you're seeing.

---

## Table of Contents

1. [Overview](#overview)
2. [Content Types](#content-types)
3. [Visual Design](#visual-design)
4. [Component Architecture](#component-architecture)
5. [Integration Points](#integration-points)
6. [Accessibility](#accessibility)
7. [Future Content Types](#future-content-types)
8. [Implementation Checklist](#implementation-checklist)

---

## Overview

### The problem

Meadow's feed displays blooms and notes side by side. The only way to tell them apart is by reading the card structure: blooms have titles and external links, notes have body text. There's no visual shorthand. When you're scrolling quickly, every card looks like a slightly different shape of the same thing.

### What Blazes do

A blaze is a small badge in the post card header, next to the author info and timestamp. It contains:

1. **An icon** that represents the content type (cherry for bloom, feather for note)
2. **A label** that names it ("Bloom" or "Note")
3. **A color** that distinguishes it at a glance

Together, these three things give the feed visual rhythm. Your eye can pick out "three blooms, a note, two blooms, a note" without reading a word.

### What Blazes don't do

- They don't filter content (that's the FeedFilters tab bar)
- They don't link anywhere (they're informational, not interactive)
- They don't appear in the database (content types already exist as `post_type`)
- They don't change the post's behavior or layout

Blazes are pure presentation. A visual affordance layered on top of data that already exists.

---

## Content Types

Two content types exist today. The blaze system is designed to extend when more arrive.

### Current types

| Type | Lucide Icon | Label | Color | Description |
|------|-------------|-------|-------|-------------|
| Bloom | `Cherry` | Bloom | grove (green) | A full blog post syndicated from a Grove garden via RSS. Has title, description, external link, optional featured image. |
| Note | `Feather` | Note | amber (warm) | A short-form native post written directly in Meadow. Up to 1000 characters. No title. |

### Type definitions

```typescript
import type { Component } from "svelte";
import { Cherry, Feather } from "lucide-svelte";
import type { MeadowPost } from "$lib/types/post.js";

/** Post types that have blazes. Exhaustive — adding a type here forces you to add its config. */
type BlazeType = MeadowPost["postType"];

/** Blaze configuration for a content type */
interface BlazeConfig {
  /** Display label shown next to the icon */
  label: string;
  /** Lucide icon component */
  icon: Component;
  /**
   * Full class string for the badge.
   *
   * Written as a static literal so Tailwind's content scanner sees every
   * class name at build time. Dynamic interpolation (e.g. {config.bg})
   * would be invisible to the scanner and purged in production.
   */
  classes: string;
}

/**
 * Keyed by BlazeType so TypeScript flags missing entries at compile time.
 * If you add a new post type to MeadowPost["postType"], the compiler
 * will error here until you add a matching blaze config.
 */
const BLAZE_CONFIG: Record<BlazeType, BlazeConfig> = {
  bloom: {
    label: "Bloom",
    icon: Cherry,
    classes:
      "bg-grove-50 text-grove-700 dark:bg-grove-900/30 dark:text-grove-300",
  },
  note: {
    label: "Note",
    icon: Feather,
    classes:
      "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
};
```

**Why these icons:**

- **Cherry** (`Cherry` from lucide-svelte) — Already mapped in the Grove icon registry as "Blooms: individual pieces of writing." A cherry is a fruit of the tree, just as a bloom is a fruit of the garden.
- **Feather** (`Feather` from lucide-svelte) — Already in the registry for songbird features. Notes are described as "the smallest complete sound a bird can make." A feather is the lightest natural mark. Quick, effortless, organic.

---

## Visual Design

### Placement

The blaze sits in the post card header, inline with the author metadata row. It appears after the timestamp, separated by a middot.

```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│   ┌───┐  autumn · autumn.grove.place · 3h · [*] Bloom        │
│   │ A │                                      Cherry icon      │
│   └───┘  ───────────────────────────────────────────────      │
│                                                               │
│   On the Quiet Architecture of Personal Websites              │
│                                                               │
│   There's something about building your own corner            │
│   of the internet that feels like planting a garden...        │
│                                                               │
│   ┌───────────────────────────────────────────┐               │
│   │                                           │               │
│   │            [ featured image ]              │               │
│   │                                           │               │
│   └───────────────────────────────────────────┘               │
│                                                               │
│   ───────────────────────────────────────────────────         │
│   △ 12                                           [=]          │
│                                                               │
└───────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────┐
│                                                               │
│   ┌───┐  river · river.grove.place · 20m · [~] Note          │
│   │ R │                                     Feather icon      │
│   └───┘  ───────────────────────────────────────────────      │
│                                                               │
│   just found the most beautiful moth on my windowsill.        │
│   she's been sitting there for twenty minutes. i think        │
│   she likes the lamp.                                         │
│                                                               │
│   ───────────────────────────────────────────────────         │
│   △ 4                                            [=]          │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Badge anatomy

```
        ╭──────────────╮
        │  [*] Bloom   │     ← Lucide icon + label
        ╰──────────────╯
            ↑
       rounded-full pill
       Lucide Cherry (w-3.5 h-3.5)
       subtle bg color
       small text (text-xs)
```

The badge is a small pill. Rounded corners (full radius), subtle background tint matching the content type color, icon on the left, label on the right. At small viewport widths, the label collapses and only the icon remains.

### Responsive behavior

```
  Desktop (>=640px):          Mobile (<640px):

  autumn · 3h · [*] Bloom    autumn · 3h · [*]
```

On mobile, the label hides. The icon alone carries the meaning. This keeps the header from overflowing while preserving the visual signal.

### Color in context

Blazes use the lightest tint of their color family. They should feel like a gentle wash, not a loud badge. The goal is that you notice the pattern across multiple cards, not that any single blaze demands attention.

```
  Light mode:                 Dark mode:

  ┌─────────────────┐         ┌─────────────────┐
  │ bg-grove-50      │         │ bg-grove-900/30  │
  │ text-grove-700   │         │ text-grove-300   │
  │                  │         │                  │
  │  [*] Bloom       │         │  [*] Bloom       │
  └─────────────────┘         └─────────────────┘

  ┌─────────────────┐         ┌─────────────────┐
  │ bg-amber-50      │         │ bg-amber-900/30  │
  │ text-amber-700   │         │ text-amber-300   │
  │                  │         │                  │
  │  [~] Note        │         │  [~] Note        │
  └─────────────────┘         └─────────────────┘

  [*] = Cherry icon    [~] = Feather icon
```

---

## Component Architecture

### New component: `PostBlaze.svelte`

A single new component in the Meadow app. Intentionally simple. No engine dependency needed since it's Meadow-specific.

**Location:** `apps/meadow/src/lib/components/PostBlaze.svelte`

```svelte
<!--
  PostBlaze — Content type indicator for Meadow posts.

  Displays a small Lucide icon + label badge identifying the post type
  (Bloom, Note, etc). Label collapses on mobile viewports.
-->
<script lang="ts">
  import type { MeadowPost } from "$lib/types/post.js";
  import { BLAZE_CONFIG } from "$lib/types/blaze.js";

  interface Props {
    postType: MeadowPost["postType"];
  }

  const { postType }: Props = $props();

  const config = $derived(BLAZE_CONFIG[postType]);
  const Icon = $derived(config.icon);
</script>

<span
  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5
         text-xs font-medium {config.classes}"
  aria-label="{config.label} post"
>
  <Icon class="w-3.5 h-3.5" aria-hidden="true" />
  <span class="hidden sm:inline">{config.label}</span>
</span>
```

### Data flow

No new data required. Blazes read from `MeadowPost.postType`, which already exists.

```
  Database                Server               Client
  ─────────────────────────────────────────────────────

  meadow_posts            rowToPost()          PostCard.svelte
  ┌──────────────┐        ┌──────────┐         ┌───────────────┐
  │ post_type     │───────▶│ postType  │────────▶│ PostBlaze     │
  │ TEXT          │        │ string    │         │ reads postType│
  │ DEFAULT       │        └──────────┘         │ renders badge │
  │ 'bloom'       │                             └───────────────┘
  └──────────────┘

  No new columns. No new queries. No new API fields.
```

### Integration into PostCard

The blaze slots into the existing author metadata row in `PostCard.svelte`. One new import, one new element in the header.

```
  Before:
  ┌─────────────────────────────────────────────────────────┐
  │  [avatar]  author name                                  │
  │            subdomain.grove.place · 3h ago               │
  └─────────────────────────────────────────────────────────┘

  After:
  ┌─────────────────────────────────────────────────────────┐
  │  [avatar]  author name                                  │
  │            subdomain.grove.place · 3h ago · [*] Bloom   │
  └─────────────────────────────────────────────────────────┘
```

The change in PostCard is minimal: import PostBlaze, add it after the `<time>` element in the metadata row. Approximately 5 lines of diff.

---

## Integration Points

### Feed filter tabs

The FeedFilters component already has "Notes" and "Blooms" tabs. These filter by `post_type` at the query level. Blazes complement this by marking individual posts within a mixed view. When someone is on the "All" tab, blazes are how they tell the types apart.

```
  ┌──────────────────────────────────────────────────────┐
  │  [ All ]  [ Notes ]  [ Blooms ]  [ Popular ]  ...   │
  └──────────────────────────────────────────────────────┘
       ↑                                   ↑
       Blazes visible here       Blazes still visible
       (mixed types)             (all same type, but
                                  consistent marking)
```

Blazes appear on every post in every filter view. Even when you're on the "Blooms" tab and every post is a bloom, the blaze is still there. Consistency over cleverness.

### Existing components used

| Component | From | Purpose |
|-----------|------|---------|
| `PostCard.svelte` | Meadow | Parent container; blaze added to header |
| `Badge.svelte` | Engine (available but not used) | PostBlaze is self-contained; simpler than wrapping the shared Badge for this specific use case |

PostBlaze is intentionally not built on the engine's `Badge` component. The shared Badge has variants (default, secondary, destructive, tag) designed for general-purpose use. Blazes have specific color semantics tied to content types. A dedicated component is cleaner than overriding Badge styles.

---

## Accessibility

### Screen readers

The blaze badge includes an `aria-label` that reads naturally: "Bloom post" or "Note post." The Lucide icon SVG is marked `aria-hidden="true"` since the label carries the semantic meaning.

On mobile, where the text label is visually hidden (`hidden sm:inline`), the `aria-label` on the parent span still announces the full type name. Screen readers always hear "Bloom post" regardless of viewport. Lucide icons render as inline SVGs, so there's no emoji character for screen readers to misinterpret.

### Reduced motion

Blazes have no animation. They're static badges. No `prefers-reduced-motion` consideration needed.

### Color contrast

**Light mode** — solid backgrounds, verifiable ratios:

| Type | Background | Text | Ratio |
|------|-----------|------|-------|
| Bloom | `grove-50` (#f0fdf4) | `grove-700` (#15803d) | ~7.5:1 |
| Note | `amber-50` (#fffbeb) | `amber-700` (#b45309) | ~6.8:1 |

Both exceed WCAG AAA (7:1).

**Dark mode** — alpha backgrounds, ratios depend on the rendered surface:

| Type | Background | Text |
|------|-----------|------|
| Bloom | `grove-900/30` | `grove-300` |
| Note | `amber-900/30` | `amber-300` |

The `/30` backgrounds are 30% alpha and blend with whatever is beneath them — in practice, the PostCard's glass surface (`dark:bg-cream-100/65` with `backdrop-blur-md`). The effective composite color depends on the card surface, the page background behind the blur, and any decorative elements. Exact contrast ratios can't be stated without knowing the final rendered color.

**Implementation note:** Verify dark mode ratios in browser devtools against the actual rendered composite. If any pairing falls below WCAG AA (4.5:1), replace the alpha background with its resolved solid equivalent on the standard card surface. Grove's dark mode CSS variables invert the scale (`grove-900` becomes light, `grove-300` becomes dark), so double-check that the text color lands on the readable end of the spectrum.

### Touch targets

The badge pill has `px-2 py-0.5` padding. This is visually compact but the blaze is not interactive (no click handler, no link). Touch target size requirements (44x44px) only apply to interactive elements. Blazes are informational. No tap target needed.

---

## Future Content Types

The blaze system is designed for extension. When new content types arrive, you add an entry to `BLAZE_CONFIG` and the badge renders automatically. No component changes needed.

### Potential future types

These are speculative. They illustrate how the system extends, not a commitment to build them.

| Type | Lucide Icon | Label | Color | What it might be |
|------|-------------|-------|-------|------------------|
| Share | `Link` | Share | sky (blue) | A repost or link share from another grove |
| Thread | `MessageSquare` | Thread | violet (purple) | A connected sequence of notes |
| Event | `Calendar` | Event | rose (pink) | A calendar happening |

Adding a new type:

```typescript
import { Link } from "lucide-svelte";

// 1. Add database value
//    ALTER TABLE meadow_posts ... (or new migration)

// 2. Update TypeScript union in post.ts
//    postType: "bloom" | "note" | "share"
//
//    The compiler now errors in blaze.ts because BLAZE_CONFIG
//    is Record<BlazeType, BlazeConfig> and "share" is missing.

// 3. Add the missing entry (compiler-guided)
//    share: {
//      label: "Share",
//      icon: Link,
//      classes: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
//    },

// 4. Done. PostBlaze renders it automatically.
```

---

## Implementation Checklist

### Phase 1: Core component

- [ ] Create `BLAZE_CONFIG` constant in `apps/meadow/src/lib/types/blaze.ts`
- [ ] Create `PostBlaze.svelte` component in `apps/meadow/src/lib/components/`
- [ ] Add PostBlaze to `PostCard.svelte` header, after the timestamp
- [ ] Verify responsive label collapse at `sm` breakpoint
- [ ] Verify dark mode colors

### Phase 2: Polish

- [ ] Test with screen reader (VoiceOver, NVDA)
- [ ] Verify dark mode contrast ratios against rendered card surface (see [Color contrast](#color-contrast))
- [ ] Test in feed with mixed content (All tab)
- [ ] Test in filtered views (Notes tab, Blooms tab)
- [ ] Check that the blaze doesn't push the header to two lines on narrow viewports

### Phase 3: Documentation

- [ ] Add PostBlaze to Meadow's component index
- [ ] Update Meadow spec with reference to Blazes
- [ ] Add Waystone tooltip for "Blaze" if GroveTerm is rendered in Meadow

---

## Related Specs

- [Meadow](./meadow-spec.md). Parent system. Blazes live inside the Meadow feed.
- [Waystone](./waystone-spec.md). Help system. "Blaze" is in the GroveTerm manifest and could show a tooltip.
- [Canopy](./canopy-spec.md). Directory. If Canopy ever displays post previews, blazes may appear there too.

---

_A painted mark on a tree. You glance. You know the path._
