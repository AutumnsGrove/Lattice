---
title: "Waystones Pop-up Architecture Plan"
status: completed
category: features
lastUpdated: "2026-02-22"
---

# Waystones Pop-up Architecture Plan

**Issue:** #860 — Research KB article format and plan content strategy
**Parent Epic:** #859 — Waystones: In-context help pop-ups instead of hard links

---

## Executive Summary

Transform Waystones from "eject to KB" links into in-context glass overlays that show help without breaking user flow. This research establishes the content strategy and architecture for the popup system.

---

## Current State Analysis

### What Exists Today

**Waystone Component** (`libs/engine/src/lib/ui/components/ui/Waystone.svelte`)

- Simple `<a>` tag with `?` icon
- Opens `https://grove.place/knowledge/help/{slug}` in new tab
- Used in 10+ admin panel locations
- Already accessible (44×44px touch target, screen reader labels, reduced-motion support)

**KB Article Structure** (150+ articles in `/docs/`)

- YAML frontmatter + Markdown
- Auto-generated: reading time, excerpts (200 char), table of contents
- Build-time rendered (no runtime filesystem on Cloudflare Workers)
- Average article: 3-15 KB, ~5 min read time

**Existing Overlay Patterns**

- `GlassConfirmDialog` — bits-ui Dialog + GlassCard (focus trap, escape, ARIA)
- `GlassOverlay` — Backdrop component with blur variants
- `DialogOverlay` primitive for consistent backdrop styling

---

## Key Questions Answered

### 1. Can we reuse existing KB content or do articles need summaries?

**Answer: Reuse with smart extraction.**

Articles already have:

- `description` field (1-sentence summary)
- Auto-generated `excerpt` (first paragraph, 200 chars)
- Structured headings for TOC

**Strategy:** Show `description` + first section (`## ` to next `## `) in overlay. This gives ~200-500 words of actionable content without overwhelming.

### 2. Should the overlay show full article or first section only?

**Answer: First section + "Read full article" link.**

Reasoning:

- Full articles are 5+ min reads — too long for overlay context
- First section typically contains the "what is this" answer
- Power users can click through for depth
- Respects the "non-blocking" Waystone principle

### 3. How do we handle articles with images/videos in overlay?

**Answer: Support images, defer video to full article.**

- Images: Render with `max-width: 100%` in overlay
- Videos: Replace with placeholder + "Watch video in full article" link
- Code blocks: Render normally (already styled)
- This keeps overlay focused and performant

### 4. Should we cache article content client-side?

**Answer: Yes, with two layers.**

1. **Build-time bundling** — Article excerpts bundled into a JSON manifest
2. **Runtime caching** — Full content fetched on-demand, cached in memory

This avoids network requests for common help lookups while keeping bundle size reasonable.

---

## Content Strategy

### Excerpt Generation Rules

```typescript
interface WaystoneExcerpt {
	slug: string;
	title: string;
	description: string; // From frontmatter
	firstSection: string; // Content from H1 to first H2
	readingTime: number; // Minutes for full article
	hasMedia: boolean; // Affects overlay sizing
}
```

**Extraction algorithm:**

1. Parse frontmatter for `title`, `description`
2. Find first `## ` heading (or end of content)
3. Extract content between `# Title` and first `## `
4. Strip any `![video]` embeds, keep `![image]`
5. Render to HTML with existing markdown pipeline

### Article Requirements for Waystones

Not all KB articles need Waystone excerpts. Target articles that:

- Answer "what is this?" questions
- Explain features visible in the admin panel
- Are linked from existing Waystone placements

**Current Waystone-linked articles** (from integration plan):

- `custom-fonts`, `choosing-a-theme`, `what-is-rings`
- `what-are-trails`, `what-is-journey`, `what-is-gallery`
- `what-are-curios`, `how-grove-protects-your-secrets`
- `your-data-and-exports`

### Short Field vs Auto-Truncate

**Decision: Auto-truncate, no new field.**

Reasoning:

- Adding `short` field to 150+ articles is high maintenance
- First section + description provides consistent quality
- Writers already structure articles with "what is it" at top
- Can add `waystoneExcerpt` override field later if needed

---

## Technical Architecture

### Component Hierarchy

```
WaystonePopup.svelte (new)
├── GlassCard variant="frosted"
│   ├── Header (title + close button)
│   ├── Content (rendered excerpt)
│   └── Footer ("Read full article" link)
└── Wrapped in bits-ui Dialog (accessibility)

Waystone.svelte (modified)
├── Click handler → open popup
├── Fallback → link behavior if JS disabled
└── Props: slug, label, size, inline (unchanged)
```

### Data Flow

```
Build Time:
  docs/*.md → docs-scanner.ts → waystone-manifest.json

Runtime:
  User clicks Waystone
    → Check manifest cache
    → If excerpt exists → render immediately
    → If not → fetch from /api/kb/excerpt/{slug}
    → Display in WaystonePopup
```

### API Endpoint (new)

```typescript
// libs/engine/src/routes/api/kb/excerpt/[slug]/+server.ts
GET /api/kb/excerpt/{slug}

Response:
{
  title: string,
  description: string,
  excerpt: string,      // First section HTML
  fullArticleUrl: string,
  readingTime: number
}
```

### Manifest Structure

```typescript
// Generated at build: libs/engine/static/waystone-manifest.json
{
  "custom-fonts": {
    title: "Custom Fonts",
    description: "How to change your blog's typography",
    excerptLength: 342,  // Chars, for lazy loading decisions
    hasMedia: false
  },
  // ... all waystone-linked articles
}
```

---

## UI Design (Chameleon's Eye)

### Overlay Specifications

| Property       | Value                       | Reasoning                           |
| -------------- | --------------------------- | ----------------------------------- |
| **Width**      | `max-w-lg` (512px)          | Readable line length                |
| **Max Height** | `max-h-[70vh]`              | Prevents full-screen takeover       |
| **Backdrop**   | `GlassOverlay` dark variant | Consistent with dialogs             |
| **Animation**  | `fade-in` + `slide-up`      | Feels like rising from the Waystone |
| **Z-index**    | `z-grove-modal`             | Below Arbor sidebar                 |
| **Mobile**     | Full-width bottom sheet     | Touch-friendly dismiss              |

### Visual Treatment

```
┌─────────────────────────────────────────────┐
│ [Icon] Custom Fonts                     [X] │  ← Header with close
├─────────────────────────────────────────────┤
│                                             │
│ Grove lets you choose from a curated        │
│ selection of fonts for your blog.           │  ← Description
│                                             │
│ ## Choosing a Font                          │
│                                             │
│ From your admin panel, navigate to          │  ← First section
│ Settings → Typography. You'll see...        │
│                                             │
│ [Screenshot of typography panel]            │  ← Images supported
│                                             │
├─────────────────────────────────────────────┤
│ 📖 Read full article (5 min)      [Link →] │  ← Footer
└─────────────────────────────────────────────┘
```

### Accessibility Requirements

- Focus trap while open
- Escape to close
- Click outside to close
- Screen reader: "Help dialog: {title}"
- Reduced motion: instant show/hide

---

## Implementation Phases

### Phase 1: Content Pipeline (This Issue)

1. ✅ Document KB article structure
2. ✅ Identify Waystone-linked articles
3. ✅ Design excerpt extraction strategy
4. Create `waystone-manifest.json` generator
5. Add excerpt API endpoint

### Phase 2: Component Development (#861)

1. Create `WaystonePopup.svelte`
2. Build on bits-ui Dialog + GlassCard
3. Handle loading states, errors
4. Mobile bottom sheet variant

### Phase 3: Integration (#863)

1. Modify `Waystone.svelte` to use popup
2. Add fallback for no-JS
3. Keyboard navigation
4. Analytics tracking (Rings)

### Phase 4: Polish

1. Animation refinement
2. Preloading on hover
3. Cache warming strategy
4. Performance audit

---

## Files to Modify/Create

| File                                                        | Action | Purpose                   |
| ----------------------------------------------------------- | ------ | ------------------------- |
| `apps/landing/src/lib/server/waystone-excerpts.ts`          | Create | Generate excerpt manifest |
| `libs/engine/src/routes/api/kb/excerpt/[slug]/+server.ts`   | Create | Excerpt API               |
| `libs/engine/src/lib/ui/components/ui/WaystonePopup.svelte` | Create | Popup component           |
| `libs/engine/src/lib/ui/components/ui/Waystone.svelte`      | Modify | Add popup trigger         |
| `libs/engine/static/waystone-manifest.json`                 | Create | Build artifact            |

---

## Verification Plan

1. **Unit test excerpt extraction** — Various article formats
2. **Visual test popup** — All viewport sizes
3. **A11y audit** — aXe, screen reader walkthrough
4. **Performance check** — No layout shift, fast open
5. **Integration test** — Click Waystone → popup opens → link works

---

## Design Decisions (Confirmed)

| Decision             | Choice       | Reasoning                                                                |
| -------------------- | ------------ | ------------------------------------------------------------------------ |
| **Mobile pattern**   | Bottom sheet | Natural touch interaction, thumb-friendly dismiss, modern mobile pattern |
| **Preload behavior** | On hover     | Content feels instant, better perceived performance                      |

### Mobile Bottom Sheet Specs

```
┌─────────────────────────────────────────────┐
│ [Grab handle]                               │  ← Drag to dismiss
├─────────────────────────────────────────────┤
│ [Icon] Custom Fonts                     [X] │
│                                             │
│ (Content scrollable within sheet)           │
│                                             │
├─────────────────────────────────────────────┤
│ 📖 Read full article                   [→] │
└─────────────────────────────────────────────┘
```

- Slides up from bottom
- Drag down to dismiss (touch gesture)
- Max height: 70vh (leaves context visible)
- Snap points: closed → partial (50vh) → expanded (70vh)

### Preload Implementation

```typescript
// On Waystone hover (desktop) or focus (keyboard)
function handlePointerEnter() {
	// Start fetching after 150ms delay (avoids flash hovers)
	preloadTimer = setTimeout(() => {
		prefetchExcerpt(slug);
	}, 150);
}

// Cache in memory for session
const excerptCache = new Map<string, WaystoneExcerpt>();
```

---

_The Eagle has surveyed the territory. The path forward is clear._ 🦅
