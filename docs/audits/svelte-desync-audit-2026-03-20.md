# Svelte File Desync Audit

> **Scope:** 643 `.svelte` files across `libs/` and `apps/` (excluding `node_modules`, `.svelte-kit`, `_archived`, `apps/ivy`)
> **Date:** 2026-03-20
> **Purpose:** Identify drift, inconsistency, and convention splits accumulated across hundreds of agent sessions
> **Out of scope:** `apps/ivy` — intentional outlier, not in active development

---

## Executive Summary

The codebase is in **surprisingly good shape** for Svelte 5 migration (~96% adopted), but has clear drift in **6 major dimensions**:

| Dimension | Severity | Scope |
|-----------|----------|-------|
| Plain JS script blocks (missing `lang="ts"`) | **HIGH** | 45 files |
| `cn()` import path inconsistency | **MEDIUM** | 46 files |
| Event handler pattern split (`on:click` vs `onclick`) | **HIGH** | ~2,980 Svelte 4 vs 5 Svelte 5 |
| Style block approach fragmentation | **MEDIUM** | 3 competing patterns |
| Hardcoded colors bypassing design tokens | **MEDIUM** | 166 files |
| Oversized components (>500 lines) | **LOW** | 74 files |

---

## 1. Script Tag Patterns

### 1a. TypeScript vs Plain JavaScript

**~93% of files use `<script lang="ts">`** — but 45 files still use plain `<script>`.

| Location | `lang="ts"` | Plain JS | Coverage |
|----------|-------------|----------|----------|
| libs/ | 362 | 24 | 94.0% |
| apps/ (excl. ivy) | 232 | 19 | 92.4% |
| tools/ | 1 | 2 | 33.3% |

**Plain JS in libs/engine (24 files — HIGH priority):**
- `components/admin/`: PhotoPicker, CurioAutocomplete, MarkdownEditor, GutterManager
- `components/custom/`: LeftGutter, CollapsibleSection, GutterItem, InternalsPostViewer
- `components/`: WispPanel, WispButton
- `ui/components/gallery/`: ImageGallery, LightboxCaption, Lightbox, ZoomableImage
- `ui/components/domain/`: DomainCheckerModal, DomainChecker
- `ui/components/forms/`: ContentSearch
- `ui/components/charts/`: LOCBar, Sparkline, RepoBreakdown, ActivityOverview
- `ui/components/icons/`: IconLegend
- `grafts/`: GreenhouseAdminPanel, UploadManagementPanel

**Plain JS in apps/aspen (18 route files) + 1 in apps/domains**

### 1b. Svelte 4 vs Svelte 5 Reactivity

With Ivy excluded, the codebase is **effectively 100% Svelte 5** for reactivity patterns:

| Pattern | Count | Status |
|---------|-------|--------|
| `$:` reactive statements (Svelte 4) | **0 files** | Fully migrated |
| `$state` (Svelte 5) | 262 files | Well adopted |
| `$derived` (Svelte 5) | 365 files | Most used rune |
| `$effect` (Svelte 5) | 158 files | Appropriate use |
| `export let` props (Svelte 4) | **0 files** | Fully migrated |
| `$props()` (Svelte 5) | 594 files | 100% adopted |
| `<svelte:component>` (Svelte 4) | **1 file** | Acceptable (dynamic icons) |
| `<script context="module">` | **0** | Fully migrated |

The single `<svelte:component>` usage is in `apps/aspen/src/routes/arbor/curios/+page.svelte` for dynamically rendering icon components — a legitimate use case.

---

## 2. Import Path Inconsistencies

### 2a. `cn()` Utility — Two Competing Paths

| Import Path | Count | Correct? |
|-------------|-------|----------|
| `$lib/ui/utils` | ~30 files | YES |
| `$lib/utils` | **46 files** | NO — missing `/ui` segment |
| `@autumnsgrove/lattice/ui/utils` | 13 files | YES (for apps) |

All 46 wrong imports are in `libs/engine/src/lib/ui/components/primitives/` (shadcn components) + 1 in Timeline. Full list:

- All 37 shadcn primitive files (badge, button, input, card/*, dialog/*, sheet/*, select/*, tabs/*, table/*, accordion/*, separator, skeleton, textarea)
- `libs/engine/src/lib/curios/timeline/Timeline.svelte`

### 2b. Icon Imports

| Pattern | Count | Correct? |
|---------|-------|----------|
| `@autumnsgrove/prism/icons` | 257 files | YES |
| `@lucide/svelte` + `@lucide/lab` | **1 file** | NO |

**Offender:** `apps/landing/src/lib/components/icons/BeeIcon.svelte` — imports directly from Lucide instead of Prism.

### 2c. Engine Imports

| Pattern | Count | Context |
|---------|-------|---------|
| `@autumnsgrove/lattice/*` | 211 files | Correct for apps consuming engine |
| `$lib/*` | 265 files | Correct for engine-internal |
| Both in same file | 62 files | Expected for re-export layers |

No `clsx` or `classnames` direct imports found — all use `cn()` wrapper.

---

## 3. Event Handler Pattern Split

This is the **single largest desync** in the codebase.

| Pattern | Count | Version |
|---------|-------|---------|
| `on:click`, `on:change`, etc. (directives) | ~2,980 occurrences | Svelte 4 |
| `onclick`, `onchange`, etc. (event props) | **5 files** | Svelte 5 |

**Svelte 5 event prop adopters (only 5):**
- `libs/vineyard/src/lib/components/vineyard/UserMenu.svelte`
- `libs/vineyard/src/lib/components/vineyard/CodeExample.svelte`
- `libs/vineyard/src/lib/components/vineyard/AuthButton.svelte`
- `libs/foliage/src/routes/+page.svelte`
- `libs/foliage/src/routes/+layout.svelte`

**Impact:** While `on:` directives still work in Svelte 5, they're deprecated. The codebase is ~99.8% on the old pattern.

---

## 4. Slot vs Snippet Pattern Split

| Pattern | Count | Version |
|---------|-------|---------|
| `<slot>` (legacy) | **1 file** | Svelte 4 |
| `{@render children()}` (snippets) | 118 files | Svelte 5 |

**Legacy slot file:**
- `libs/vineyard/src/lib/components/vineyard/VineyardLayout.svelte`

---

## 5. Style Block Fragmentation

Three competing approaches coexist:

| Approach | Count | % |
|----------|-------|---|
| No `<style>` block (Tailwind-only) | 321 files | 49.9% |
| `<style lang="postcss">` | 263 files | 40.9% |
| `<style>` (plain CSS) | 77 files | 12.0% |

**Mixed approach** (~200+ files) use both a style block AND heavy Tailwind, which is fine but creates cognitive load when there's no clear convention for *when* to use which.

No SCSS usage found (good — consistent with Tailwind/PostCSS stack).

---

## 6. Hardcoded Values Bypassing Design Tokens

### Colors
- **166 files** contain `rgba()` or `rgb()` values
- Common antipattern: `var(--color-surface, #2a2a2a)` CSS fallbacks with hardcoded hex
- Worst offenders:
  - `components/terminology/GroveTerm.svelte` — hardcoded `#d97706`, `#a855f7`, `#f59e0b`, `#6b7280`
  - `components/admin/CurioAutocomplete.svelte` — `rgba(30, 30, 30, 0.95)`, `rgba(139, 196, 139, 0.25)`
  - `components/WispButton.svelte` — `#2a2a2a`, `#3a3a3a`, `#8bc48b`

### Inline Styles
- **138 files** (21.5%) use `style="..."` attributes
- Many are legitimate (dynamic widths, CSS custom property injection, computed positions)
- Some could be converted to Tailwind arbitrary values or CSS classes

---

## 7. Documentation & Comment Drift

| Pattern | Count | % |
|---------|-------|---|
| Files with `interface Props` | 276 | 42.9% |
| Files with JSDoc (`@type`, `@param`) | 341 | 53.0% |
| Files with comprehensive docs (JSDoc + examples) | ~80 | 12.4% |
| Files with NO documentation | ~300 | 46.7% |
| HTML template comments (`<!-- -->`) | 204 | 31.7% |
| TODO/FIXME/HACK comments | 8 total | Very clean |

**The split:** Some files have rich JSDoc with `@prop`, `@example` blocks. Others have TypeScript interfaces only. Nearly half have nothing. There's no clear convention for *which style to use when*.

---

## 8. File Naming & Size

### Naming Conventions
| Convention | Count | % | Where |
|------------|-------|---|-------|
| PascalCase | 399 | 89.9% | Project standard |
| kebab-case | 37 | 8.3% | Shadcn primitives only |
| lowercase | 8 | 1.8% | Shadcn utilities only |

Naming is **consistent and intentional** — no drift here.

### Oversized Components
74 files exceed 500 lines (11.5%). Top offenders:

| File | Lines |
|------|-------|
| `apps/aspen/src/routes/arbor/images/+page.svelte` | 2,323 |
| `libs/engine/src/lib/components/admin/MarkdownEditor.svelte` | 2,301 |
| `apps/domains/src/routes/arbor/searcher/+page.svelte` | 2,060 |
| `libs/foliage/src/lib/components/ModerationQueue.svelte` | 2,020 |
| `apps/landing/src/routes/workshop/+page.svelte` | 1,709 |
| `libs/engine/src/lib/components/admin/GutterManager.svelte` | 1,668 |
| `apps/aspen/src/routes/arbor/curios/timeline/+page.svelte` | 1,635 |
| `apps/landing/src/routes/credits/+page.svelte` | 1,543 |
| `apps/landing/src/routes/vineyard/+page.svelte` | 1,448 |
| `apps/aspen/src/routes/arbor/garden/edit/[slug]/+page.svelte` | 1,336 |

---

## 9. Accessibility Gaps

| Pattern | Count | Coverage |
|---------|-------|----------|
| Files with `aria-*` attributes | 390 | 60.7% |
| Files with `aria-label` | 260 | 40.4% |
| Files with `role=` | 172 | 26.7% |
| `<img>` tags missing `alt` | 28 instances | 15 files |

**Files with missing `alt` attributes:**
- `apps/aspen/src/routes/(site)/gallery/+page.svelte`
- `apps/aspen/src/routes/arbor/images/+page.svelte`
- `apps/aspen/src/routes/arbor/settings/+page.svelte`
- `apps/aspen/src/routes/arbor/settings/appearance/+page.svelte`
- `apps/landing/src/routes/arbor/cdn/+page.svelte`
- `apps/landing/src/routes/contact/+page.svelte`
- `apps/meadow/src/lib/components/PostCard.svelte`
- `libs/engine/src/lib/components/admin/PhotoPicker.svelte`
- `libs/engine/src/lib/components/chrome/MobileMenu.svelte`
- `libs/engine/src/lib/components/custom/GutterItem.svelte`
- `libs/engine/src/lib/curios/components/CurioBadges.svelte`
- `libs/engine/src/lib/curios/components/CurioNowplaying.svelte`
- `libs/engine/src/lib/curios/components/CurioShelves.svelte`
- `libs/engine/src/lib/ui/components/chrome/AccountStatus.svelte`
- `libs/engine/src/lib/ui/components/content/LinkPreview.svelte`

---

## Prioritized Remediation Plan

### Phase 1 — Quick Wins (Mechanical, low risk)
1. **Add `lang="ts"` to 45 plain JS svelte files** — no logic changes needed
2. **Fix 46 `cn()` import paths** — `$lib/utils` → `$lib/ui/utils` in primitives
3. **Fix 1 Lucide import** — BeeIcon.svelte → use Prism icons
4. **Convert 1 `<slot>` → `{@render children()}`** in VineyardLayout

### Phase 2 — Event Handler Migration (Large, systematic)
5. **Migrate `on:` directives → event props** across ~2,980 occurrences
   - This is the biggest single task — should be done app-by-app or directory-by-directory

### Phase 3 — Design Token Compliance
6. **Replace hardcoded colors** in 166 files with CSS custom properties
7. **Audit inline styles** — convert mechanical ones to Tailwind/classes

### Phase 4 — Code Quality
8. **Break up oversized components** (>500 lines, especially >1000 lines)
9. **Add missing `alt` attributes** to 28 image instances
10. **Standardize documentation approach** — pick JSDoc OR TypeScript interfaces, not both
11. **Decide style block convention** — when to use `<style lang="postcss">` vs Tailwind-only

---

## Remediation Progress (PR #1521, 2026-03-21)

### Phase 1 — Complete

| Item | Before | After | Status |
|------|--------|-------|--------|
| Plain JS script blocks | 45 files | 0 files | **Done** — all converted to `lang="ts"` with proper TS interfaces |
| `cn()` import paths | 46 wrong | 1 remaining (Timeline) | **Done** — 45 shadcn primitives fixed |
| Bare Lucide icons | ~62 usages | 0 remaining | **Done** — 61 migrated to Prism; BeeIcon uses `@lucide/lab` (intentional `// prism-ok`) |
| `<slot>` → snippet | 1 file | 0 files | **Already done** — VineyardLayout was already using `{@render children()}`; only the doc comment referenced `<slot>` |
| Engine export `"types"` conditions | 12 missing | 0 missing | **Done** — all `.svelte` exports have types |

### Bonus: Aspen Type Safety

Drove `apps/aspen` svelte-check from **415 errors → 0 errors**:
- Created `assertLoaded`/`assertActionResult` test utilities for SvelteKit type narrowing
- Fixed 4 `$derived` → `$derived.by` runtime bugs in WispPanel and UploadManagementPanel
- Converted JSDoc type annotations to TypeScript across ~30 route components
- Typed root layout data prop, vineyard showcase, community settings
- Fixed component prop mismatches in vineyard showcase (Season, StatusBadge, Tabs, Select, Accordion)

### Remaining (Phase 2+)

| Item | Scope | Priority |
|------|-------|----------|
| Event handler migration (`on:` → `onclick`) | ~2,980 occurrences | Phase 2 |
| Hardcoded colors → design tokens | 166 files | Phase 3 |
| Oversized components (>500 lines) | 74 files | Phase 4 |
| Missing `alt` attributes | 28 instances, 15 files | Phase 4 |
| Style block convention decision | 3 competing patterns | Phase 4 |
| Documentation approach standardization | ~300 undocumented files | Phase 4 |

---

## What's Working Well

- **Svelte 5 rune adoption: ~96%** — impressive for a large codebase
- **Svelte 5 props: 100%** (excluding Ivy) — fully migrated to `$props()`
- **Svelte 5 reactivity: 100%** (excluding Ivy) — zero `$:` statements remain
- **File naming: 100% consistent** — PascalCase standard with intentional kebab-case for primitives
- **Store patterns: 100% auto-subscription** — no manual `.subscribe()` drift
- **No `clsx`/`classnames` leaks** — all use `cn()` wrapper
- **Very low TODO/FIXME count (8 total)** — clean, completed work
- **No module script drift** — fully migrated from `context="module"`
- **Icon system: 99.6% compliant** — only 1 Lucide leak
