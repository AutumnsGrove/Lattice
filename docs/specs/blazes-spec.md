---
title: Blazes — Content Markers
description: A two-slot marking system for posts across Grove. Auto-blazes identify content type (Bloom, Note). Custom blazes let wanderers express what their post is really about.
category: specs
specCategory: content-community
icon: flame
lastUpdated: "2026-02-21"
aliases: []
date created: Saturday, February 21st 2026
date modified: Saturday, February 21st 2026
tags:
  - meadow
  - engine
  - ui
  - svelte
  - content-types
  - database
type: tech-spec
---

# Blazes — Content Markers

```
        .↑.         .↑.         .↑.         .↑.
       /|||\\       /|||\\       /|||\\       /|||\\
      //|||\\\\    //|||\\\\    //|||\\\\    //|||\\\\
         │           │           │           │
        (*)         (~)         (*)         (~)
        (🍳)         │         (📐)         │
         │           │           │           │
    ═════╧═══════════╧═══════════╧═══════════╧═════
                     the trail ahead

             * = cherry (bloom)    ~ = feather (note)
             🍳 = food review      📐 = tutorial

    Two marks on one tree.
    The first tells you the path. The second tells you why.
```

> _A painted mark on a tree. Then a second mark, in your own hand._

Every post in the Grove gets two blaze slots. The first is automatic: Bloom or Note, derived from the post type, always present. The second is yours to choose. A food review. A personal update. A tutorial. Something you name yourself. Two small badges in the post header, giving the feed visual rhythm and personal expression.

**Public Name:** Blazes
**Internal Name:** Blaze (component), BlazeDefinition (type)
**Domain:** Engine-level (cross-app)
**Parent Spec:** [Meadow](./meadow-spec.md)
**Status:** Planned
**Last Updated:** February 2026

A trail blaze is a painted mark on a tree. A rectangle of color that tells hikers which path they're on. Blue blaze, white blaze, yellow blaze. Each trail has its own. You don't read a blaze. You scan for it, confirm the color, and move on. The smallest possible wayfinding signal.

Some hikers carry a second mark. A small tag they clip to the tree next to the blaze. "Water source ahead." "Good campsite." "Scenic overlook." The official blaze tells you the path. The personal mark tells you what's here.

Blazes bring both to Grove.

---

## Table of Contents

1. [Overview](#overview)
2. [The Two-Slot Model](#the-two-slot-model)
3. [Blaze Definitions](#blaze-definitions)
4. [Visual Design](#visual-design)
5. [Data Schema](#data-schema)
6. [Component Architecture](#component-architecture)
7. [RSS Bridge](#rss-bridge)
8. [API Surface](#api-surface)
9. [Integration Points](#integration-points)
10. [Accessibility](#accessibility)
11. [Security](#security)
12. [Implementation Checklist](#implementation-checklist)

---

## Overview

### The problem

Meadow's feed displays blooms and notes side by side. The only way to tell them apart is by reading the card structure: blooms have titles and external links, notes have body text. There's no visual shorthand. When you're scrolling quickly, every card looks like a slightly different shape of the same thing.

And beyond type, there's no way to say what a post is _about_ at a glance. A food review and a personal essay are both blooms. A mood check-in and a shower thought are both notes. The feed has no vocabulary for content beyond "long form" and "short form."

### What Blazes do

A blaze is a small badge in the post card header. Every post gets up to two:

1. **Auto blaze** (Slot 1). Derived from `post_type`. Cherry icon for Bloom, Feather icon for Note. Always present, never stored separately. This is the trail marker.
2. **Custom blaze** (Slot 2). Chosen by the post author from a list of global defaults or their own custom definitions. Optional. Stored as a slug in the database. This is the personal mark.

Together, these two slots give the feed visual rhythm and expressive depth. Your eye can scan "bloom, bloom with food-review tag, note, bloom with tutorial tag" without reading a word.

### What Blazes don't do

- They don't filter content (that's the FeedFilters tab bar)
- They don't link anywhere (they're informational, not interactive)
- They don't change the post's behavior or layout
- They don't replace tags (tags are for search and categorization, blazes are for visual wayfinding)

### Goals

- Give the feed instant visual differentiation between content types
- Let wanderers express what their post is about with a single marker
- Work across both Meadow posts and Garden blooms
- Travel through the RSS bridge so Garden blazes appear in Meadow
- Extend gracefully when new content types or custom blazes arrive

### Non-Goals

- Filtering by blaze (possible future feature, not in scope)
- Multiple custom blazes per post (one auto + one custom is the limit)
- Blaze analytics or trending blazes
- Blaze-based recommendations

---

## The Two-Slot Model

```
┌───────────────────────────────────────────────────────────────────┐
│                    THE TWO-SLOT MODEL                             │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│   SLOT 1: AUTO BLAZE                 SLOT 2: CUSTOM BLAZE        │
│   ──────────────────                 ────────────────────         │
│                                                                   │
│   Derived from post_type             Chosen by post author        │
│   Always present                     Optional (nullable)          │
│   Not stored separately              Stored as slug in DB         │
│   Two values: Bloom, Note            Global defaults + custom     │
│                                                                   │
│   ╭──────────────╮                   ╭──────────────────╮         │
│   │  [*] Bloom   │                   │  [🍳] Food Review│         │
│   ╰──────────────╯                   ╰──────────────────╯         │
│   Cherry icon, grove green           UtensilsCrossed, rose        │
│                                                                   │
│   Source: MeadowPost.postType        Source: posts.blaze column   │
│   Config: BLAZE_CONFIG (code)        Config: blaze_definitions DB │
│                                                                   │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│   In the feed, they sit side by side:                             │
│                                                                   │
│   autumn · 3h · [*] Bloom · [🍳] Food Review                     │
│                                                                   │
│   Or just the auto blaze if no custom is set:                     │
│                                                                   │
│   river · 20m · [~] Note                                         │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### How each slot works

**Slot 1 (Auto)** reads from a code constant. No database query, no lookup. The `BLAZE_CONFIG` map lives in the engine's blazes module and maps `"bloom"` and `"note"` to their icon, label, and color classes. This is identical to the original v1 spec. If you know the post type, you know the blaze.

**Slot 2 (Custom)** reads from a slug string stored on the post. The slug is looked up against the `blaze_definitions` table to get the icon, label, and color. If the slug doesn't match any definition (e.g., a custom blaze was deleted), the component renders the slug as plain text with a neutral style. Graceful degradation over hard failure.

---

## Blaze Definitions

### Global defaults

Grove ships with 8 predefined blazes. These have `tenant_id = NULL` in the database and are available to everyone.

| Slug           | Label        | Lucide Icon       | Color           | What it marks                                              |
| -------------- | ------------ | ----------------- | --------------- | ---------------------------------------------------------- |
| `update`       | Update       | `Bell`            | sky (blue)      | Status updates, life changes, announcements to your circle |
| `food-review`  | Food Review  | `UtensilsCrossed` | rose (pink)     | Restaurant visits, recipes, food photography               |
| `personal`     | Personal     | `Heart`           | pink            | Diary entries, reflections, feelings                       |
| `tutorial`     | Tutorial     | `GraduationCap`   | violet (purple) | How-to posts, guides, walkthroughs                         |
| `project`      | Project      | `Hammer`          | amber (warm)    | Build logs, project updates, dev diaries                   |
| `review`       | Review       | `Star`            | yellow          | Book reviews, game reviews, media reviews                  |
| `thought`      | Thought      | `CloudSun`        | slate (neutral) | Shower thoughts, musings, half-formed ideas                |
| `announcement` | Announcement | `Megaphone`       | grove (green)   | Official announcements, feature launches                   |

### User-created blazes

Wanderers can create custom blazes for their garden. A tenant-scoped definition with its own slug, label, icon (chosen from Lucide), and color (chosen from the palette). Custom blazes are private to the garden that created them.

When a custom blaze travels through RSS to Meadow, the slug is carried along. If Meadow can resolve the slug against the originating tenant's definitions, it renders fully. If not, it falls back to a plain-text label.

### Auto-blaze config (Slot 1)

The auto blaze is not a blaze definition in the database. It's a code constant in the engine.

```typescript
import type { Component } from "svelte";
import { Cherry, Feather } from "@lucide/svelte";

type PostType = "bloom" | "note";

interface AutoBlazeConfig {
	label: string;
	icon: Component;
	classes: string;
}

/**
 * Static config for auto-blazes. Keyed by post_type.
 * Adding a new post type to PostType forces a compiler error here.
 */
const BLAZE_CONFIG: Record<PostType, AutoBlazeConfig> = {
	bloom: {
		label: "Bloom",
		icon: Cherry,
		classes: "bg-grove-50 text-grove-700 dark:bg-grove-900/30 dark:text-grove-300",
	},
	note: {
		label: "Note",
		icon: Feather,
		classes: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
	},
};
```

**Why these icons:**

- **Cherry** (`Cherry` from lucide-svelte). Already mapped in the Grove icon registry as "Blooms: individual pieces of writing." A cherry is a fruit of the tree, just as a bloom is a fruit of the garden.
- **Feather** (`Feather` from lucide-svelte). Already in the registry for songbird features. Notes are described as "the smallest complete sound a bird can make." A feather is the lightest natural mark.

---

## Visual Design

### Placement

Both blazes sit in the post card header, inline with the author metadata row. They appear after the timestamp, separated by middots.

```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│   ┌───┐  autumn · autumn.grove.place · 3h                    │
│   │ A │  [*] Bloom · [🍳] Food Review                        │
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
│   ┌───┐  river · river.grove.place · 20m                     │
│   │ R │  [~] Note                                            │
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

The blazes move to a second line in the metadata area, below the author name row. This prevents the header from becoming a single overflowing line on narrow viewports and gives both blaze slots breathing room.

### Badge anatomy

```
        ╭──────────────╮  ╭──────────────────╮
        │  [*] Bloom   │  │  [🍳] Food Review│
        ╰──────────────╯  ╰──────────────────╯
            ↑                     ↑
       Auto blaze            Custom blaze
       (always present)      (optional)

       Both are:
       rounded-full pill
       Lucide icon (w-3.5 h-3.5)
       subtle bg color
       small text (text-xs)
```

Each badge is a small pill. Rounded corners (full radius), subtle background tint, icon on the left, label on the right. At small viewport widths, labels collapse and only icons remain.

### Responsive behavior

```
  Desktop (>=640px):
  autumn · 3h
  [*] Bloom · [🍳] Food Review

  Mobile (<640px):
  autumn · 3h
  [*] · [🍳]
```

On mobile, labels hide. Icons alone carry the meaning. The auto blaze icon is always recognizable (Cherry = Bloom, Feather = Note). Custom blaze icons vary, but the tooltip/aria-label fills in what the eye can't.

### Color palette

Blazes use the lightest tint of their color family. They should feel like a gentle wash, not a loud badge. The goal is that you notice the pattern across multiple cards.

Colors are stored as a key in the database (`"rose"`, `"sky"`) and mapped to full Tailwind class strings in code. This keeps the Tailwind content scanner happy, since all classes appear as static strings in source files.

```typescript
/**
 * Blaze color palette. Every key here is a valid value for
 * blaze_definitions.color. The class strings are written as
 * static literals so Tailwind sees them at build time.
 */
const BLAZE_COLORS: Record<string, BlazeColorClasses> = {
	grove: { classes: "bg-grove-50 text-grove-700 dark:bg-grove-900/30 dark:text-grove-300" },
	amber: { classes: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
	rose: { classes: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
	pink: { classes: "bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300" },
	sky: { classes: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
	violet: { classes: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
	yellow: { classes: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
	slate: { classes: "bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300" },
};
```

**Why code, not DB, for colors?** Tailwind's JIT compiler scans source files for class names. If `bg-rose-50` only exists in a D1 row, Tailwind never sees it and purges the class from the CSS bundle. By keeping every class string in a static code map, Tailwind always includes them.

### Color in context

```
  Light mode:                 Dark mode:

  ┌─────────────────┐         ┌─────────────────┐
  │ bg-grove-50      │         │ bg-grove-900/30  │
  │ text-grove-700   │         │ text-grove-300   │
  │  [*] Bloom       │         │  [*] Bloom       │
  └─────────────────┘         └─────────────────┘

  ┌─────────────────┐         ┌─────────────────┐
  │ bg-rose-50       │         │ bg-rose-900/30   │
  │ text-rose-700    │         │ text-rose-300    │
  │  [🍳] Food Review│         │  [🍳] Food Review│
  └─────────────────┘         └─────────────────┘
```

---

## Data Schema

### The blaze data flow

```
  GARDEN (origin)           RSS BRIDGE           MEADOW (feed)
  ──────────────            ──────────           ─────────────

  posts table               /api/feed            meadow_posts
  ┌─────────────┐           ┌────────┐           ┌────────────┐
  │ id           │──────────▶│ <item> │──────────▶│ id          │
  │ tenant_id    │  query    │ <title>│  poller   │ tenant_id   │
  │ title        │           │ <grove:│  upsert   │ title       │
  │ blaze ← NEW │───────────▶│ blaze>│───────────▶│ blaze ← NEW│
  └─────────────┘           └────────┘           └────────────┘
       ↑                                              ↑
  Flow/Markdown                              Notes also get
  Editor sets blaze                          blazes (user picks
  on publish                                 in ComposeBox)

  blaze_definitions table (shared D1)
  ┌───────────────────────────────────┐
  │ id | tenant_id | slug | label    │
  │    | NULL=global| icon | color   │
  └───────────────────────────────────┘
       ↑                    ↑
  Global defaults     User-created
  (seeded)            (per garden)
```

### Migration: `085_blazes.sql`

```sql
-- ============================================================================
-- 085: Blazes — Content Markers
-- ============================================================================
-- Adds the blaze system: a definitions table for global and tenant-scoped
-- blaze types, plus a blaze column on both posts and meadow_posts.
--
-- Auto-blazes (Bloom/Note) are derived from post_type in code and are NOT
-- stored here. This table holds custom blaze definitions only.
-- ============================================================================

-- Blaze definitions: global defaults (tenant_id NULL) + tenant custom
CREATE TABLE IF NOT EXISTS blaze_definitions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(tenant_id, slug),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blaze_definitions_tenant
  ON blaze_definitions(tenant_id);

-- Add optional custom blaze to garden posts (Slot 2)
ALTER TABLE posts ADD COLUMN blaze TEXT;

-- Add optional custom blaze to meadow posts (Slot 2)
ALTER TABLE meadow_posts ADD COLUMN blaze TEXT;

-- Index for blaze-filtered queries (future feature)
CREATE INDEX IF NOT EXISTS idx_posts_blaze
  ON posts(blaze) WHERE blaze IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meadow_posts_blaze
  ON meadow_posts(blaze) WHERE blaze IS NOT NULL;

-- Seed global default blazes
INSERT INTO blaze_definitions (id, tenant_id, slug, label, icon, color, sort_order) VALUES
  ('blaze-update',       NULL, 'update',       'Update',       'Bell',              'sky',    1),
  ('blaze-food-review',  NULL, 'food-review',  'Food Review',  'UtensilsCrossed',   'rose',   2),
  ('blaze-personal',     NULL, 'personal',     'Personal',     'Heart',             'pink',   3),
  ('blaze-tutorial',     NULL, 'tutorial',     'Tutorial',     'GraduationCap',     'violet', 4),
  ('blaze-project',      NULL, 'project',      'Project',      'Hammer',            'amber',  5),
  ('blaze-review',       NULL, 'review',       'Review',       'Star',              'yellow', 6),
  ('blaze-thought',      NULL, 'thought',      'Thought',      'CloudSun',          'slate',  7),
  ('blaze-announcement', NULL, 'announcement', 'Announcement', 'Megaphone',         'grove',  8);
```

### Schema notes

**`blaze_definitions.tenant_id`**: NULL means global (shipped with Grove). Non-null means tenant-scoped (created by a wanderer for their garden). The `UNIQUE(tenant_id, slug)` constraint means the same slug can exist globally and per-tenant without collision, since SQL treats NULL as distinct in unique constraints.

**`posts.blaze` and `meadow_posts.blaze`**: A TEXT column storing the custom blaze slug. Not a foreign key. This is intentional. Foreign keys would complicate the RSS bridge (the poller would need to resolve IDs) and create cascade headaches (deleting a blaze definition would NULL out all posts). Storing the slug keeps things simple: the slug travels through RSS as a string, gets stored as a string, and gets looked up at render time.

**What happens when a slug doesn't resolve?** The Blaze component renders a neutral fallback: the slug as a titlecased label with a default icon and slate color. "late-night-thoughts" becomes "Late Night Thoughts" in a grey pill. No crash, no missing badge, just graceful degradation.

---

## Component Architecture

### Module structure

Blazes are an engine-level concern, not Meadow-specific. Garden posts and Meadow posts both use them. The shared component lives in the engine.

```
libs/engine/
├── src/lib/blazes/                        ← NEW module
│   ├── index.ts                           ← public exports
│   ├── types.ts                           ← BlazeDefinition, BlazeColor
│   └── palette.ts                         ← BLAZE_CONFIG, BLAZE_COLORS
│
├── src/lib/ui/components/indicators/
│   ├── Blaze.svelte                       ← NEW: shared badge component
│   └── index.ts                           ← re-export Blaze
│
├── package.json                           ← ADD export: "./blazes"
│
└── migrations/
    └── 085_blazes.sql                     ← NEW migration
```

**Export path:** `@autumnsgrove/lattice/blazes`

This follows the engine-first pattern. Any app that needs blaze types or config imports from the engine. The Blaze Svelte component is available via `@autumnsgrove/lattice/ui/indicators`.

### Type definitions

```typescript
// libs/engine/src/lib/blazes/types.ts

import type { Component } from "svelte";

/** Auto-blaze config for Slot 1 (derived from post_type) */
export interface AutoBlazeConfig {
	label: string;
	icon: Component;
	/** Full Tailwind class string (static for scanner) */
	classes: string;
}

/** A blaze definition from the database (Slot 2) */
export interface BlazeDefinition {
	id: string;
	tenantId: string | null;
	slug: string;
	label: string;
	/** Lucide icon name as a string (e.g. "UtensilsCrossed") */
	icon: string;
	/** Color palette key (e.g. "rose", "sky") */
	color: string;
	sortOrder: number;
}

/** Resolved color classes for a palette key */
export interface BlazeColorClasses {
	classes: string;
}
```

### Blaze component: `Blaze.svelte`

A single shared component that can render either an auto blaze or a custom blaze. Used in both Meadow PostCard and Garden post views.

```svelte
<!--
  Blaze — Content marker badge.

  Renders a small pill with icon + label. Can display either an auto blaze
  (from BLAZE_CONFIG) or a custom blaze (from a BlazeDefinition).
  Label collapses on mobile viewports.
-->
<script lang="ts">
	import { BLAZE_CONFIG, BLAZE_COLORS, resolveLucideIcon } from "$lib/blazes";

	interface AutoProps {
		/** Auto blaze: pass the post type */
		postType: "bloom" | "note";
		definition?: never;
	}

	interface CustomProps {
		/** Custom blaze: pass the resolved definition */
		postType?: never;
		definition: { label: string; icon: string; color: string };
	}

	type Props = AutoProps | CustomProps;

	const { postType, definition }: Props = $props();

	const resolved = $derived.by(() => {
		if (postType) {
			const config = BLAZE_CONFIG[postType];
			return { icon: config.icon, label: config.label, classes: config.classes };
		}
		const colorClasses = BLAZE_COLORS[definition.color]?.classes ?? BLAZE_COLORS.slate.classes;
		return {
			icon: resolveLucideIcon(definition.icon),
			label: definition.label,
			classes: colorClasses,
		};
	});

	const Icon = $derived(resolved.icon);
</script>

<span
	class="inline-flex items-center gap-1 rounded-full px-2 py-0.5
         text-xs font-medium {resolved.classes}"
	aria-label="{resolved.label} post"
>
	<Icon class="w-3.5 h-3.5" aria-hidden="true" />
	<span class="hidden sm:inline">{resolved.label}</span>
</span>
```

### Icon resolution

Custom blazes store the Lucide icon name as a string (`"UtensilsCrossed"`). At render time, the component needs to resolve this to an actual Svelte component. A small resolver function maps strings to Lucide imports.

```typescript
// libs/engine/src/lib/blazes/palette.ts (excerpt)

import {
	Bell,
	UtensilsCrossed,
	Heart,
	GraduationCap,
	Hammer,
	Star,
	CloudSun,
	Megaphone,
	HelpCircle,
} from "@lucide/svelte";
import type { Component } from "svelte";

/** Map of icon names to Lucide components for custom blazes */
const LUCIDE_ICON_MAP: Record<string, Component> = {
	Bell,
	UtensilsCrossed,
	Heart,
	GraduationCap,
	Hammer,
	Star,
	CloudSun,
	Megaphone,
};

/** Resolve a Lucide icon name to a component. Falls back to HelpCircle. */
export function resolveLucideIcon(name: string): Component {
	return LUCIDE_ICON_MAP[name] ?? HelpCircle;
}
```

The icon map only includes icons used by global defaults plus a few extras. When a wanderer creates a custom blaze, they pick from a curated icon palette in the blaze picker UI. The palette and the icon map stay in sync.

---

## RSS Bridge

### The problem

Blooms originate as garden posts (`posts` table), get syndicated via RSS (`/api/feed`), and arrive in Meadow via the poller (`meadow_posts` table). If a wanderer sets a custom blaze on their garden post, that blaze needs to travel through RSS and land on the Meadow post.

### Custom RSS namespace

The feed endpoint adds a Grove-specific XML namespace:

```xml
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:grove="https://grove.place/xmlns/grove/1.0">

  <channel>
    ...
    <item>
      <title>The Best Ramen in Portland</title>
      <grove:blaze>food-review</grove:blaze>
      ...
    </item>
  </channel>
</rss>
```

The `<grove:blaze>` element carries the custom blaze slug. If no custom blaze is set, the element is omitted.

### Feed endpoint changes

In `libs/engine/src/routes/api/feed/+server.ts`, the D1 query adds `blaze` to the SELECT, and the XML builder emits `<grove:blaze>` when present.

```typescript
// Add to D1Post interface:
interface D1Post {
	// ...existing fields
	blaze: string | null; // custom blaze slug
}

// Add to SQL query:
`SELECT slug, title, description, html_content, tags,
        published_at, featured_image, updated_at, blaze
 FROM posts
 WHERE tenant_id = ? AND status = 'published'
   AND (meadow_exclude IS NULL OR meadow_exclude != 1)
 ORDER BY published_at DESC
 LIMIT 50`;

// Add to item XML generation:
const blazeElement = post.blaze
	? `\n      <grove:blaze>${escapeXml(post.blaze)}</grove:blaze>`
	: "";
```

### Poller changes

In `workers/meadow-poller/src/index.ts`, the parser extracts `grove:blaze` from each item, and the upsert includes the blaze column.

The poller already uses `fast-xml-parser`. The Grove namespace element will be available as `grove:blaze` or `grove_blaze` depending on parser config. The parser config should preserve namespace prefixes.

```typescript
// In upsertPosts, add blaze to INSERT:
`INSERT INTO meadow_posts
  (id, tenant_id, guid, title, description, content_html, link,
   author_name, author_subdomain, tags, featured_image,
   published_at, fetched_at, content_hash, blaze)
 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
 ON CONFLICT(tenant_id, guid) DO UPDATE SET
   ...existing conflict resolution,
   blaze = excluded.blaze`;
```

### Notes (no RSS involved)

Notes are created directly in Meadow via the ComposeBox. When composing a note, the wanderer can optionally pick a custom blaze from a dropdown. The blaze slug is included in the POST payload and stored directly on the `meadow_posts` row. No RSS involved.

---

## API Surface

### List available blazes

**GET** `/api/blazes`

Returns all blazes available to the current context: global defaults plus the tenant's custom definitions (if authenticated).

```json
{
	"blazes": [
		{ "slug": "update", "label": "Update", "icon": "Bell", "color": "sky", "scope": "global" },
		{
			"slug": "food-review",
			"label": "Food Review",
			"icon": "UtensilsCrossed",
			"color": "rose",
			"scope": "global"
		},
		{
			"slug": "late-night-thoughts",
			"label": "Late Night Thoughts",
			"icon": "Moon",
			"color": "violet",
			"scope": "tenant"
		}
	]
}
```

### Create custom blaze

**POST** `/api/blazes` (authenticated, tenant-scoped)

```json
{
	"slug": "late-night-thoughts",
	"label": "Late Night Thoughts",
	"icon": "Moon",
	"color": "violet"
}
```

Validation: slug must be URL-safe (lowercase alphanumeric + hyphens), label max 30 characters, icon must exist in the allowed icon palette, color must exist in `BLAZE_COLORS`.

### Delete custom blaze

**DELETE** `/api/blazes/:slug` (authenticated, tenant-scoped)

Deletes the definition. Existing posts with this blaze slug keep the slug value. They'll render with the graceful fallback (titlecased slug, neutral style).

### Set blaze on a post

This is handled by the existing post create/update endpoints. The `blaze` field is added to the post payload alongside title, body, tags, etc. Not a separate endpoint.

---

## Integration Points

### Meadow feed

PostCard.svelte adds the Blaze component to the metadata area. The auto blaze always renders. The custom blaze renders only if `post.blaze` is non-null and resolves against the definitions loaded at page level.

```
  Before:
  ┌─────────────────────────────────────────────────────────┐
  │  [avatar]  author name                                  │
  │            subdomain.grove.place · 3h ago               │
  └─────────────────────────────────────────────────────────┘

  After:
  ┌─────────────────────────────────────────────────────────┐
  │  [avatar]  author name                                  │
  │            subdomain.grove.place · 3h ago               │
  │            [*] Bloom · [🍳] Food Review                  │
  └─────────────────────────────────────────────────────────┘
```

### Feed filter tabs

The FeedFilters component already has "Notes" and "Blooms" tabs. These filter by `post_type` at the query level. Blazes complement this by marking individual posts within a mixed view.

```
  ┌──────────────────────────────────────────────────────┐
  │  [ All ]  [ Notes ]  [ Blooms ]  [ Popular ]  ...   │
  └──────────────────────────────────────────────────────┘
       ↑                                   ↑
       Blazes visible here       Blazes still visible
       (mixed types)             (all same type, but
                                  consistent marking)
```

Blazes appear on every post in every filter view. Consistency over cleverness.

### Garden posts

When editing a post in the Flow/Markdown editor, the author can select a custom blaze from a dropdown. The dropdown shows global defaults plus the tenant's custom blazes, each with its icon and color preview. The selected slug is saved to `posts.blaze`.

### ComposeBox (Meadow notes)

The ComposeBox for notes gets a small blaze picker: a row of icon buttons for the global defaults, with an option to expand and see all available blazes. Selecting one sets the blaze on the note. Tapping the selected blaze again deselects it.

---

## Accessibility

### Screen readers

Each blaze badge includes an `aria-label` that reads naturally: "Bloom post" or "Food Review post." The Lucide icon SVG is marked `aria-hidden="true"` since the label carries the semantic meaning.

On mobile, where the text label is visually hidden (`hidden sm:inline`), the `aria-label` on the parent span still announces the full name. Screen readers always hear the label regardless of viewport.

When both slots are present, they read as two separate elements: "Bloom post" followed by "Food Review post." This is accurate and unambiguous.

### Reduced motion

Blazes have no animation. They're static badges. No `prefers-reduced-motion` consideration needed.

### Color contrast

**Light mode** uses solid backgrounds with verifiable contrast ratios:

| Color  | Background            | Text                   | Approx. Ratio |
| ------ | --------------------- | ---------------------- | ------------- |
| grove  | `grove-50` (#f0fdf4)  | `grove-700` (#15803d)  | ~7.5:1        |
| amber  | `amber-50` (#fffbeb)  | `amber-700` (#b45309)  | ~6.8:1        |
| rose   | `rose-50` (#fff1f2)   | `rose-700` (#be123c)   | ~7.0:1        |
| sky    | `sky-50` (#f0f9ff)    | `sky-700` (#0369a1)    | ~7.2:1        |
| violet | `violet-50` (#f5f3ff) | `violet-700` (#6d28d9) | ~7.1:1        |

All exceed or approach WCAG AAA (7:1).

**Dark mode** uses alpha backgrounds that blend with the card surface. Verify ratios in browser devtools against the rendered composite. If any pairing falls below WCAG AA (4.5:1), replace the alpha background with its resolved solid equivalent.

### Touch targets

Blazes are informational, not interactive. No click handler, no link. Touch target size requirements (44x44px) only apply to interactive elements.

The blaze picker (in ComposeBox and post editor) does have interactive buttons. Those must meet the 44x44px minimum.

---

## Security

### Input validation

Custom blaze creation validates:

- `slug`: lowercase alphanumeric + hyphens, 2-40 characters, regex `^[a-z0-9][a-z0-9-]*[a-z0-9]$`
- `label`: 1-30 characters, sanitized for XSS
- `icon`: must exist in the allowed icon palette (whitelist, not arbitrary strings)
- `color`: must exist in `BLAZE_COLORS` keys (whitelist)

### Tenant isolation

Custom blazes are scoped by `tenant_id`. A wanderer can only create, edit, or delete blazes for their own garden. The API enforces this via session validation.

### RSS injection

The `<grove:blaze>` element in RSS carries a slug. The poller validates the slug format before storing. Invalid slugs are silently dropped. The slug is never rendered as raw HTML. The Blaze component renders the looked-up label, not the slug directly.

### Rate limiting

Custom blaze creation is rate-limited to prevent abuse. 20 definitions per tenant is the soft cap (enforced at the API level, not DB constraint). This is generous for personal expression and stingy enough to prevent spam.

---

## Implementation Checklist

### Phase 1: Engine module and migration

- [ ] Create `libs/engine/src/lib/blazes/types.ts` with type definitions
- [ ] Create `libs/engine/src/lib/blazes/palette.ts` with `BLAZE_CONFIG`, `BLAZE_COLORS`, `resolveLucideIcon`
- [ ] Create `libs/engine/src/lib/blazes/index.ts` with public exports
- [ ] Add `"./blazes"` export to `libs/engine/package.json`
- [ ] Create `libs/engine/migrations/085_blazes.sql`
- [ ] Run migration against remote D1

### Phase 2: Shared component

- [ ] Create `Blaze.svelte` in `libs/engine/src/lib/ui/components/indicators/`
- [ ] Export from `@autumnsgrove/lattice/ui/indicators`
- [ ] Verify responsive label collapse at `sm` breakpoint
- [ ] Verify all 8 color palette entries in light and dark mode
- [ ] Test fallback rendering for unknown slugs

### Phase 3: RSS bridge

- [ ] Add `blaze` to D1 query in `/api/feed` endpoint
- [ ] Add `xmlns:grove` namespace to RSS output
- [ ] Emit `<grove:blaze>` element for posts with custom blazes
- [ ] Update meadow-poller parser to extract `grove:blaze`
- [ ] Add `blaze` column to poller's INSERT/UPSERT statement
- [ ] Test round-trip: set blaze in garden, verify it appears in Meadow

### Phase 4: Meadow integration

- [ ] Add Blaze import to `PostCard.svelte`
- [ ] Render auto blaze (Slot 1) from `post.postType`
- [ ] Render custom blaze (Slot 2) from `post.blaze` when present
- [ ] Update `rowToPost()` to include `blaze` field
- [ ] Update `MeadowPost` type to include `blaze: string | null`
- [ ] Add blaze picker to ComposeBox for notes
- [ ] Test in feed with mixed content (All tab)
- [ ] Test in filtered views (Notes tab, Blooms tab)

### Phase 5: Garden integration

- [ ] Add blaze picker to post editor (Flow/Markdown)
- [ ] Wire blaze field into post create/update API
- [ ] Test blaze persistence through publish/edit cycle

### Phase 6: Custom blaze management

- [ ] Create `/api/blazes` GET endpoint (list available)
- [ ] Create `/api/blazes` POST endpoint (create custom)
- [ ] Create `/api/blazes/:slug` DELETE endpoint
- [ ] Add blaze management UI to garden settings
- [ ] Validate slug format, label length, icon whitelist, color whitelist
- [ ] Enforce 20-definition-per-tenant soft cap

### Phase 7: Polish

- [ ] Test with screen reader (VoiceOver)
- [ ] Verify dark mode contrast ratios against rendered card surface
- [ ] Check that blazes don't push the header to overflow on narrow viewports
- [ ] Test graceful degradation for deleted/unknown blaze slugs
- [ ] Add Waystone tooltip for "Blaze" if GroveTerm is rendered in Meadow

---

## Related Specs

- [Meadow](./meadow-spec.md). Parent system. Blazes appear in the Meadow feed.
- [Waystone](./waystone-spec.md). Help system. "Blaze" is in the GroveTerm manifest and could show a tooltip.
- [Canopy](./canopy-spec.md). Directory. If Canopy ever displays post previews, blazes may appear there too.

---

_Two marks on one tree. The first tells you the path. The second tells you why you're walking it._
