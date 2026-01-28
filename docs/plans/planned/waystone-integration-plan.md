# Waystone Integration Plan

**Created:** January 28, 2026
**Status:** Planning
**Priority:** High — Critical for v1 launch user experience
**Related Issues:**
- #697 — Create contextual Waystone indicator component
- #699 — Integrate contextual waystones throughout Grove UI

**Related Documents:**
- `docs/specs/waystone-spec.md` — Help Center specification
- `docs/help-center/WRITING-GUIDE.md` — Voice and tone guidelines
- `docs/plans/planned/help-center-article-roadmap.md` — Article writing roadmap

---

## Executive Summary

This plan addresses two interconnected issues:

1. **Issue #697**: Create the foundational `Waystone` indicator component — a reusable contextual help button (`?`) that links to knowledge base articles
2. **Issue #699**: Integrate these waystones throughout the Grove UI at critical "confusion points"

The goal is to provide contextual help discovery directly where users need it — particularly important for users on independent domains (`username.grove.place`) who may not have easy access to the main Grove help center.

---

## The Problem

### Current State
- Help articles exist in `docs/help-center/articles/` (49 articles across 10 sections)
- No contextual help integration in the admin panel (Arbor)
- Users must know to navigate to `/help` or the landing site to find documentation
- Users on custom domains have no way to discover help articles from their admin panel
- New users encountering unfamiliar features have no in-context guidance

### User Impact
- New Wanderers struggle with unfamiliar features (Flow editor, Fireside, Curios)
- Settings pages have many options without explanation of what they do
- Users on independent domains feel disconnected from Grove's help resources
- Support burden increases as users can't self-serve answers

---

## Design Philosophy

Waystones should feel like helpful signposts, not intrusive tooltips:

> *"Trail markers that guide you through the forest."*

**Principles:**
1. **Subtle but discoverable** — Present but not demanding attention
2. **Contextually relevant** — Linked to exactly what the user is looking at
3. **Non-blocking** — Opens in new tab, doesn't interrupt workflow
4. **Accessible** — Works with screen readers, respects reduced motion
5. **Consistent** — Same visual treatment across all Grove properties

---

## Phase 1: Waystone Component (Issue #697)

### 1.1 Component Specification

**Location:** `packages/engine/src/lib/ui/components/ui/Waystone.svelte`

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `slug` | `string` | Yes | Path to KB article (e.g., `"writing/markdown-editor"`) |
| `label` | `string` | No | Screen reader label (defaults to "Learn more") |
| `size` | `"sm" \| "md"` | No | Size variant (default: `"sm"`) |
| `inline` | `boolean` | No | Display inline with text (default: `false`) |

**Visual Design:**
```
┌─────┐
│  ?  │  <- 20px circle, subtle border, question mark
└─────┘
```

- Light mode: `var(--color-surface)` background, `var(--color-border)` border
- Dark mode: Adjusted for dark glass surfaces
- Hover: `var(--color-accent)` background, white text
- Focus: Visible focus ring for accessibility

**Behavior:**
- Click opens `/help/{slug}` in new tab
- Tooltip on hover: "Learn more" (or custom label)
- Screen reader announces: "Help: {label or article title}"

### 1.2 Component Implementation

```svelte
<!-- Waystone.svelte -->
<script lang="ts">
  import { HelpCircle } from 'lucide-svelte';
  import { cn } from '$lib/ui/utils';

  interface Props {
    slug: string;
    label?: string;
    size?: 'sm' | 'md';
    inline?: boolean;
    class?: string;
  }

  let {
    slug,
    label = 'Learn more',
    size = 'sm',
    inline = false,
    class: className
  }: Props = $props();

  // Determine if we're on a tenant domain or grove.place
  const helpBaseUrl = '/help';
</script>

<a
  href="{helpBaseUrl}/{slug}"
  target="_blank"
  rel="noopener"
  class={cn(
    'waystone',
    `waystone--${size}`,
    inline && 'waystone--inline',
    className
  )}
  title={label}
>
  <span class="sr-only">Help: {label}</span>
  <HelpCircle class="waystone-icon" />
</a>

<style>
  .waystone {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--glass-bg, var(--color-surface));
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    text-decoration: none;
    transition: all 0.15s ease;
    flex-shrink: 0;
  }

  .waystone--sm {
    width: 20px;
    height: 20px;
  }

  .waystone--md {
    width: 24px;
    height: 24px;
  }

  .waystone--inline {
    margin-left: 0.5rem;
    vertical-align: middle;
  }

  .waystone:hover,
  .waystone:focus-visible {
    background: var(--color-accent, var(--color-primary));
    border-color: var(--color-accent, var(--color-primary));
    color: white;
  }

  .waystone:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  :global(.waystone-icon) {
    width: 14px;
    height: 14px;
  }

  .waystone--md :global(.waystone-icon) {
    width: 16px;
    height: 16px;
  }
</style>
```

### 1.3 Export from Engine

Add to `packages/engine/package.json` exports:
```json
{
  "./ui": "./src/lib/ui/components/ui/index.ts"
}
```

Add to `packages/engine/src/lib/ui/components/ui/index.ts`:
```typescript
export { default as Waystone } from './Waystone.svelte';
```

### 1.4 Accessibility Requirements

- [ ] Visible focus indicator (WCAG 2.4.7)
- [ ] Minimum touch target 44x44px on mobile (via padding or hit area)
- [ ] Screen reader announces link purpose
- [ ] Respects `prefers-reduced-motion` (no hover animations if enabled)
- [ ] Sufficient color contrast (4.5:1 minimum)

---

## Phase 2: UI Audit — Confusion Points (Issue #699)

### 2.1 Arbor Panel (Admin)

| Section | Confusion Point | Waystone Placement | Article Slug | Article Status |
|---------|-----------------|-------------------|--------------|----------------|
| **Dashboard** | What metrics mean | Next to "Analytics" card header | `analytics/understanding-stats` | Needs writing |
| **Blog Posts** | Scheduling vs publishing | Near publish date picker | `writing/drafts-and-scheduling` | Needs writing |
| **Blog Post Editor** | Markdown syntax | Next to editor mode toggle | `writing/formatting-your-posts` | Needs writing |
| **Blog Post Editor** | Flow editor features | Near editor toolbar | `writing/the-markdown-editor` | Needs writing |
| **Blog Post Editor** | What Fireside does | Next to Fireside toggle | `ai/what-is-wisp` | Needs writing |
| **Pages** | Pages vs posts | Page header area | `writing/pages-vs-posts` | Needs writing |
| **Curios** | What Curios are | Curios landing page header | `features/what-are-curios` | Needs writing |
| **Curios > Timeline** | Timeline Curio setup | Timeline config section | `curios/timeline-setup` | Needs writing |
| **Curios > Journey** | Journey Curio setup | Journey config section | `curios/journey-setup` | Needs writing |
| **Curios > Gallery** | Gallery sync options | Gallery settings | `curios/gallery-setup` | Needs writing |
| **Images** | Storage limits by tier | Near storage indicator | `billing/storage-limits` | Needs writing |
| **Analytics** | Data interpretation | Analytics header | `analytics/understanding-stats` | Needs writing |
| **Trails** | What Trails shows | Trails header | `features/what-are-trails` | Needs writing |
| **Account** | Subscription tiers | Next to plan display | `billing/understanding-your-plan` | Partially exists |
| **Account** | Data export | Export card header | `data/exporting-your-content` | Needs writing |
| **Settings > Typography** | Font accessibility | Typography section header | `customization/custom-fonts` | Needs writing |
| **Settings > Accent Color** | Color usage | Accent color section header | `customization/custom-accent-colors` | Needs writing |
| **Settings > Cache** | What cache clearing does | Cache section header | `settings/cache-management` | Needs writing |

### 2.2 User-Facing Features

| Feature | Confusion Point | Waystone Placement | Article Slug | Article Status |
|---------|-----------------|-------------------|--------------|----------------|
| **Flow Editor** | Markdown shortcuts | Status bar or toolbar | `writing/the-markdown-editor` | Needs writing |
| **Flow Editor** | Zen mode purpose | Zen mode toggle | `writing/zen-mode` | Needs writing |
| **Fireside Chat** | How AI assists | Fireside panel header | `ai/what-is-wisp` | Needs writing |
| **Fireside Chat** | Privacy of drafts | Fireside input area | `ai/wisp-privacy` | Needs writing |
| **Comment Section** | Moderation options | Comment settings | `comments/moderating-your-comments` | Needs writing |
| **Vines Editor** | What vines are | Vines section header | `writing/vines-sidebar-links` | Needs writing |
| **RSS Link** | How RSS works | Near RSS feed link | `writing/your-rss-feed` | Needs writing |

### 2.3 Public/Visitor Areas

| Area | Confusion Point | Waystone Placement | Article Slug | Article Status |
|------|-----------------|-------------------|--------------|----------------|
| **Help Center Home** | Navigation help | Help center header | N/A (self-referential) | N/A |
| **Login Page** | Auth method | Near Google sign-in | `getting-started/creating-your-account` | Needs writing |
| **Onboarding** | Plan selection | Plan comparison card | `billing/choosing-your-plan` | Partially exists |

---

## Phase 3: Integration Implementation

### 3.1 Section Header Pattern

For GlassCard sections, add waystone adjacent to the `<h2>`:

**Before:**
```svelte
<GlassCard variant="frosted" class="mb-6">
  <h2>Typography</h2>
  <p class="section-description">Choose the font family...</p>
</GlassCard>
```

**After:**
```svelte
<GlassCard variant="frosted" class="mb-6">
  <div class="section-header">
    <h2>Typography</h2>
    <Waystone slug="customization/custom-fonts" label="Learn about fonts" />
  </div>
  <p class="section-description">Choose the font family...</p>
</GlassCard>
```

**CSS pattern:**
```css
.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
```

### 3.2 Inline Pattern

For settings that need inline help:

```svelte
<label>
  Accent Color
  <Waystone slug="customization/custom-accent-colors" inline />
</label>
```

### 3.3 Toolbar Pattern

For editor toolbars, use a dedicated help icon:

```svelte
<div class="toolbar">
  <!-- existing tools -->
  <div class="toolbar-spacer"></div>
  <Waystone
    slug="writing/the-markdown-editor"
    label="Editor help"
    size="md"
  />
</div>
```

---

## Phase 4: Help Routes Implementation

### 4.1 Route Structure

Create help routes in the engine to serve articles on tenant domains:

```
packages/engine/src/routes/help/
├── +page.svelte              # Help center index
├── +page.server.ts           # Load categories and featured articles
├── [category]/
│   ├── +page.svelte          # Category listing
│   ├── +page.server.ts       # Load articles in category
│   └── [slug]/
│       ├── +page.svelte      # Article view
│       └── +page.server.ts   # Load single article
└── search/
    ├── +page.svelte          # Search results
    └── +page.server.ts       # FTS5 search
```

### 4.2 Article Loading Strategy

**Option A: Build-time bundled (Recommended for v1)**
- Bundle markdown articles into the engine at build time
- Pros: Fast, no D1 queries, works offline
- Cons: Requires rebuild to update articles

**Option B: D1-stored (Better for future)**
- Store articles in D1 per the waystone-spec.md schema
- Pros: Live updates, search via FTS5
- Cons: More complex, requires migration

**Recommendation:** Start with Option A for v1 launch, migrate to Option B when the admin article editor is built.

### 4.3 Article Renderer Component

Create `HelpArticle.svelte` to render markdown with Grove styling:

```svelte
<!-- packages/engine/src/lib/components/help/HelpArticle.svelte -->
<script lang="ts">
  import { sanitizeMarkdown } from '$lib/utils/sanitize';
  import '$lib/styles/content.css';

  interface Props {
    title: string;
    content: string;
    lastUpdated?: string;
    category?: string;
    related?: Array<{ slug: string; title: string }>;
  }

  let { title, content, lastUpdated, category, related }: Props = $props();
</script>

<article class="help-article">
  <header>
    {#if category}
      <a href="/help/{category}" class="category-link">{category}</a>
    {/if}
    <h1>{title}</h1>
  </header>

  <div class="content prose">
    {@html sanitizeMarkdown(content)}
  </div>

  {#if related?.length}
    <aside class="related-articles">
      <h2>Related Articles</h2>
      <ul>
        {#each related as article}
          <li><a href="/help/{article.slug}">{article.title}</a></li>
        {/each}
      </ul>
    </aside>
  {/if}

  {#if lastUpdated}
    <footer>
      <p class="last-updated">Last updated: {lastUpdated}</p>
    </footer>
  {/if}
</article>
```

---

## Phase 5: Article Gap Analysis

Based on the UI audit, these articles must be created before waystone integration is meaningful:

### Priority 1: Write Before Waystone Launch

| Article | Slug | Why Critical |
|---------|------|--------------|
| The Markdown Editor | `writing/the-markdown-editor` | Flow editor is core feature |
| What is Wisp | `ai/what-is-wisp` | Fireside integration depends on it |
| Understanding Your Plan | `billing/understanding-your-plan` | Account section links here |
| Drafts and Scheduling | `writing/drafts-and-scheduling` | Blog post confusion point |
| Formatting Your Posts | `writing/formatting-your-posts` | Editor help button target |

### Priority 2: Write Soon After Launch

| Article | Slug | Why Important |
|---------|------|--------------|
| What are Curios | `features/what-are-curios` | Curios section entry point |
| Vines (Sidebar Links) | `writing/vines-sidebar-links` | User-facing feature |
| Custom Fonts | `customization/custom-fonts` | Settings section |
| Storage Limits | `billing/storage-limits` | Images section |
| Exporting Your Content | `data/exporting-your-content` | Account section |

### Priority 3: Complete Coverage

All remaining articles from the UI audit table.

---

## Implementation Checklist

### Phase 1: Component Foundation (Issue #697)
- [ ] Create `Waystone.svelte` component
- [ ] Add to engine UI exports
- [ ] Create accompanying CSS tokens if needed
- [ ] Write component tests
- [ ] Document in storybook/examples
- [ ] Verify accessibility (screen reader, keyboard, focus)
- [ ] Test on both light and dark modes
- [ ] Test reduced motion preference

### Phase 2: Help Routes
- [ ] Create `/help` route structure in engine
- [ ] Implement article loading (build-time bundle)
- [ ] Create `HelpArticle.svelte` renderer
- [ ] Add category navigation
- [ ] Add search functionality (basic string match for v1)
- [ ] Style help pages with Grove aesthetic
- [ ] Add "Was this helpful?" feedback (deferred to later)

### Phase 3: Arbor Integration (Issue #699)
- [ ] Settings page: Typography section
- [ ] Settings page: Accent Color section
- [ ] Settings page: Cache section
- [ ] Account page: Subscription card
- [ ] Account page: Data Export card
- [ ] Blog post editor: Near mode toggle
- [ ] Blog post editor: Fireside toggle
- [ ] Curios landing: Header area
- [ ] Images page: Storage indicator
- [ ] Analytics page: Header

### Phase 4: Editor Integration
- [ ] Flow editor: Toolbar help button
- [ ] Flow editor: Zen mode toggle
- [ ] Fireside chat: Panel header
- [ ] Fireside chat: Privacy note area

### Phase 5: Article Writing
- [ ] Write Priority 1 articles (5)
- [ ] Write Priority 2 articles (5)
- [ ] Review all articles for waystone-spec compliance
- [ ] Verify all slugs match waystone integration points

### Phase 6: Polish
- [ ] Visual consistency audit across all placements
- [ ] Mobile responsiveness check
- [ ] Performance check (no layout shift)
- [ ] Cross-browser testing
- [ ] Accessibility audit (aXe, screen reader)

---

## Technical Considerations

### Cross-Domain Behavior

When users access Grove from custom domains, waystones need to route correctly:

**Option 1: Always link to grove.place** (Simple)
```svelte
const helpBaseUrl = 'https://grove.place/help';
```
- Pros: Guaranteed article availability
- Cons: Context switch for users

**Option 2: Link to tenant /help if available** (Better UX)
```svelte
const helpBaseUrl = '/help';  // Relative to current domain
```
- Pros: Stays in user context
- Cons: Requires help routes deployed to all tenants

**Recommendation:** Option 2 — Deploy help routes as part of the engine so they're available on all tenant domains.

### Bundle Size Impact

Bundling all help articles at build time adds to the initial bundle:
- ~49 articles × ~2KB avg = ~100KB markdown
- After compression: ~30KB gzipped

**Mitigation:**
- Lazy load article content only when `/help` is accessed
- Consider code-splitting the help section

### Caching Strategy

Help articles should be cached aggressively:
- Set `Cache-Control: public, max-age=86400` (24 hours)
- Invalidate on deployment
- KV cache for search results

---

## Questions for Design Decision

1. **Waystone visibility on mobile**: Should waystones be:
   - Always visible (current plan)
   - Hidden on mobile, accessible via overflow menu
   - Converted to a help button in mobile navigation

2. **Help panel vs new tab**: Should clicking a waystone:
   - Open article in new tab (current plan)
   - Open in a slide-out panel (more integrated, more complex)
   - Show a tooltip preview with "Read more" link

3. **Article update workflow**: When help articles are updated:
   - Rebuild and redeploy engine (Option A)
   - Admin UI for editing articles (future, requires D1 storage)

4. **Feedback integration**: "Was this helpful?" feature:
   - Include in v1 (adds D1 table, feedback API)
   - Defer to post-launch (simpler v1)

5. **Search priority**: For v1, should we:
   - Skip search entirely (just browse by category)
   - Basic string matching (client-side)
   - Full FTS5 implementation (requires D1 articles)

---

## Success Metrics

- **Discoverability**: >50% of users who view a setting also view related help (via Rings analytics)
- **Self-service rate**: Reduction in support tickets for common questions
- **Article helpfulness**: >80% positive "Was this helpful?" responses
- **Coverage**: 100% of UI audit confusion points have linked articles

---

## Timeline Estimate

| Phase | Scope | Estimate |
|-------|-------|----------|
| Phase 1 | Waystone component | 1 day |
| Phase 2 | Help routes | 2-3 days |
| Phase 3 | Arbor integration | 2 days |
| Phase 4 | Editor integration | 1 day |
| Phase 5 | Priority 1 articles | 2-3 days |
| Phase 6 | Polish & testing | 1-2 days |
| **Total** | | **9-12 days** |

---

## Next Steps

1. Get design decision answers (see Questions section)
2. Create the Waystone component (Phase 1)
3. Set up help routes with bundled articles (Phase 2)
4. Begin Priority 1 article writing in parallel
5. Integrate waystones starting with Settings page

---

*This plan ensures contextual help is available exactly where Wanderers need it — making Grove feel welcoming even when something's unfamiliar.*
