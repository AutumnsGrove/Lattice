---
title: GroveTerm Full Integration Plan
description: Complete rollout of interactive Grove terminology across the platform
status: planning
created: "2026-02-04"
updated: "2026-02-04"
depends_on: ["PR #947 - GroveTerm Simplification"]
---

# GroveTerm Full Integration Plan

> _The grove speaks its own language. Every glowing word is an invitation to understand._

---

## Overview

With the GroveTerm component simplified (internal manifest, no extra imports needed), we can now integrate it across the entire platform. This plan covers the complete rollout from admin pages to public-facing content.

**What GroveTerm Does:**

- Renders terminology as styled, interactive elements
- Shows definitions on hover (tooltip) with full popup on click (fallback)
- Color-codes by category (foundational, platform, content, tools, operations)
- Teaches the Grove lexicon organically as Wanderers explore

**Current State (after PR #947):**

- Component simplified: `<GroveTerm term="bloom">blooms</GroveTerm>`
- Initial integration in 3 admin pages (arbor dashboard, garden, account features)
- 51 terms defined in grove-term-manifest.json

---

## Key Decisions

| Question                  | Decision                            | Rationale                                             |
| ------------------------- | ----------------------------------- | ----------------------------------------------------- |
| `[[term]]` in user blogs? | **YES**                             | Wanderers should speak the language too               |
| GroveTerm in emails?      | **Skip**                            | Can't render Svelte; small loss, not worth complexity |
| Tooltip vs Popup?         | **Tooltip primary, popup fallback** | Minimally intrusive; full Waystone behavior on click  |

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GROVETERM INTEGRATION MAP                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │   PHASE 1    │   │   PHASE 2    │   │   PHASE 3    │        │
│  │   Arbor      │──▶│   Public     │──▶│   Workshop   │        │
│  │   (Admin)    │   │   Pages      │   │   & Docs     │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│         │                 │                   │                 │
│         ▼                 ▼                   ▼                 │
│  • Dashboard        • Landing           • Vineyard             │
│  • Garden           • Pricing           • TermGallery          │
│  • Settings         • Knowledge         • KB articles          │
│  • Features         • Onboarding        • "Using [[term]]"     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐                           │
│  │   PHASE 4    │   │   PHASE 5    │                           │
│  │   Content    │──▶│   Polish     │                           │
│  │   System     │   │   & Scale    │                           │
│  └──────────────┘   └──────────────┘                           │
│         │                 │                                     │
│         ▼                 ▼                                     │
│  • Remark plugin    • Performance                              │
│  • [[term]] syntax  • A11y audit                               │
│  • User blogs       • Mobile UX                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Complete Arbor Integration (Admin Panel)

**Goal:** Every Grove term in the admin panel becomes interactive.

**Status:** 🟡 In Progress (3/12 pages done in PR #947)

### Target Files

| File                                    | Terms to Wrap          | Priority |
| --------------------------------------- | ---------------------- | -------- |
| `arbor/+page.svelte`                    | ✅ Rooted, Blooms      | Done     |
| `arbor/garden/+page.svelte`             | ✅ Garden, blooms      | Done     |
| `arbor/account/FeaturesCard.svelte`     | ✅ Wanderers           | Done     |
| `arbor/analytics/+page.svelte`          | Rings, Wanderers       | High     |
| `arbor/settings/+page.svelte`           | Grove, Garden, Foliage | High     |
| `arbor/curios/+page.svelte`             | Curios                 | High     |
| `arbor/timeline/+page.svelte`           | Trail                  | Medium   |
| `arbor/images/+page.svelte`             | Amber                  | Medium   |
| `arbor/account/SubscriptionCard.svelte` | Rooted, membership     | Medium   |
| `arbor/account/DataExportCard.svelte`   | Blooms, Grove          | Medium   |
| `arbor/reserved-usernames/+page.svelte` | Wanderers, Loam        | Low      |
| `arbor/comped-invites/+page.svelte`     | Wanderers              | Low      |

### Implementation Pattern

```svelte
<script>
  import { GroveTerm } from '$lib/ui';
  // ... rest of imports
</script>

<!-- Wrap terms naturally in context -->
<p>View your <GroveTerm term="rings">Rings</GroveTerm> analytics</p>
<p>Privacy-first insights on how <GroveTerm term="wanderer">Wanderers</GroveTerm> explore</p>
```

### Estimated Effort

- ~2-3 hours for remaining 9 pages
- Simple import + wrap pattern
- No structural changes needed

---

## Phase 2: Public Pages Integration

**Goal:** Introduce the lexicon to visitors before they even sign up.

### Landing Page (`packages/landing`)

| Location        | Terms                   | Notes                                |
| --------------- | ----------------------- | ------------------------------------ |
| Homepage hero   | Grove                   | "Your own grove on the indie web"    |
| Feature section | Garden, Blooms          | "Tend your garden, grow your blooms" |
| Pricing page    | Grove, Rooted, Wanderer | Tier descriptions                    |
| About page      | Wayfinder, Pathfinder   | Team/community roles                 |

### Knowledge Base (`landing/src/routes/knowledge`)

| Location           | Terms                   | Notes                          |
| ------------------ | ----------------------- | ------------------------------ |
| Help center hub    | Waystone, Wanderer      | Category descriptions          |
| Philosophy section | All foundational terms  | Where the lexicon is explained |
| Feature articles   | Relevant platform terms | Rings, Curios, Trails, etc.    |

### Onboarding Flow (`packages/plant`)

| Location                   | Terms            | Notes                        |
| -------------------------- | ---------------- | ---------------------------- |
| OnboardingChecklist.svelte | Wanderer, Rooted | Journey progress text        |
| Profile setup              | Grove            | "Your grove is almost ready" |
| Success page               | Rooted, Grove    | "You've taken root!"         |

### Estimated Effort

- ~4-5 hours across 3 packages
- May require adding GroveTerm to package dependencies
- Some cross-package considerations

---

## Phase 3: Workshop & Documentation

**Goal:** Use GroveTerm to document itself. Meta and beautiful.

### Vineyard Component Library

Add a dedicated GroveTerm showcase:

```svelte
<!-- vineyard/+page.svelte -->
<section id="groveterm">
  <h2>GroveTerm</h2>
  <p>Interactive terminology that teaches the Grove lexicon.</p>

  <h3>Usage</h3>
  <CodeBlock code={`<GroveTerm term="bloom">bloom</GroveTerm>`} />

  <h3>All Terms by Category</h3>
  <TermGallery category="foundational" />
  <TermGallery category="platform" />
  <TermGallery category="content" />
  <TermGallery category="tools" />
  <TermGallery category="operations" />
</section>
```

### New Component: TermGallery

A visual grid showing all terms in a category:

```svelte
<!-- TermGallery.svelte -->
<script>
  import { GroveTerm } from '$lib/ui';
  import manifest from '$lib/data/grove-term-manifest.json';

  let { category } = $props();

  const terms = Object.values(manifest)
    .filter(t => t.category === category);
</script>

<div class="term-gallery">
  {#each terms as term}
    <div class="term-card">
      <GroveTerm term={term.slug}>{term.term}</GroveTerm>
      <span class="tagline">{term.tagline}</span>
    </div>
  {/each}
</div>
```

### Knowledge Base Articles

**1. "The Grove Lexicon" (Philosophy)**

- Why we use custom terminology
- The forest metaphor explained
- Full glossary organized by category

**2. "Speaking Grove: Using [[term]] in Your Blooms" (Help/Tips)**
A meta article teaching Wanderers how to use GroveTerm syntax in their own writing:

```markdown
## Speaking Grove

Grove has its own language—terms like [[bloom]], [[wanderer]], and [[garden]]
that carry meaning beyond their dictionary definitions.

### Using Grove Terms in Your Writing

When you write a bloom, you can make any Grove term interactive by wrapping
it in double brackets:

    Welcome to my [[grove]]. These are my [[blooms]].

When readers hover over these terms, they'll see the definition. Click for
the full explanation.

### Custom Display Text

Want to show different text than the term name?

    The [[wanderer|visitors]] who find my garden...

This shows "visitors" but links to the Wanderer definition.

### Available Terms

Browse all 51 Grove terms in the [Lexicon Gallery](/knowledge/philosophy/grove-lexicon).
```

### Estimated Effort

- ~3-4 hours for Vineyard section
- ~2 hours for TermGallery component
- ~3 hours for KB articles (2 articles)

---

## Phase 4: Content System Integration

**Goal:** Enable `[[term]]` syntax in user-generated markdown content.

This is the most complex phase—requires a remark preprocessing plugin.

### What is Remark?

Remark is the markdown processor we use. It parses markdown into an AST (Abstract Syntax Tree), allows plugins to transform that tree, then renders to HTML. A "remark plugin" is a function that walks the tree and modifies nodes.

```
Markdown Text → [Parse] → AST → [Plugin Transform] → Modified AST → [Render] → HTML
```

### The Plugin

```typescript
// libs/engine/src/lib/utils/remark-groveterm.ts
import { visit } from "unist-util-visit";
import type { Root, Text } from "mdast";

/**
 * Remark plugin that transforms [[term]] syntax into GroveTerm components.
 *
 * Syntax:
 *   [[bloom]]           → <GroveTerm term="bloom">bloom</GroveTerm>
 *   [[bloom|my post]]   → <GroveTerm term="bloom">my post</GroveTerm>
 */
export function remarkGroveTerm() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === undefined) return;

      // Match [[term]] or [[term|display text]]
      const regex = /\[\[([a-z-]+)(?:\|([^\]]+))?\]\]/g;
      const matches = [...node.value.matchAll(regex)];

      if (matches.length === 0) return;

      // Split text node into multiple nodes (text + groveterm + text + ...)
      const newNodes = [];
      let lastIndex = 0;

      for (const match of matches) {
        const [fullMatch, term, displayText] = match;
        const matchIndex = match.index!;

        // Text before the match
        if (matchIndex > lastIndex) {
          newNodes.push({
            type: "text",
            value: node.value.slice(lastIndex, matchIndex),
          });
        }

        // The GroveTerm element (rendered as custom HTML node for mdsvex)
        newNodes.push({
          type: "html",
          value: `<GroveTerm term="${term}">${displayText || term}</GroveTerm>`,
        });

        lastIndex = matchIndex + fullMatch.length;
      }

      // Text after last match
      if (lastIndex < node.value.length) {
        newNodes.push({ type: "text", value: node.value.slice(lastIndex) });
      }

      // Replace original node with new nodes
      parent.children.splice(index, 1, ...newNodes);
    });
  };
}
```

### Integration Points

1. **Blog post rendering** — Add plugin to mdsvex config
2. **Help article rendering** — Same pipeline
3. **Bio/about sections** — If rendered as markdown

### Configuration

```javascript
// svelte.config.js or mdsvex.config.js
import { remarkGroveTerm } from "./src/lib/utils/remark-groveterm.js";

const mdsvexConfig = {
  remarkPlugins: [
    remarkGroveTerm, // Transform [[term]] syntax
    // ... other plugins
  ],
};
```

### Testing

```markdown
<!-- Input -->

Welcome to my [[grove]]. Here you'll find my [[blooms]].

I'm a [[wanderer|traveler]] who finally [[rooted|took root]].

<!-- Output -->

Welcome to my <GroveTerm term="grove">grove</GroveTerm>.
Here you'll find my <GroveTerm term="blooms">blooms</GroveTerm>.

I'm a <GroveTerm term="wanderer">traveler</GroveTerm> who finally
<GroveTerm term="rooted">took root</GroveTerm>.
```

### Estimated Effort

- ~6-8 hours for remark plugin + tests
- ~2-3 hours for integration across render pipelines
- Testing across different content types

---

## Phase 5: Polish & Scale

**Goal:** Ensure GroveTerm works beautifully at scale.

### Interaction Model Update

Implement tooltip-first, popup-fallback:

```
Hover (150ms delay) → Show tooltip with tagline + short definition
Click/Tap → Open full Waystone popup with complete definition, examples, related terms
```

### Performance Audit

- [ ] Manifest bundle size (currently ~15KB JSON)
- [ ] Lazy-load popup content if needed
- [ ] Test with many GroveTerm elements on one page
- [ ] SSR performance verification

### Accessibility Audit

- [ ] Screen reader announcement: "Grove term: bloom, foundational category"
- [ ] Keyboard navigation: Tab to focus, Enter/Space to open
- [ ] Focus trap in popup
- [ ] Escape to close
- [ ] Reduced motion: disable animations

### Mobile UX

- [ ] Touch targets ≥44×44px
- [ ] Tooltip → Popup on mobile (no hover)
- [ ] Bottom sheet on mobile vs. popup on desktop?

### Edge Cases

- [ ] Terms inside links (nested interactive)
- [ ] Terms in headings (SEO impact?)
- [ ] Very long definitions (scrollable popup?)
- [ ] Terms not in manifest (graceful fallback—render as plain text)
- [ ] Invalid `[[syntax]]` (unknown term—render as plain text, don't break)

### Estimated Effort

- ~4-6 hours for audits and fixes
- May spawn follow-up issues

---

## Implementation Sequence

```
Week 1: Phase 1 (Arbor)
  └── Complete admin panel integration
  └── Validate component behavior in real usage

Week 2: Phase 2 (Public Pages)
  └── Landing page integration
  └── Knowledge base integration
  └── Onboarding flow integration

Week 3: Phase 3 (Workshop & Docs)
  └── Vineyard showcase section
  └── TermGallery component
  └── KB articles: "Grove Lexicon" + "Using [[term]]"

Week 4: Phase 4 (Content System)
  └── Build remark-groveterm plugin
  └── Integrate with mdsvex/markdown renderer
  └── Test with user content

Week 5: Phase 5 (Polish)
  └── Tooltip-first interaction model
  └── Performance audit
  └── Accessibility audit
  └── Mobile UX refinement
```

---

## Tips for Writers

> **For the KB article "Speaking Grove"**

### Quick Reference

| Syntax                   | Result                                         |
| ------------------------ | ---------------------------------------------- |
| `[[bloom]]`              | Shows "bloom" linked to definition             |
| `[[bloom\|my writing]]`  | Shows "my writing" linked to bloom definition  |
| `[[wanderer\|visitors]]` | Shows "visitors" linked to wanderer definition |

### Best Practices

1. **Use sparingly** — Not every mention needs to be a GroveTerm. First mention in a section is usually enough.

2. **Match the grammar** — Use display text to match plural/case:
   - `[[bloom\|Blooms]]` for "Blooms are..."
   - `[[wanderer\|wanderers]]` for "...the wanderers who..."

3. **Foundational terms are best** — Terms like `[[grove]]`, `[[garden]]`, `[[bloom]]`, `[[wanderer]]`, `[[rooted]]` are the ones readers benefit most from learning.

4. **Don't nest** — Avoid putting GroveTerm inside links or headings.

---

## Success Metrics

### Qualitative

- [ ] New Wanderers understand Grove terminology faster
- [ ] Consistent language across all touchpoints
- [ ] The lexicon feels alive and discoverable

### Quantitative

- [ ] GroveTerm used in 50+ locations across codebase
- [ ] All 51 terms accessible via interactive elements
- [ ] Zero accessibility violations (axe-core)
- [ ] Tooltip appears in <100ms on hover

---

## Related Documents

- [Waystone Lexicon Elements](./waystone-lexicon-elements.md) — Original idea doc
- [Grove Naming Philosophy](/docs/naming/grove-naming.md) — Source of truth for terms
- [PR #947](https://github.com/AutumnsGrove/Lattice/pull/947) — GroveTerm simplification

---

_The grove speaks. Let it teach._
