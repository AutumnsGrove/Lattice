---
title: "Canopy Developer Guide"
description: "Opt-in wanderer directory where groves choose to be discovered."
category: guides
guideCategory: content-community
lastUpdated: "2026-03-12"
aliases: []
tags:
  - canopy
  - directory
  - discovery
  - landing
  - settings
---

# Canopy Developer Guide

Canopy is Grove's public wanderer directory. It lives at `grove.place/canopy` and shows every grove that has opted in to being found. No algorithms, no rankings. Just a shuffled grid of people who chose to be visible.

This guide covers how the system works, how wanderers opt in, how the directory query runs, how ordering works, and how to extend it.

## How Canopy Works

Canopy is a small system spread across three locations:

```
libs/engine/src/lib/config/canopy-categories.ts   # Category definitions + validation
libs/engine/src/lib/server/canopy-directory.ts     # Shared DB query (fetchCanopyDirectory)
libs/engine/src/lib/utils/shuffle.ts               # Seeded shuffle (seededShuffle)

apps/landing/src/routes/canopy/+page.server.ts     # SSR page load
apps/landing/src/routes/canopy/+page.svelte        # Directory UI
apps/landing/src/routes/api/canopy/+server.ts      # JSON API endpoint

libs/engine/src/routes/arbor/settings/+page.svelte # Opt-in UI in Arbor
```

The data flows in one direction:

1. A wanderer enables Canopy in their Arbor settings.
2. That writes four keys to `site_settings` (D1).
3. The landing app queries `site_settings` for all visible tenants.
4. Results are shuffled with a daily seed and rendered as glass cards.

No new tables. No cache layer. No build step. The entire system runs on the existing `site_settings` key-value table and a server-rendered SvelteKit page.

## The Opt-In Flow

Canopy is off by default. A wanderer opts in through the "Canopy" section in Arbor settings (`/arbor/settings`). The settings UI saves four keys via `PUT /api/admin/settings`:

| Key | Type | Default | Purpose |
|---|---|---|---|
| `canopy_visible` | `"true"` / `"false"` | `"false"` | Master toggle. Off means invisible. |
| `canopy_banner` | string (max 160) | `""` | Short line about the wanderer or their grove. |
| `canopy_categories` | JSON string array | `"[]"` | Selected categories from the predefined list. |
| `canopy_show_forests` | `"true"` / `"false"` | `"true"` | Show Forest memberships (future). |

Each key is saved as a separate API call. The settings component in Arbor loads them on mount via `GET /api/settings` and parses categories from JSON:

```typescript
const cats = settings.canopy_categories ? JSON.parse(settings.canopy_categories) : [];
canopyCategories = Array.isArray(cats) ? cats : [];
```

Disabling Canopy takes effect on the next directory page load. There is no propagation delay.

### Eligibility

A grove appears in the directory when all three conditions are met:

1. `canopy_visible` is `"true"` in `site_settings`
2. The tenant row has `active = 1` (not suspended)
3. The tenant has at least one published post (checked via `EXISTS` subquery on the `posts` table)

The query uses a live count from the `posts` table rather than `tenants.post_count`, which is a stale denormalized column that never gets updated.

## Categories

Canopy defines 13 predefined categories in `canopy-categories.ts`:

```typescript
export const CANOPY_CATEGORIES = [
  "writing", "photography", "art", "code", "music", "poetry",
  "gaming", "food", "travel", "science", "queer", "journal", "other",
] as const;

export type CanopyCategory = (typeof CANOPY_CATEGORIES)[number];
```

Each category has a display label defined in `CANOPY_CATEGORY_LABELS`. The mapping is straightforward (title case of the ID) but lives in a typed record so the UI doesn't need to do string transforms.

### Validation

Two helpers handle category data from the database:

`isValidCanopyCategory(category)` checks if a string is one of the 13 predefined values. Returns a type guard.

`parseCanopyCategories(categoriesJson)` takes the raw JSON string from `site_settings`, parses it, and filters out anything invalid. Returns an empty array on null input, parse failure, or non-array JSON. This is the function used by `fetchCanopyDirectory` when building wanderer objects.

```typescript
// Safe to call with any input
parseCanopyCategories(null);              // []
parseCanopyCategories('["writing"]');     // ["writing"]
parseCanopyCategories('["invalid"]');     // []
parseCanopyCategories('not json');        // []
```

### Adding a New Category

To add a category:

1. Add the new ID to the `CANOPY_CATEGORIES` array in `canopy-categories.ts`.
2. Add the display label to `CANOPY_CATEGORY_LABELS`.
3. That's it. The `CanopyCategory` type updates automatically. The settings UI in Arbor maps over `CANOPY_CATEGORIES` dynamically, so the new category appears in the checkbox grid without any template changes.

```typescript
// In canopy-categories.ts
export const CANOPY_CATEGORIES = [
  "writing", "photography", "art", "code", "music", "poetry",
  "gaming", "food", "travel", "science", "queer", "journal",
  "crafts",  // new
  "other",
] as const;

export const CANOPY_CATEGORY_LABELS: Record<CanopyCategory, string> = {
  // ... existing labels ...
  crafts: "Crafts",
  other: "Other",
};
```

No migration, no API change, no rebuild needed beyond the engine package.

## The Directory Query

`fetchCanopyDirectory(db)` in `canopy-directory.ts` runs two queries and returns all visible wanderers with their settings.

**Query 1: Visible tenants.** Joins `tenants` to `site_settings` on `canopy_visible = 'true'`, filters for `active = 1` and at least one published post. Returns tenant ID, subdomain, display name, and a live published post count via correlated subquery.

```sql
SELECT
  t.id, t.subdomain, t.display_name,
  (SELECT COUNT(*) FROM posts p
   WHERE p.tenant_id = t.id AND p.status = 'published') as published_count
FROM tenants t
INNER JOIN site_settings ts_visible
  ON t.id = ts_visible.tenant_id
  AND ts_visible.setting_key = 'canopy_visible'
  AND ts_visible.setting_value = 'true'
WHERE t.active = 1
  AND EXISTS (
    SELECT 1 FROM posts p
    WHERE p.tenant_id = t.id AND p.status = 'published'
  )
```

**Query 2: Settings for visible tenants.** Fetches `canopy_banner` and `canopy_categories` for all tenant IDs from the first query. Uses dynamic `IN (?)` placeholders.

The function groups settings by tenant, builds `CanopyWanderer` objects, and computes category counts (sorted by popularity, descending). Avatar and Forests fields are currently placeholders (`null` and `[]`).

### Return Type

```typescript
interface CanopyDirectoryResult {
  wanderers: CanopyWanderer[];   // All visible wanderers, unshuffled
  total: number;                 // Count of wanderers
  categories: CategoryCount[];   // Categories with usage counts, sorted by popularity
}
```

The function returns unshuffled results. Shuffling and filtering are the caller's responsibility.

## Daily Shuffle

Canopy shuffles the directory order daily so no grove is permanently at the top. The shuffle uses a seeded Fisher-Yates algorithm in `libs/engine/src/lib/utils/shuffle.ts`.

The seed is today's date as an ISO string (`"2026-03-12"`). This string is converted to a 32-bit integer by iterating its characters, then fed into a Linear Congruential Generator (LCG) to produce deterministic pseudo-random values for the Fisher-Yates swap indices.

```typescript
const today = new Date().toISOString().slice(0, 10);
const shuffled = seededShuffle(wanderers, today);
```

The same seed produces the same ordering on every request throughout the day. At midnight UTC, the date string changes and everyone gets a new position.

D1 doesn't support seeded `RANDOM()`, so this happens server-side after the query. For the current scale (under 1000 entries), fetching all rows and shuffling in memory is fine.

## API Endpoint

`GET /api/canopy` at `apps/landing/src/routes/api/canopy/+server.ts` exposes the directory as JSON. It accepts two optional query parameters:

| Param | Purpose |
|---|---|
| `category` | Filter to wanderers with this category |
| `q` | Search display name, banner, and subdomain (case-insensitive) |

The endpoint calls `fetchCanopyDirectory`, applies filters, shuffles with the daily seed, and returns the result. Error responses use structured error codes (`LANDING_DB_UNAVAILABLE`, `LANDING_OPERATION_FAILED`).

## Client-Side Filtering

The `+page.svelte` component handles search and category filtering entirely on the client. The full shuffled wanderer list arrives via SSR, and two reactive state variables drive the filtering:

```typescript
let searchQuery = $state('');
let selectedCategory = $state<CanopyCategory | null>(null);

let filteredWanderers = $derived.by(() => {
  let results = data.canopy.wanderers;
  if (selectedCategory) {
    results = results.filter(w => w.categories.includes(selectedCategory!));
  }
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    results = results.filter(w =>
      w.display_name.toLowerCase().includes(query) ||
      w.banner.toLowerCase().includes(query) ||
      w.subdomain.toLowerCase().includes(query)
    );
  }
  return results;
});
```

Category pills render from `data.canopy.categories` (the popularity-sorted list from the server). Each pill shows the label and count. The "All" pill clears the category filter.

The grid shows a wanderer count that updates as filters narrow the results. When filters produce zero results, the UI shows a "No wanderers match" state with a clear-filters button. When the entire directory is empty, it shows: "The canopy is growing. Be one of the first to rise into it."

## Key Files

| File | Role |
|---|---|
| `libs/engine/src/lib/config/canopy-categories.ts` | Category constants, types, validation helpers, setting key names |
| `libs/engine/src/lib/server/canopy-directory.ts` | `fetchCanopyDirectory` shared query function |
| `libs/engine/src/lib/utils/shuffle.ts` | `seededShuffle` for daily ordering |
| `apps/landing/src/routes/canopy/+page.server.ts` | SSR load function |
| `apps/landing/src/routes/canopy/+page.svelte` | Directory page with search, filter, and card grid |
| `apps/landing/src/routes/api/canopy/+server.ts` | JSON API endpoint |
| `libs/engine/src/routes/arbor/settings/+page.svelte` | Canopy settings section in Arbor |

## Quick Checklist

When working on Canopy:

- [ ] Categories live in `canopy-categories.ts`, not in the database. Add new ones there.
- [ ] The query uses `site_settings`, not `tenant_settings`. The table was renamed; the spec is slightly out of date.
- [ ] Published count comes from a live `posts` subquery, not `tenants.post_count`.
- [ ] `fetchCanopyDirectory` returns unshuffled results. Always shuffle before returning to the user.
- [ ] Avatars and Forests are placeholder fields (`null` and `[]`). They will be populated when those features integrate.
- [ ] Settings save as four separate `PUT` calls, not a batch. Each key is independent.
- [ ] The page is server-rendered. Filtering is client-side. The API endpoint does its own server-side filtering.
- [ ] Banners pass through Thorn (content moderation) before appearing. Custom category tags pass through Loam.
