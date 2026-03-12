---
title: "Blazes Developer Guide"
description: "Two-slot content marker system for visual wayfinding across the Grove feed."
category: guides
guideCategory: content-community
lastUpdated: "2026-03-12"
aliases: []
tags:
  - blazes
  - content-markers
  - meadow
  - engine
  - svelte
  - icons
---

# Blazes Developer Guide

Blazes are small colored badges on post cards. Every post gets up to two: an automatic one that says what kind of post it is (Bloom or Note), and an optional custom one that says what the post is *about* (food review, tutorial, personal reflection). They sit in the card header, giving the feed visual rhythm without requiring anyone to read a word.

This guide covers how the system works, how to consume it, and how to extend it.

## How Blazes Work

A blaze is a pill-shaped badge with a Lucide icon and a label. On desktop you see both; on mobile the label hides and the icon stands alone. The icon carries `aria-hidden="true"` while the parent span gets an `aria-label`, so screen readers always announce the full name regardless of viewport.

The blaze module lives in the engine at `libs/engine/src/lib/blazes/` and exports through `@autumnsgrove/lattice/blazes`. The Svelte component lives at `libs/engine/src/lib/ui/components/indicators/Blaze.svelte`.

Five source files make up the whole system:

| File | Purpose |
|---|---|
| `types.ts` | Type definitions for auto-blazes, custom blazes, and API responses |
| `palette.ts` | Auto-blaze config, color palette, icon map, validation helpers |
| `resolve.ts` | Client-side slug resolution with three-tier fallback |
| `index.ts` | Public barrel (re-exports everything) |
| `palette.test.ts` | Unit tests for config, colors, icons, and defaults |

## The Two-Slot Model

Every post has two blaze slots.

**Slot 1 (auto)** is derived from `post_type` at render time. Blooms get a `NotebookText` icon in grove green. Notes get a `Feather` icon in amber. This slot is never stored in the database. The mapping lives in `BLAZE_CONFIG`, a `Record<PostType, AutoBlazeConfig>` keyed by `"bloom" | "note"`. Adding a new post type to the `PostType` union forces a compiler error here, which is the point.

**Slot 2 (custom)** is optional. The author picks a blaze when publishing. The chosen slug is stored as a plain `TEXT` column on the `posts` table (for garden posts) and `meadow_posts` table (for Meadow content). It is intentionally not a foreign key. The slug travels through RSS as a string, gets stored as a string, and gets resolved at render time.

When a custom blaze slug cannot be resolved, the system falls back gracefully. "late-night-thoughts" becomes "Late Night Thoughts" in a grey pill with a `HelpCircle` icon. No crash, no missing badge.

### Database Schema

The migration (`088_blazes.sql`) creates one table and adds one column to two existing tables:

```sql
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

-- Slug columns on both post tables
ALTER TABLE posts ADD COLUMN blaze TEXT;
ALTER TABLE meadow_posts ADD COLUMN blaze TEXT;
```

The `UNIQUE(tenant_id, slug)` constraint allows the same slug to exist globally (`tenant_id = NULL`) and per-tenant, because SQL treats NULL as distinct in unique constraints. The 8 global defaults are seeded with `tenant_id = NULL`.

## The Palette System

### Colors

Colors are stored as a named key (`"rose"`, `"sky"`, `"grove"`) in the database and mapped to full Tailwind class strings in code. This is a deliberate design choice: Tailwind's JIT compiler scans source files for class names. If `bg-rose-50` only existed in a D1 row, Tailwind would purge it from the CSS bundle.

The palette currently has 16 named colors:

```typescript
// From palette.ts — each entry is a static literal
export const BLAZE_COLORS: Record<string, BlazeColorClasses> = {
  grove:   { classes: "bg-grove-50 text-grove-700 dark:bg-grove-100/30 dark:text-grove-700" },
  amber:   { classes: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  rose:    { classes: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
  pink:    { classes: "bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300" },
  sky:     { classes: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
  violet:  { classes: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
  yellow:  { classes: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  slate:   { classes: "bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300" },
  red:     { classes: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  orange:  { classes: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  teal:    { classes: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" },
  emerald: { classes: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  cyan:    { classes: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300" },
  indigo:  { classes: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" },
  fuchsia: { classes: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300" },
  lime:    { classes: "bg-lime-50 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300" },
};
```

Each named color also has a representative hex swatch in `BLAZE_COLOR_HEX`, used by the settings color picker for visual previews.

### Custom Hex Colors

Beyond the 16 named colors, custom blazes can also use arbitrary hex colors (`#e88f7a`, `#3a9`). The Blaze component detects hex values with `isValidBlazeHexColor()` and renders them using a CSS custom property and `color-mix()`:

```css
.blaze-custom-hex {
  background: color-mix(in srgb, var(--blaze-hex) 15%, transparent);
  color: var(--blaze-hex);
}
```

In dark mode, the background opacity bumps to 20% and the text gets mixed toward white for readability. This avoids the need to register every possible hex value as a static Tailwind class.

### Validation Helpers

The palette exports two convenience arrays and two validation functions:

```typescript
VALID_BLAZE_COLORS  // string[] — all named color keys
VALID_BLAZE_ICONS   // string[] — all icon names in the icon map

isValidBlazeColor(color)     // true if named key OR valid hex (#rgb / #rrggbb)
isValidBlazeHexColor(color)  // true if valid hex only
```

The API layer uses these to validate custom blaze creation requests.

## Icon Resolution

Auto-blazes (Slot 1) store their icon as a direct Svelte component reference on the `AutoBlazeConfig`. No resolution needed.

Custom blazes (Slot 2) store the Lucide icon name as a string in the database (`"UtensilsCrossed"`, `"Moon"`). At render time, `resolveLucideIcon()` maps the string to an actual component:

```typescript
export function resolveLucideIcon(name: string): LucideIcon {
  return LUCIDE_ICON_MAP[name] ?? HelpCircle;
}
```

The `LUCIDE_ICON_MAP` is a curated set of roughly 35 icons organized into categories: the 8 default icons, plus groups for creative/writing, nature/growth, travel/exploration, lifestyle, and tech/work. Unknown names fall back to `HelpCircle`.

The `LucideIcon` type is defined as `typeof import("@lucide/svelte").Cherry`. This bridges the Svelte 4/5 component type incompatibility by using a concrete import rather than the generic `Component` type.

When adding a new icon to the map, import it from `@lucide/svelte` at the top of `palette.ts` and add it to `LUCIDE_ICON_MAP`. The icon will immediately appear in `VALID_BLAZE_ICONS` since that array is derived from the map's keys.

## The Resolution Flow

When a post card renders, the custom blaze slug goes through a three-tier resolution in `resolveBlaze()`:

```typescript
export function resolveBlaze(
  blazeSlug: string | null | undefined,
  serverDef?: BlazeDisplayDef | null,
): BlazeDisplayDef | null {
  if (!blazeSlug) return null;

  // 1. Prefer server-hydrated definition (includes tenant custom blazes)
  if (serverDef) return serverDef;

  // 2. Fall back to global defaults
  const global = BLAZE_SLUG_MAP[blazeSlug];
  if (global) return global;

  // 3. Last resort: humanize the slug
  const label = blazeSlug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return { label, icon: "HelpCircle", color: "slate" };
}
```

**Tier 1**: The server-side query LEFT JOINs `blaze_definitions` and sends the resolved label, icon, and color alongside the post data. This handles both global and tenant-scoped blazes.

**Tier 2**: If no server definition was hydrated (maybe the JOIN didn't match, or the data came from RSS without enrichment), the resolver checks the `GLOBAL_BLAZE_DEFAULTS` map. This is a pre-built `slug -> {label, icon, color}` lookup built from the 8 global defaults.

**Tier 3**: If neither matches, the slug itself is humanized. Hyphens become spaces, each word gets capitalized, and the result renders in slate grey with a question-mark icon.

The return type is `BlazeDisplayDef | null`. Null means no custom blaze was set. The Blaze component only renders Slot 2 when this returns a non-null value.

## Using the Blaze Component

The `Blaze.svelte` component accepts a discriminated union of props:

```svelte
<!-- Auto blaze (Slot 1) — pass post type -->
<Blaze postType="bloom" />
<Blaze postType="note" />

<!-- Custom blaze (Slot 2) — pass resolved definition -->
<Blaze definition={{ label: "Food Review", icon: "UtensilsCrossed", color: "rose" }} />

<!-- Custom blaze with hex color -->
<Blaze definition={{ label: "Cozy", icon: "Coffee", color: "#e88f7a" }} />
```

You pass either `postType` or `definition`, never both. TypeScript enforces this with `AutoProps` and `CustomProps` interfaces that use `never` on the other's field.

A typical post card renders both slots together:

```svelte
<Blaze postType={post.postType} />
{#if customBlaze}
  <Blaze definition={customBlaze} />
{/if}
```

## Adding a New Blaze Type

### Adding a new global default

1. Add a row to the migration seed data (or write a new migration that inserts into `blaze_definitions`).
2. Add the entry to `GLOBAL_BLAZE_DEFAULTS` in `palette.ts` so the client-side fallback map stays in sync.
3. If the icon is not already in `LUCIDE_ICON_MAP`, import it from `@lucide/svelte` and add the entry.
4. If the color is not already in `BLAZE_COLORS`, add a new entry with static class strings.
5. Run the palette tests: `cd libs/engine && bun vitest run src/lib/blazes/palette.test.ts`

### Adding a new named color

In `palette.ts`, add an entry to both `BLAZE_COLORS` and `BLAZE_COLOR_HEX`:

```typescript
// In BLAZE_COLORS:
stone: {
  classes: "bg-stone-50 text-stone-700 dark:bg-stone-900/30 dark:text-stone-300",
},

// In BLAZE_COLOR_HEX:
stone: "#78716c",
```

Write the class strings as static literals. Never construct them dynamically. Tailwind must see the exact strings in your source file.

### Adding a new icon to the palette

Import the icon from `@lucide/svelte` and add it to `LUCIDE_ICON_MAP` under the appropriate category comment:

```typescript
import { Tent } from "@lucide/svelte";

const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  // ...existing entries
  // Travel & Exploration
  Tent,
  // ...
};
```

The icon automatically becomes available in `VALID_BLAZE_ICONS`.

### Adding a new post type (auto-blaze)

1. Extend the `PostType` union in `types.ts`: `export type PostType = "bloom" | "note" | "thread";`
2. The compiler will immediately flag `BLAZE_CONFIG` in `palette.ts` as incomplete. Add the new entry there.
3. Choose a Lucide icon and a color from the existing palette.
4. Update the Blaze component's `AutoProps` interface if it hardcodes the union (it does: `postType: "bloom" | "note"`).

## RSS Bridge

Custom blazes travel through RSS using a Grove-specific XML namespace:

```xml
<rss version="2.0" xmlns:grove="https://grove.place/xmlns/grove/1.0">
  <channel>
    <item>
      <title>The Best Ramen in Portland</title>
      <grove:blaze>food-review</grove:blaze>
    </item>
  </channel>
</rss>
```

The feed endpoint at `/api/feed` includes the `blaze` column in its D1 query and emits `<grove:blaze>` for posts that have one set. The meadow-poller extracts the element and stores the slug on `meadow_posts.blaze`. If no custom blaze is set, the element is omitted entirely.

Notes created directly in Meadow through the ComposeBox skip RSS. Their blaze slug goes straight into `meadow_posts.blaze` on creation.

## Key Files

| Path | What it does |
|---|---|
| `libs/engine/src/lib/blazes/types.ts` | `PostType`, `AutoBlazeConfig`, `BlazeDefinition`, `BlazeColorClasses`, `BlazeResponse` |
| `libs/engine/src/lib/blazes/palette.ts` | `BLAZE_CONFIG`, `BLAZE_COLORS`, `BLAZE_COLOR_HEX`, `LUCIDE_ICON_MAP`, `resolveLucideIcon()`, `GLOBAL_BLAZE_DEFAULTS`, validation helpers |
| `libs/engine/src/lib/blazes/resolve.ts` | `resolveBlaze()`, `BlazeDisplayDef` |
| `libs/engine/src/lib/blazes/index.ts` | Public barrel, re-exports everything |
| `libs/engine/src/lib/blazes/palette.test.ts` | Unit tests (config shape, color count, icon map, global defaults) |
| `libs/engine/src/lib/ui/components/indicators/Blaze.svelte` | Svelte 5 component with discriminated union props |

## Quick Checklist

When working on blazes, keep these in mind:

- Color class strings must be static literals in source. Tailwind cannot scan dynamic strings from the database.
- `resolveLucideIcon()` falls back to `HelpCircle` for unknown names. It never throws.
- `resolveBlaze()` returns `null` for falsy slugs. It never returns an incomplete definition.
- The `LucideIcon` type is `typeof import("@lucide/svelte").Cherry`, not the generic Svelte `Component` type.
- `VALID_BLAZE_COLORS` and `VALID_BLAZE_ICONS` are derived from their respective maps at module load. They stay in sync automatically.
- Custom hex colors bypass the named palette entirely and use CSS `color-mix()` for rendering.
- Auto-blazes are never stored. If you need the auto-blaze for a post, read `post_type` and index into `BLAZE_CONFIG`.
- The slug column is not a foreign key. Deleting a blaze definition does not null out existing posts. They degrade gracefully.
- The engine needs a rebuild (`svelte-package`) for changes to appear in the `dist/` output that consumers import.
