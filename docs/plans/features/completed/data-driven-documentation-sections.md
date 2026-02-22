# Data-Driven Documentation Sections Pattern

**Created**: January 15, 2026
**Status**: ✅ Implemented (Help Center)
**Priority**: Medium — Technical debt that slows content velocity
**Estimated Effort**: 1-2 focused sessions
**Prerequisites**: None
**Blocks**: Faster article publishing, Workshop docs, future KB expansions

---

## Overview

Currently, the Help Center (and similar documentation pages) uses **hardcoded slug arrays** to organize articles into sections. This pattern is:

- ❌ Fragile — Adding an article requires editing both the data file AND the page component
- ❌ Error-prone — Easy to forget adding a slug, leaving articles orphaned
- ❌ Not scalable — Every new section means more hardcoded arrays
- ❌ Not portable — Can't reuse the pattern across Landing, Workshop, Plant, etc.

**Goal**: Define a data-driven pattern where articles declare their own section membership, and pages render sections automatically.

---

## Current Anti-Pattern

### In `knowledge-base.ts`:
```typescript
export const helpArticles = [
  {
    slug: "what-is-grove",
    title: "What is Grove?",
    category: "help",  // Only knows it's a help article
    // No section info!
  },
  // ... more articles
];
```

### In `help/+page.svelte`:
```svelte
<!-- Getting Started Section -->
<section>
  {#each articles.filter(a =>
    ['what-is-grove', 'writing-your-first-post', 'choosing-your-plan']
      .includes(a.slug)
  ) as article}
    <!-- render article -->
  {/each}
</section>

<!-- Writing & Publishing -->
<section>
  {#each articles.filter(a =>
    ['drafts-and-scheduling', 'tags-and-organization', 'exporting-your-content']
      .includes(a.slug)
  ) as article}
    <!-- render article -->
  {/each}
</section>
```

### Problems:
1. Section membership lives in the **page component**, not the **data**
2. Adding a new article requires editing **two files**
3. No way to know if an article is orphaned without comparing data to page
4. Can't generate a section TOC or navigation automatically

---

## Proposed Pattern: Section Field in Data

### Step 1: Add `section` field to articles

```typescript
// knowledge-base.ts
export const helpArticles = [
  {
    slug: "what-is-grove",
    title: "What is Grove?",
    category: "help",
    section: "getting-started",  // NEW: Article knows its home
    sectionOrder: 1,              // NEW: Optional ordering within section
  },
  {
    slug: "writing-your-first-post",
    title: "Writing Your First Post",
    category: "help",
    section: "getting-started",
    sectionOrder: 2,
  },
  {
    slug: "the-markdown-editor",
    title: "The Markdown Editor",
    category: "help",
    section: "writing-publishing",
    sectionOrder: 1,
  },
  // ...
];
```

### Step 2: Define sections as data

```typescript
// knowledge-base.ts or a new sections.ts
export const helpSections = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Begin your Grove journey",
    order: 1,
  },
  {
    id: "writing-publishing",
    title: "Writing & Publishing",
    description: "Create and share your content",
    order: 2,
  },
  {
    id: "customization",
    title: "Customization",
    description: "Make Grove yours",
    order: 3,
  },
  // ...
];
```

### Step 3: Page component renders dynamically

```svelte
<script>
  const sections = data.helpSections;
  const articles = data.helpArticles;

  // Group articles by section
  const articlesBySection = $derived(
    sections.map(section => ({
      ...section,
      articles: articles
        .filter(a => a.section === section.id)
        .sort((a, b) => (a.sectionOrder ?? 99) - (b.sectionOrder ?? 99))
    }))
  );
</script>

{#each articlesBySection as section}
  <section class="mb-12">
    <h2>{section.title}</h2>
    {#if section.description}
      <p>{section.description}</p>
    {/if}
    <div class="grid gap-4">
      {#each section.articles as article}
        <ArticleCard {article} />
      {/each}
    </div>
  </section>
{/each}
```

---

## Benefits

| Benefit | Impact |
|---------|--------|
| **Single source of truth** | Article section lives WITH the article |
| **No orphans possible** | Every article has a section (or explicitly `null` for "uncategorized") |
| **Automatic TOC generation** | Sections data can power navigation, jump links, etc. |
| **Portable pattern** | Same approach works for Workshop docs, spec categories, etc. |
| **Faster content velocity** | Add article → done. No page edits needed. |
| **Validation possible** | Can warn at build time if article has unknown section |

---

## Migration Strategy

### Phase 1: Add section field (non-breaking)
1. Add `section?: string` to article type
2. Populate section for all 39 help articles
3. Keep existing page logic working

### Phase 2: Define sections as data
1. Create `helpSections` array with section metadata
2. Add section descriptions, icons, ordering

### Phase 3: Update page to use dynamic rendering
1. Replace hardcoded filters with section-based grouping
2. Add "Uncategorized" section for orphan detection
3. Remove all hardcoded slug arrays

### Phase 4: Apply pattern to other pages
1. Technical Specs (already has `specCategory` — similar concept!)
2. Workshop documentation (when built)
3. Pattern library page
4. Any future documentation sections

---

## Type Definitions

```typescript
// types/docs.ts

export interface DocSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  icon?: string;  // Optional icon component name
}

export interface HelpArticle {
  slug: string;
  title: string;
  excerpt: string;
  category: "help";
  section: string;           // Required section ID
  sectionOrder?: number;     // Optional order within section
  readingTime: number;
  lastUpdated?: string;
  // ... other fields
}
```

---

## Workshop Application

Workshop will need documentation for:
- Getting started guides
- Project tutorials
- API references
- Troubleshooting

Same pattern applies:
```typescript
export const workshopSections = [
  { id: "getting-started", title: "Getting Started", order: 1 },
  { id: "tutorials", title: "Tutorials", order: 2 },
  { id: "api-reference", title: "API Reference", order: 3 },
  { id: "troubleshooting", title: "Troubleshooting", order: 4 },
];

export const workshopDocs = [
  { slug: "install-cli", section: "getting-started", sectionOrder: 1, ... },
  { slug: "first-project", section: "getting-started", sectionOrder: 2, ... },
  // ...
];
```

---

## Potential Pattern Name

This could become a Grove Architecture Pattern:

**"Catalog Pattern"** — Data items declare their own categorization, enabling dynamic UI generation without hardcoded filters.

Or follow existing naming conventions:
- **"Canopy"** — How leaves (articles) organize under branches (sections)
- **"Understory"** — The layer of organization beneath the main content

---

## Implementation Checklist

- [ ] Add `section` field to `HelpArticle` type
- [ ] Populate section for all 39 existing articles
- [ ] Create `helpSections` array with section definitions
- [ ] Update `help/+page.svelte` to render dynamically
- [ ] Add build-time validation for unknown sections
- [ ] Document pattern in Architecture Patterns section
- [ ] Apply to Technical Specs (already partially there with `specCategory`)
- [ ] Prepare pattern for Workshop reuse

---

## Related Documents

- `landing/src/lib/data/knowledge-base.ts` — Current article data
- `landing/src/routes/knowledge/help/+page.svelte` — Current page implementation
- `landing/src/routes/knowledge/specs/+page.svelte` — Already uses `specCategory` (similar concept)
- `docs/plans/help-center-article-roadmap.md` — Article writing priorities
