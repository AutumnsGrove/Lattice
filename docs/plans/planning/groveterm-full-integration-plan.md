---
title: GroveTerm Full Integration Plan
description: Complete rollout of interactive Grove terminology across the platform
status: planning
created: '2026-02-04'
depends_on: ['PR #947 - GroveTerm Simplification']
---
# GroveTerm Full Integration Plan

> *The grove speaks its own language. Every glowing word is an invitation to understand.*

---

## Overview

With the GroveTerm component simplified (internal manifest, no extra imports needed), we can now integrate it across the entire platform. This plan covers the complete rollout from admin pages to public-facing content.

**What GroveTerm Does:**
- Renders terminology as styled, interactive elements
- Shows definitions on click via popup
- Color-codes by category (foundational, platform, content, tools, operations)
- Teaches the Grove lexicon organically as Wanderers explore

**Current State (after PR #947):**
- Component simplified: `<GroveTerm term="bloom">blooms</GroveTerm>`
- Initial integration in 3 admin pages (arbor dashboard, garden, account features)
- 51 terms defined in grove-term-manifest.json

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GROVETERM INTEGRATION MAP                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │   PHASE 1    │   │   PHASE 2    │   │   PHASE 3    │        │
│  │   Arbor      │──▶│   Public     │──▶│   Content    │        │
│  │   (Admin)    │   │   Pages      │   │   System     │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│         │                 │                   │                 │
│         ▼                 ▼                   ▼                 │
│  • Dashboard        • Landing           • Markdown hook        │
│  • Garden           • Pricing           • Blog posts           │
│  • Settings         • Knowledge         • Help articles        │
│  • Features         • Onboarding        • Email templates      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐                           │
│  │   PHASE 4    │   │   PHASE 5    │                           │
│  │   Workshop   │──▶│   Polish     │                           │
│  │   & Docs     │   │   & Scale    │                           │
│  └──────────────┘   └──────────────┘                           │
│         │                 │                                     │
│         ▼                 ▼                                     │
│  • Vineyard         • Performance                              │
│  • Component docs   • A11y audit                               │
│  • API reference    • Mobile UX                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Complete Arbor Integration (Admin Panel)

**Goal:** Every Grove term in the admin panel becomes interactive.

**Status:** 🟡 In Progress (3/12 pages done in PR #947)

### Target Files

| File | Terms to Wrap | Priority |
|------|---------------|----------|
| `arbor/+page.svelte` | ✅ Rooted, Blooms | Done |
| `arbor/garden/+page.svelte` | ✅ Garden, blooms | Done |
| `arbor/account/FeaturesCard.svelte` | ✅ Wanderers | Done |
| `arbor/analytics/+page.svelte` | Rings, Wanderers | High |
| `arbor/settings/+page.svelte` | Grove, Garden, Foliage | High |
| `arbor/curios/+page.svelte` | Curios | High |
| `arbor/timeline/+page.svelte` | Trail | Medium |
| `arbor/images/+page.svelte` | Amber | Medium |
| `arbor/account/SubscriptionCard.svelte` | Rooted, membership | Medium |
| `arbor/account/DataExportCard.svelte` | Blooms, Grove | Medium |
| `arbor/reserved-usernames/+page.svelte` | Wanderers, Loam | Low |
| `arbor/comped-invites/+page.svelte` | Wanderers | Low |

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

| Location | Terms | Notes |
|----------|-------|-------|
| Homepage hero | Grove | "Your own grove on the indie web" |
| Feature section | Garden, Blooms | "Tend your garden, grow your blooms" |
| Pricing page | Grove, Rooted, Wanderer | Tier descriptions |
| About page | Wayfinder, Pathfinder | Team/community roles |

### Knowledge Base (`landing/src/routes/knowledge`)

| Location | Terms | Notes |
|----------|-------|-------|
| Help center hub | Waystone, Wanderer | Category descriptions |
| Philosophy section | All foundational terms | Where the lexicon is explained |
| Feature articles | Relevant platform terms | Rings, Curios, Trails, etc. |

### Onboarding Flow (`packages/plant`)

| Location | Terms | Notes |
|----------|-------|-------|
| OnboardingChecklist.svelte | Wanderer, Rooted | Journey progress text |
| Profile setup | Grove | "Your grove is almost ready" |
| Success page | Rooted, Grove | "You've taken root!" |

### Estimated Effort
- ~4-5 hours across 3 packages
- May require adding GroveTerm to package dependencies
- Some cross-package considerations

---

## Phase 3: Content System Integration

**Goal:** Enable GroveTerm in user-generated and markdown content.

This is the most complex phase—requires preprocessing hooks.

### Approach A: Markdown Remark Plugin (Recommended)

Create a remark plugin that transforms `[[term]]` or `::term::` syntax into GroveTerm components.

```markdown
<!-- Author writes -->
Welcome to my [[grove]]. Here are my latest [[blooms]].

<!-- Transforms to -->
Welcome to my <GroveTerm term="grove">grove</GroveTerm>.
Here are my latest <GroveTerm term="blooms">blooms</GroveTerm>.
```

**Implementation:**

```typescript
// packages/engine/src/lib/utils/remark-groveterm.ts
import { visit } from 'unist-util-visit';

export function remarkGroveTerm() {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      // Match [[term]] or [[term|display text]]
      const regex = /\[\[([a-z-]+)(?:\|([^\]]+))?\]\]/g;
      // Transform matches to GroveTerm nodes
    });
  };
}
```

**Where to Apply:**
- Blog post rendering
- Help article rendering
- About/bio sections (if markdown)

### Approach B: Runtime Component (Simpler, Less Flexible)

Use a wrapper component that parses content client-side:

```svelte
<GroveTermContent content={post.body} />
```

Pros: Simpler to implement
Cons: Client-side processing, can't use in SSR markdown

### Approach C: Hybrid

- Use remark plugin for known content (help articles, marketing)
- Use runtime component for user content (blog posts)

### Decision: Start with Approach A

The remark plugin is more powerful and SSR-friendly. Implement for help articles first, then expand.

### Estimated Effort
- ~6-8 hours for remark plugin
- ~2-3 hours for integration points
- Testing across different content types

---

## Phase 4: Workshop & Documentation

**Goal:** Use GroveTerm to document itself.

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

### Knowledge Base Article

Create a dedicated "Grove Lexicon" article explaining:
- Why we use custom terminology
- How to interact with GroveTerm elements
- Full glossary organized by category

### Estimated Effort
- ~3-4 hours for Vineyard section
- ~2 hours for TermGallery component
- ~2 hours for KB article

---

## Phase 5: Polish & Scale

**Goal:** Ensure GroveTerm works beautifully at scale.

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
- [ ] Popup positioning on small screens
- [ ] Swipe to dismiss?
- [ ] Bottom sheet on mobile vs. popup on desktop?

### Edge Cases

- [ ] Terms inside links (nested interactive)
- [ ] Terms in headings (SEO impact?)
- [ ] Very long definitions (scrollable popup?)
- [ ] Terms not in manifest (graceful fallback)

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

Week 3: Phase 3 (Content System)
  └── Build remark-groveterm plugin
  └── Integrate with markdown renderer
  └── Test with existing content

Week 4: Phase 4 (Workshop)
  └── Vineyard showcase section
  └── TermGallery component
  └── KB "Grove Lexicon" article

Week 5: Phase 5 (Polish)
  └── Performance audit
  └── Accessibility audit
  └── Mobile UX refinement
```

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
- [ ] Popup load time <100ms

---

## Open Questions

1. **Author opt-in for blog posts?**
   Should the `[[term]]` syntax be available in user blogs, or just Grove-authored content?

2. **Email rendering?**
   GroveTerm is a Svelte component—can't render in emails. Options:
   - Static styling only (no interaction)
   - Link to KB definition instead
   - Skip GroveTerm in emails entirely

3. **Popup vs. Tooltip?**
   Current design uses a popup. Would a simpler tooltip work for short definitions?

4. **Search integration?**
   Should GroveTerm definitions be searchable in the Knowledge Base?

---

## Related Documents

- [Waystone Lexicon Elements](./waystone-lexicon-elements.md) — Original idea doc
- [Grove Naming Philosophy](/docs/naming/grove-naming.md) — Source of truth for terms
- [PR #947](https://github.com/AutumnsGrove/GroveEngine/pull/947) — GroveTerm simplification

---

*The grove speaks. Let it teach.*
