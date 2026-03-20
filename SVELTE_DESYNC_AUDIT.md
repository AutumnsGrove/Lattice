# Svelte File Desync Audit

> **Scope:** 661 `.svelte` files across `libs/` and `apps/` (excluding `node_modules`, `.svelte-kit`, `_archived`)
> **Date:** 2026-03-20
> **Purpose:** Identify drift, inconsistency, and convention splits accumulated across hundreds of agent sessions

---

## Executive Summary

The codebase is in **surprisingly good shape** for Svelte 5 migration (~94% adopted), but has clear drift in **6 major dimensions**:

| Dimension | Severity | Scope |
|-----------|----------|-------|
| Plain JS script blocks (missing `lang="ts"`) | **HIGH** | 49 files |
| `cn()` import path inconsistency | **MEDIUM** | 46 files |
| Event handler pattern split (`on:click` vs `onclick`) | **HIGH** | ~2,980 Svelte 4 vs 5 Svelte 5 |
| Style block approach fragmentation | **MEDIUM** | 3 competing patterns |
| Hardcoded colors bypassing design tokens | **MEDIUM** | 166 files |
| Oversized components (>500 lines) | **LOW** | 74 files |

---

## 1. Script Tag Patterns

### 1a. TypeScript vs Plain JavaScript

**92.1% of files use `<script lang="ts">`** — but 49 files still use plain `<script>`.

| Location | `lang="ts"` | Plain JS | Coverage |
|----------|-------------|----------|----------|
| libs/ | 362 | 24 | 94.0% |
| apps/ | 245 | 24 | 89.7% |
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

**Plain JS in apps/aspen (23 route files) + 1 in apps/domains**

### 1b. Svelte 4 vs Svelte 5 Reactivity

| Pattern | Count | Status |
|---------|-------|--------|
| `$:` reactive statements (Svelte 4) | **1 file** | Nearly eliminated |
| `$state` (Svelte 5) | 262 files | Well adopted |
| `$derived` (Svelte 5) | 365 files | Most used rune |
| `$effect` (Svelte 5) | 158 files | Appropriate use |
| `export let` props (Svelte 4) | **4 files** | All in apps/ivy |
| `$props()` (Svelte 5) | 598 files | 97%+ adopted |
| `<svelte:component>` (Svelte 4) | **1 file** | Acceptable (dynamic icons) |
| `<script context="module">` | **0** | Fully migrated |

**Svelte 4 holdouts (all in Ivy app):**
- `apps/ivy/src/components/ui/Button.svelte` — `export let`
- `apps/ivy/src/components/compose/ComposeModal.svelte` — `export let`
- `apps/ivy/src/components/mail/EmailView.svelte` — `export let`
- `apps/ivy/src/components/mail/ThreadList.svelte` — `export let`
- `apps/ivy/src/routes/(app)/thread/[id]/+page.svelte` — `$:` reactive statement

---

## 2. Import Path Inconsistencies

### 2a. `cn()` Utility — Two Competing Paths

| Import Path | Count | Correct? |
|-------------|-------|----------|
| `$lib/ui/utils` | ~30 files | YES |
| `$lib/utils` | **46 files** | NO — missing `/ui` segment |
| `@autumnsgrove/lattice/ui/utils` | 13 files | YES (for apps) |

All 46 wrong imports are in `libs/engine/src/lib/ui/components/primitives/` (shadcn components) + 1 in Timeline.

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
| `<slot>` (legacy) | **2 files** | Svelte 4 |
| `{@render children()}` (snippets) | 118 files | Svelte 5 |

**Legacy slot files:**
- `libs/vineyard/src/lib/components/vineyard/VineyardLayout.svelte`
- `apps/ivy/src/components/ui/Button.svelte`

---

## 5. Style Block Fragmentation

Three competing approaches coexist:

| Approach | Count | % |
|----------|-------|---|
| No `<style>` block (Tailwind-only) | 321 files | 48.6% |
| `<style lang="postcss">` | 263 files | 39.8% |
| `<style>` (plain CSS) | 77 files | 11.6% |

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
- **138 files** (20.9%) use `style="..."` attributes
- Many are legitimate (dynamic widths, CSS custom property injection, computed positions)
- Some could be converted to Tailwind arbitrary values or CSS classes

---

## 7. Documentation & Comment Drift

| Pattern | Count | % |
|---------|-------|---|
| Files with `interface Props` | 276 | 41.8% |
| Files with JSDoc (`@type`, `@param`) | 341 | 51.6% |
| Files with comprehensive docs (JSDoc + examples) | ~80 | 12% |
| Files with NO documentation | ~320 | 49% |
| HTML template comments (`<!-- -->`) | 204 | 30.8% |
| TODO/FIXME/HACK comments | 13 total | Very clean |

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
74 files exceed 500 lines (11.2%). Top offenders:

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
| Files with `aria-*` attributes | 390 | 59.0% |
| Files with `aria-label` | 260 | 41.7% |
| Files with `role=` | 172 | 26.0% |
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
1. **Add `lang="ts"` to 49 plain JS svelte files** — no logic changes needed
2. **Fix 46 `cn()` import paths** — `$lib/utils` → `$lib/ui/utils` in primitives
3. **Fix 1 Lucide import** — BeeIcon.svelte → use Prism icons
4. **Migrate 4 Ivy `export let` → `$props()`**
5. **Convert 1 `$:` → `$derived`/`$effect`** in Ivy
6. **Convert 2 `<slot>` → `{@render children()}`**

### Phase 2 — Event Handler Migration (Large, systematic)
7. **Migrate `on:` directives → event props** across ~2,980 occurrences
   - This is the biggest single task — should be done app-by-app or directory-by-directory

### Phase 3 — Design Token Compliance
8. **Replace hardcoded colors** in 166 files with CSS custom properties
9. **Audit inline styles** — convert mechanical ones to Tailwind/classes

### Phase 4 — Code Quality
10. **Break up oversized components** (>500 lines, especially >1000 lines)
11. **Add missing `alt` attributes** to 28 image instances
12. **Standardize documentation approach** — pick JSDoc OR TypeScript interfaces, not both
13. **Decide style block convention** — when to use `<style lang="postcss">` vs Tailwind-only

---

## What's Working Well

- **Svelte 5 rune adoption: 94%+** — impressive for a large codebase
- **File naming: 100% consistent** — PascalCase standard with intentional kebab-case for primitives
- **Store patterns: 100% auto-subscription** — no manual `.subscribe()` drift
- **No `clsx`/`classnames` leaks** — all use `cn()` wrapper
- **Very low TODO/FIXME count (13 total)** — clean, completed work
- **No module script drift** — fully migrated from `context="module"`
- **Icon system: 99.6% compliant** — only 1 Lucide leak
