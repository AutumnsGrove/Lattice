# GroveTerm Component Implementation Plan

**Issue:** #925 - Integrate Grove terminology UI and Waystone Lexicon Elements
**Scope:** Component only (no legacy term replacements)
**Date:** 2026-02-04

---

## Overview

Build the `<GroveTerm>` component that makes Grove terminology interactive—clickable terms that show definitions in a popup, styled with category-specific colors.

### Key Decisions
- **Popup:** Create new `GroveTermPopup.svelte` (different content structure than Waystone)
- **Data:** Generated JSON manifest from `grove-naming.md`
- **Colors:** CSS custom properties with light/dark mode support

---

## Component API

```svelte
<!-- Basic usage -->
<GroveTerm term="grove" />

<!-- Custom display text -->
<GroveTerm term="wanderer">wanderers</GroveTerm>

<!-- Inline in prose -->
<p>Welcome to your <GroveTerm term="grove" /> where <GroveTerm term="bloom">blooms</GroveTerm> grow.</p>

<!-- With static manifest -->
<GroveTerm term="heartwood" manifest={groveTermManifest} />
```

---

## File Structure

```
packages/engine/src/lib/
├── data/
│   └── grove-term-manifest.json          # Generated manifest
├── ui/components/ui/
│   ├── groveterm/
│   │   ├── index.ts                      # Exports
│   │   ├── types.ts                      # Type definitions
│   │   ├── GroveTerm.svelte              # Main component
│   │   └── GroveTermPopup.svelte         # Popup overlay
│   └── index.ts                          # Add exports here

scripts/generate/
└── grove-term-manifest.ts                # Build script
```

---

## Implementation Steps

### Phase 1: Types & Manifest Generator

#### 1.1 Create type definitions
**File:** `packages/engine/src/lib/ui/components/ui/groveterm/types.ts`

```typescript
export type GroveTermCategory =
  | "foundational"   // grove, garden, bloom, wanderer, rooted, pathfinder, wayfinder
  | "platform"       // heartwood, arbor, plant, amber, foliage, etc.
  | "content"        // wisp, reeds, meadow, forests, etc.
  | "tools"          // ivy, verge, forage, trove, etc.
  | "operations";    // lumen, zephyr, vista, patina, etc.

export interface GroveTermEntry {
  slug: string;              // URL-safe identifier
  term: string;              // Display name
  category: GroveTermCategory;
  tagline: string;           // One-line descriptor (e.g., "Your Space")
  definition: string;        // First paragraph, HTML
  usageExample?: string;     // Blockquote example
  seeAlso?: string[];        // Related term slugs
}

export type GroveTermManifest = Record<string, GroveTermEntry>;

export interface GroveTermCache {
  get(slug: string): GroveTermEntry | undefined;
  set(slug: string, entry: GroveTermEntry): void;
  has(slug: string): boolean;
}

export function createGroveTermCache(): GroveTermCache {
  const cache = new Map<string, GroveTermEntry>();
  return {
    get: (slug) => cache.get(slug),
    set: (slug, entry) => cache.set(slug, entry),
    has: (slug) => cache.has(slug),
  };
}
```

#### 1.2 Create manifest generator script
**File:** `scripts/generate/grove-term-manifest.ts`

Parse `docs/philosophy/grove-naming.md`:
- H3 headings (`### Term Name`) → term names
- Bold text after name (`**Category** · ...`) → category + tagline
- First paragraph → definition
- Blockquotes (`> "..."`) → usage examples
- Section mapping:
  - "The Heart of It All" → foundational
  - "Core Infrastructure" → foundational
  - "Platform Services" → platform
  - "Content & Community" → content
  - "Standalone Tools" → tools
  - "Operations" → operations
  - "User Identity" → foundational

Output: `packages/engine/src/lib/data/grove-term-manifest.json`

Run: `npx tsx scripts/generate/grove-term-manifest.ts`

---

### Phase 2: Components

#### 2.1 Create GroveTerm.svelte
**File:** `packages/engine/src/lib/ui/components/ui/groveterm/GroveTerm.svelte`

**Structure:**
- Renders as `<span>` with category-colored underline
- Click/tap opens GroveTermPopup
- Keyboard: Enter/Space to activate
- Preload on hover (150ms delay, following Waystone pattern)
- Progressive enhancement: plain text without JS

**Props:**
```typescript
interface Props {
  term: string;                    // Term slug (required)
  inline?: boolean;                // Default: true
  manifest?: GroveTermManifest;    // Static manifest (optional)
  class?: string;
  children?: Snippet;              // Override display text
}
```

**Reference:** `packages/engine/src/lib/ui/components/ui/waystone/Waystone.svelte`

#### 2.2 Create GroveTermPopup.svelte
**File:** `packages/engine/src/lib/ui/components/ui/groveterm/GroveTermPopup.svelte`

**Structure:**
- Header: Category badge (colored pill) + Term name + Tagline
- Body: Definition (prose), Usage example (blockquote, if present)
- Footer: "See also" term links (clickable, open that term's popup) + Close button
- Loading/error states

**Uses:** bits-ui Dialog, GlassCard, DialogOverlay (same as WaystonePopup)

**Reference:** `packages/engine/src/lib/ui/components/ui/waystone/WaystonePopup.svelte`

#### 2.3 Create index.ts
**File:** `packages/engine/src/lib/ui/components/ui/groveterm/index.ts`

```typescript
export { default as GroveTerm } from "./GroveTerm.svelte";
export { default as GroveTermPopup } from "./GroveTermPopup.svelte";
export * from "./types";
```

---

### Phase 3: Integration

#### 3.1 Export from ui/index.ts
**File:** `packages/engine/src/lib/ui/components/ui/index.ts`

Add:
```typescript
export { default as GroveTerm } from "./groveterm/GroveTerm.svelte";
export { default as GroveTermPopup } from "./groveterm/GroveTermPopup.svelte";
export * from "./groveterm/types";
```

#### 3.2 Build package
Run: `pnpm run package` in packages/engine

---

### Phase 4: Styling

#### 4.1 Category Colors

| Category | Light Mode | Dark Mode | Description |
|----------|------------|-----------|-------------|
| foundational | `#d97706` | `#fbbf24` | Warm gold (amber) |
| platform | `#16a34a` | `#22c55e` | Grove green |
| content | `#a855f7` | `#c084fc` | Soft purple |
| tools | `#f59e0b` | `#fcd34d` | Amber |
| operations | `#6b7280` | `#9ca3af` | Muted blue-gray |

CSS variables in component:
```css
.grove-term {
  --gt-foundational: #d97706;
  --gt-platform: #16a34a;
  --gt-content: #a855f7;
  --gt-tools: #f59e0b;
  --gt-operations: #6b7280;
}
.dark .grove-term {
  --gt-foundational: #fbbf24;
  --gt-platform: #22c55e;
  --gt-content: #c084fc;
  --gt-tools: #fcd34d;
  --gt-operations: #9ca3af;
}
```

#### 4.2 Visual Design

**GroveTerm trigger:**
- Colored underline (dotted or solid)
- Hover: underline thickens, subtle background
- Focus: visible outline
- Cursor: pointer

**GroveTermPopup:**
- GlassCard variant="frosted"
- Category badge (pill) top-left
- Max-width 500px
- Scrollable content area

---

### Phase 5: Accessibility

- `aria-label="Grove term: {term}"` on trigger
- `role="button"` with `tabindex="0"`
- Popup: `aria-labelledby`, `aria-describedby`
- Focus trap (bits-ui Dialog handles this)
- ESC to close
- `@media (prefers-reduced-motion: reduce)` for animations

---

## Critical Files Reference

| Purpose | File Path |
|---------|-----------|
| Waystone component pattern | `packages/engine/src/lib/ui/components/ui/waystone/Waystone.svelte` |
| Waystone popup pattern | `packages/engine/src/lib/ui/components/ui/waystone/WaystonePopup.svelte` |
| Type patterns | `packages/engine/src/lib/ui/components/ui/waystone/types.ts` |
| Source document | `docs/philosophy/grove-naming.md` |
| Script pattern | `scripts/generate/analyze-doc-keywords.ts` |
| UI exports | `packages/engine/src/lib/ui/components/ui/index.ts` |
| Package exports | `packages/engine/package.json` |
| Audit reference | `docs/audits/grove-lexicon-audit.md` |

---

## Verification

### Manual Testing
1. Import GroveTerm in a test page
2. Verify all 5 category colors render correctly
3. Click term → popup opens with correct definition
4. Tab navigation works, Enter/Space activates
5. ESC closes popup
6. Dark mode colors look correct
7. Screen reader announces "Grove term: X"

### Automated Testing
- Unit test manifest generator (correct parsing)
- Component test for click → popup flow
- A11y test for keyboard navigation

### Build Verification
```bash
cd packages/engine
pnpm run package
# Verify dist/ui/components/ui/groveterm/ exists
```

---

## Future Work (Out of Scope)

- Legacy term replacements (posts→blooms, blog→garden)
- Route renames (/blog → /garden)
- Remark plugin for markdown content
- API endpoint for dynamic fetching
- Integration across 400+ locations (per audit)
