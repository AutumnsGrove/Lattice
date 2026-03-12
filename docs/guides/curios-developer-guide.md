---
title: "Curios Developer Guide"
description: "How to understand, extend, and add new curio modules to Grove's cabinet of wonders."
category: guides
guideCategory: content-community
lastUpdated: "2026-03-12"
aliases: []
tags:
  - curios
  - widgets
  - modules
  - svelte
  - old-web
---

# Curios Developer Guide

Curios are standalone feature modules that bring personality to a Grove site. Hit counters, guestbooks, mood rings, polls, badges, ambient sounds. Each one is self-contained: its own types, constants, sanitization, utility functions, and tests, all living in a single directory under `libs/engine/src/lib/curios/`.

There are 22 curio modules today. Some are visitor-facing (guestbook, polls), some are developer-focused (timeline, pulse, journey), and some are purely decorative (clipart, cursors, ambient). They all follow the same structural pattern.

## How Curios Work

A curio has three layers:

1. **Module** (`libs/engine/src/lib/curios/<name>/index.ts`): Types, constants, validation, and utility functions. This is the core logic, shared between server and client.
2. **Admin route** (`libs/engine/src/routes/arbor/curios/<name>/`): SvelteKit pages where site owners configure the curio. Typically a `+page.server.ts` for data loading and form actions, plus a `+page.svelte` for the UI.
3. **Public rendering**: Svelte components (sometimes in the module itself, sometimes in route pages) that display the curio on a visitor's site.

The curios hub page at `/arbor/curios` lists every curio with its status, description, and a link to its admin page. Each curio card shows feature highlights and a "Configure" button.

## Curio Module Anatomy

Every curio module follows the same internal structure. Here's what you'll find in a typical `index.ts`:

### Types Section

Type aliases for configuration options, followed by interfaces for database records and display data. The pattern is to define a `*Record` interface (what's stored) and a `*Display` interface (what's sent to the frontend).

From the hit counter module:

```typescript
export type HitCounterStyle = "classic" | "odometer" | "minimal" | "lcd";

export interface HitCounterConfig {
  id: string;
  tenantId: string;
  pagePath: string;
  count: number;
  style: HitCounterStyle;
  label: string;
  showSinceDate: boolean;
  startedAt: string;
  countMode: HitCounterCountMode;
  sinceDateStyle: HitCounterSinceDateStyle;
}

export interface HitCounterDisplay {
  count: number;
  formattedCount: string;
  digits: string[];
  style: HitCounterStyle;
  label: string;
  showSinceDate: boolean;
  startedAt: string;
  sinceDateStyle: HitCounterSinceDateStyle;
}
```

### Constants Section

Display options arrays, default configs, validation sets, and limits. The display options arrays follow a consistent shape with `value`, `label`, and often `description` fields. These get passed to the admin UI to populate dropdowns and radio groups.

```typescript
export const HIT_COUNTER_STYLE_OPTIONS: {
  value: HitCounterStyle;
  label: string;
  description: string;
}[] = [
  { value: "classic", label: "Classic", description: "Frosted glass digit cells with grove-green glow" },
  { value: "odometer", label: "Odometer", description: "Warm mechanical flip counter with brass bezels" },
  // ...
];

export const DEFAULT_HIT_COUNTER_CONFIG: Omit<HitCounterConfig, "id" | "tenantId" | "startedAt"> = {
  pagePath: "/",
  count: 0,
  style: "classic",
  label: "You are visitor",
  showSinceDate: true,
  countMode: "every",
  sinceDateStyle: "footnote",
};
```

For validation, modules either export arrays of valid values or use `Set` objects:

```typescript
// Array style (hit counter)
export const VALID_COUNT_MODES: HitCounterCountMode[] = ["every", "unique"];

// Set style (mood ring, polls, badges)
export const VALID_MODES = new Set<string>(MODE_OPTIONS.map((m) => m.value));
```

Both approaches work. The `Set` style is more common in newer modules since `.has()` is cleaner than `.includes()` with type casting.

### Utility Functions Section

Every module imports `stripHtml` from the shared sanitization module and wraps it in domain-specific sanitizers:

```typescript
import { stripHtml } from "../sanitize";

export function sanitizeLabel(label: string | null | undefined): string {
  if (!label) return DEFAULT_LABEL;
  const cleaned = stripHtml(label).trim();
  if (cleaned.length === 0) return DEFAULT_LABEL;
  if (cleaned.length > MAX_LABEL_LENGTH) return cleaned.slice(0, MAX_LABEL_LENGTH);
  return cleaned;
}
```

The pattern is consistent: handle null/undefined, strip HTML, trim, check length, truncate if needed. Some sanitizers return `null` for empty input (mood ring, polls), others return a default value (hit counter). Follow whichever makes sense for your field.

Each module also exports an ID generator with a unique prefix:

```typescript
export function generateHitCounterId(): string {
  return `hc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
```

Prefixes help identify record types at a glance: `hc_` for hit counters, `ml_` for mood logs, `poll_` for polls, `tb_` for tenant badges, `cb_` for custom badges, `pv_` for poll votes.

A `toDisplay*()` function transforms database records into frontend-safe data:

```typescript
export function toDisplayCounter(config: HitCounterConfig): HitCounterDisplay {
  return {
    count: config.count,
    formattedCount: formatCount(config.count),
    digits: toDigits(config.count),
    style: config.style,
    label: config.label,
    showSinceDate: config.showSinceDate,
    startedAt: config.startedAt,
    sinceDateStyle: config.sinceDateStyle,
  };
}
```

## The Config Pattern

Curio configs follow a discriminated pattern where each option type is a string union, validated server-side against an exported constant. The admin `+page.server.ts` loads the config (or defaults) and passes the options arrays to the page. The page renders controls from those arrays. On save, the server validates each field against the allowed values and falls back to defaults for anything invalid.

From the hit counter admin route:

```typescript
// Load: pass config + all option arrays to the page
return {
  config: parsedConfig || { ...DEFAULT_HIT_COUNTER_CONFIG, startedAt: new Date().toISOString() },
  styleOptions: HIT_COUNTER_STYLE_OPTIONS,
  labelPresets: HIT_COUNTER_LABEL_PRESETS,
  countModeOptions: HIT_COUNTER_COUNT_MODE_OPTIONS,
  sinceDateStyleOptions: HIT_COUNTER_SINCE_DATE_STYLE_OPTIONS,
};

// Save: validate against allowed values, silent fallback
const validStyles = ["classic", "odometer", "minimal", "lcd"];
const finalStyle = validStyles.includes(style) ? style : DEFAULT_HIT_COUNTER_CONFIG.style;
const finalLabel = sanitizeLabel(label);
```

This pattern keeps the module as the single source of truth for what values are valid. The admin page never hardcodes option values. It renders whatever the module exports.

## Admin Route Structure

Admin routes live at `libs/engine/src/routes/arbor/curios/<name>/`. A typical route has:

- `+page.server.ts`: `load` function to fetch config from D1, `actions` object with form handlers (usually `save`, sometimes `reset` or `delete`)
- `+page.svelte`: Admin UI for configuring the curio

The server load function accesses `platform.env.CURIO_DB` for the D1 database and `locals.tenantId` for tenant scoping. All queries are tenant-scoped. The upsert pattern (INSERT ... ON CONFLICT DO UPDATE) is standard for config saves.

Form validation uses Zod schemas with `parseFormData`:

```typescript
const SaveHitCounterSchema = z.object({
  style: z.string().optional().default("classic"),
  label: z.string().optional().default(""),
  showSinceDate: z.string().optional(),
  countMode: z.string().optional().default("every"),
  sinceDateStyle: z.string().optional().default("footnote"),
});
```

Error handling uses the `ARBOR_ERRORS` catalog with `logGroveError` for structured error reporting.

## Rendering Pipeline

Curio components render on the public site through two paths:

**Simple curios** (hit counter, status badge, mood ring) render inline. The admin page stores config in D1, and the public page loads it and renders a Svelte component.

**Complex curios** (timeline, pulse) export their own Svelte components from the module barrel. The timeline module exports `Timeline` and `Heatmap` components directly:

```typescript
export { default as Timeline } from "./Timeline.svelte";
export { default as Heatmap } from "./Heatmap.svelte";
```

The pulse module exports six components (Pulse, PulseCompact, PulseIndicator, PulseStats, PulseHeatmap, PulseFeed, PulseTrends) as named re-exports from its barrel.

All curio components use Foliage theme CSS variables (`--color-primary`, `--color-text`, `--color-text-muted`, `--grove-overlay-8`, etc.) so they adapt to any theme.

## Sanitization

The shared `sanitize.ts` at the curios root provides `stripHtml()`:

```typescript
export function stripHtml(input: string): string {
  const MAX_PASSES = 10;
  let result = input;
  let previous = "";
  for (let i = 0; i < MAX_PASSES && previous !== result; i++) {
    previous = result;
    result = result.replace(/<[^>]*>/g, "");
  }
  return result;
}
```

It loops until stable because a single pass on `<<script>script>` produces `<script>`. The multi-pass approach catches nested injection attempts.

Every curio module wraps this in its own domain sanitizers (sanitizeLabel, sanitizeMoodText, sanitizeQuestion, sanitizeBadgeName, etc.) that add length limits and null handling. If your curio accepts user text, write a sanitizer. Always use `stripHtml` from `../sanitize`, not a local implementation.

## Adding a New Curio

Here's the end-to-end process for adding a new curio type.

### 1. Create the Module

Create a directory at `libs/engine/src/lib/curios/<yourname>/` with two files:

**`index.ts`** following the established structure:

```typescript
/**
 * YourName Curio
 *
 * One-line description of what this does.
 *
 * Features:
 * - Feature list for quick scanning
 */

// Types
export type YourStyle = "default" | "fancy";

export interface YourConfigRecord {
  tenantId: string;
  style: YourStyle;
  // ... your fields
  updatedAt: string;
}

export interface YourConfigDisplay {
  style: YourStyle;
  // ... display-safe fields
}

// Constants
export const STYLE_OPTIONS: { value: YourStyle; label: string; description: string }[] = [
  { value: "default", label: "Default", description: "The standard look" },
  { value: "fancy", label: "Fancy", description: "Something extra" },
];

export const VALID_STYLES = new Set<string>(STYLE_OPTIONS.map((s) => s.value));

export const MAX_TEXT_LENGTH = 200;

export const DEFAULT_CONFIG: Omit<YourConfigRecord, "tenantId" | "updatedAt"> = {
  style: "default",
};

// Utility functions
import { stripHtml } from "../sanitize";

export function generateYourId(): string {
  return `yn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isValidStyle(style: string): style is YourStyle {
  return VALID_STYLES.has(style);
}

export function sanitizeYourText(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = stripHtml(text).trim();
  if (cleaned.length === 0) return null;
  if (cleaned.length > MAX_TEXT_LENGTH) return cleaned.slice(0, MAX_TEXT_LENGTH);
  return cleaned;
}
```

**`index.test.ts`** with tests for your utilities:

```typescript
import { describe, it, expect } from "vitest";
import { generateYourId, isValidStyle, sanitizeYourText } from "./index";

describe("generateYourId", () => {
  it("generates ID with correct prefix", () => {
    expect(generateYourId()).toMatch(/^yn_/);
  });
});

describe("isValidStyle", () => {
  it("accepts valid styles", () => {
    expect(isValidStyle("default")).toBe(true);
    expect(isValidStyle("fancy")).toBe(true);
  });
  it("rejects invalid styles", () => {
    expect(isValidStyle("invalid")).toBe(false);
  });
});

describe("sanitizeYourText", () => {
  it("strips HTML", () => {
    expect(sanitizeYourText("<b>bold</b>")).toBe("bold");
  });
  it("returns null for empty input", () => {
    expect(sanitizeYourText("")).toBeNull();
    expect(sanitizeYourText(null)).toBeNull();
  });
});
```

### 2. Add to the Barrel

Export your module from `libs/engine/src/lib/curios/index.ts`. If your module has exports that collide with another module's names, use selective re-exports instead of `export *`:

```typescript
export {
  type YourConfigRecord,
  type YourConfigDisplay,
  STYLE_OPTIONS as YOUR_STYLE_OPTIONS,
  DEFAULT_CONFIG as DEFAULT_YOUR_CONFIG,
  // ...
} from "./yourname";
```

The barrel already demonstrates this approach for journey and pulse, which share a `CLEAR_TOKEN_VALUE` constant with timeline.

### 3. Create the Database Migration

Add a migration in `libs/engine/migrations/` for your curio's table. Follow existing curio table patterns: tenant_id foreign key, created_at/updated_at timestamps, JSON columns for complex config, and appropriate indexes.

### 4. Create the Admin Route

Add a route at `libs/engine/src/routes/arbor/curios/<yourname>/`:

- `+page.server.ts`: Load config from CURIO_DB, define Zod schema, implement save action
- `+page.svelte`: Build the admin UI using GlassCard, GlassButton, and other existing UI components

### 5. Register in the Hub

Add your curio to the `curios` array in `libs/engine/src/routes/arbor/curios/+page.svelte`. Each entry needs: id, name, description, icon (Lucide), status, href, and a features array (4 items).

### 6. Run Tests

```bash
cd libs/engine && npx vitest run src/lib/curios/yourname/
```

## Import Safety

Curios follow the barrel import safety rules that apply across the engine. Direct imports are always safer than barrel imports for Svelte files.

When importing curio utilities in server-side code (like `+page.server.ts`), use the `$lib/curios/<name>` alias:

```typescript
import { generateHitCounterId, sanitizeLabel, DEFAULT_HIT_COUNTER_CONFIG } from "$lib/curios/hitcounter";
```

For server-only modules (like timeline's envelope encryption), import the `.server.ts` file directly rather than through the barrel:

```typescript
// Correct: server-only import stays out of client bundles
import { encryptToken } from "$lib/curios/timeline/secrets.server";

// Wrong: re-exporting through the barrel would leak server code to clients
```

Components exported from curio modules (Timeline, Pulse, etc.) should be imported directly when used in Svelte files to avoid barrel cascade issues:

```typescript
// Prefer direct import
import Timeline from "$lib/curios/timeline/Timeline.svelte";

// Avoid barrel import in Svelte files
// import { Timeline } from "$lib/curios"; // barrel-ok if you've verified it
```

## Key Files

| Path | What It Is |
|------|-----------|
| `libs/engine/src/lib/curios/index.ts` | Barrel re-export for all curio modules |
| `libs/engine/src/lib/curios/sanitize.ts` | Shared `stripHtml()` used by all modules |
| `libs/engine/src/lib/curios/<name>/index.ts` | Core module: types, constants, utilities |
| `libs/engine/src/lib/curios/<name>/index.test.ts` | Unit tests for the module |
| `libs/engine/src/routes/arbor/curios/+page.svelte` | Hub page listing all curios |
| `libs/engine/src/routes/arbor/curios/<name>/+page.server.ts` | Admin data loading and form actions |
| `libs/engine/src/routes/arbor/curios/<name>/+page.svelte` | Admin configuration UI |
| `docs/specs/curios-spec.md` | Full spec with DB schemas and tier access |

## Quick Checklist

When adding a new curio:

- [ ] Module directory with `index.ts` and `index.test.ts`
- [ ] Types: config record interface and display interface
- [ ] Constants: option arrays, validation sets, limits, defaults
- [ ] Sanitization: domain-specific sanitizers using `stripHtml`
- [ ] ID generator with a unique prefix
- [ ] `toDisplay*()` transform function
- [ ] Tests for ID generation, validation, sanitization, and transform
- [ ] Barrel export in `libs/engine/src/lib/curios/index.ts`
- [ ] Database migration
- [ ] Admin route with `+page.server.ts` and `+page.svelte`
- [ ] Entry in the curios hub page array
- [ ] Import safety: direct imports in Svelte files, `$lib/curios/<name>` in server code
