# Landing Page Performance Optimization Plan

**Created:** February 1, 2026
**Status:** Planned
**Priority:** High — Mobile PageSpeed scores significantly impacted
**Related Issues:**

- (create issue) Move vine animation CSS to separate lazy-loaded file
- (create issue) Add font preconnect and preload for Lexend
- (create issue) Audit and reduce unused CSS (22 KiB)
- (create issue) Investigate unused JavaScript chunks (59 KiB)
- (create issue) Fix btn-primary contrast for WCAG AAA
- (create issue) Fix heading order in RoadmapPreview component

---

## Executive Summary

PageSpeed Insights (Feb 1, 2026) revealed significant mobile performance issues on grove.place. The primary bottleneck was a 2,530ms render delay caused by the vine swinging animation.

**Immediate fix completed:** Disabled vine animation via feature flag (`VINE_ANIMATION_ENABLED = false` in `+layout.svelte`), preserving all animation code for future re-enablement.

This plan captures the remaining optimization work across three tiers.

---

## Current Metrics (Mobile - Slow 4G, Pre-Fix)

| Metric                   | Score | Target  | Status     |
| ------------------------ | ----- | ------- | ---------- |
| First Contentful Paint   | 3.4s  | < 1.8s  | Failing    |
| Largest Contentful Paint | 3.5s  | < 2.5s  | Needs Work |
| Total Blocking Time      | 0 ms  | < 200ms | Passing    |
| Cumulative Layout Shift  | 0     | < 0.1   | Passing    |
| Speed Index              | 5.0s  | < 3.4s  | Needs Work |

**LCP Breakdown:**

- Time to first byte: 0 ms (excellent)
- Element render delay: 2,530 ms (problematic — vine animation)

---

## Completed Work

### Vine Animation Disable (Feb 1, 2026)

**Files Modified:**

- `apps/landing/src/routes/+layout.svelte` — Added `VINE_ANIMATION_ENABLED = false` feature flag
- `apps/landing/src/app.html` — Updated fallback script to respect disabled state

**Behavior:**

- Vine swinging animation: Disabled
- Logo breathing: Shows for 800ms before overlay removal
- All CSS keyframes and HTML structure: Preserved intact
- Re-enable: Set `VINE_ANIMATION_ENABLED = true`

**Expected improvement:** ~2.5s reduction in FCP/LCP render delay

---

## Tier 1: High Impact (FCP/LCP Critical)

### 1.1 Move Vine Animation CSS to Separate File

**Current State:**

- `app.html` contains ~555 lines of inline CSS for vine animation keyframes
- 16 keyframe definitions (`vine-swing-r-1` through `vine-swing-r-8`, etc.)
- CSS loads regardless of whether animation plays

**Proposed Solution:**

```html
<!-- Only load animation styles when needed -->
<link
	rel="stylesheet"
	href="/vine-animation.css"
	media="print"
	onload="this.media='all'"
	id="vine-styles"
/>
```

Or conditionally inject via JavaScript when `VINE_ANIMATION_ENABLED` is true.

**Actions:**

1. Extract vine keyframes to `apps/landing/static/vine-animation.css`
2. Lazy-load CSS only when animation is enabled
3. Keep inline CSS for logo breathing (`grove-breathe`) since it's always used

**Expected Savings:** ~15-20 KiB HTML reduction

---

### 1.2 Font Loading Optimization

**Current State:**

- 19 `@font-face` declarations in `app.css`
- All fonts have `font-display: swap`
- No preconnect or preload hints

**Proposed Solution:**

```html
<!-- Add to app.html <head> -->
<link rel="preconnect" href="https://cdn.grove.place" crossorigin />
<link
	rel="preload"
	as="font"
	type="font/woff2"
	href="https://cdn.grove.place/fonts/Lexend-Regular.woff2"
	crossorigin
/>
```

**Actions:**

1. Add preconnect for CDN domain
2. Preload primary Lexend weights (Regular, Medium, Bold)
3. Consider font subsetting for landing page (Latin only)
4. Evaluate if all 19 font variants are needed on landing

**Expected Savings:** 100-300ms FCP improvement

---

### 1.3 Conditional Overlay Loading

**Current State:**

- Overlay HTML (~15 KiB of inline SVG) renders for every visitor
- Immediately removed for returning visitors within cooldown
- Vines contain 16 strips × 8 segments × detailed SVG paths

**Proposed Solution:**
Move overlay HTML to a dynamic template that only injects when animation will play.

**Actions:**

1. Move overlay HTML to a `<template>` element or separate file
2. Check cooldown before injecting overlay DOM
3. For disabled state, skip overlay entirely (just show logo briefly via simpler method)

**Expected Savings:** ~15 KiB HTML for returning visitors

---

## Tier 2: Medium Impact (Speed Index, Bundle Size)

### 2.1 Reduce Unused CSS (22 KiB Savings)

**Current State:**

- `assets/0.DRgaAXMg.css`: 24.5 KiB transfer, 22 KiB unused
- Likely Tailwind classes from engine components not used on landing

**Actions:**

1. Audit `tailwind.config.js` content paths
2. Review if engine components are being scanned unnecessarily
3. Consider landing-specific Tailwind build
4. Use coverage tools to identify unused selectors
5. Evaluate PurgeCSS as build step

**Investigation Questions:**

- Which engine components are imported but not rendered?
- Are there conditional components inflating the CSS?

---

### 2.2 Reduce Unused JavaScript (59 KiB Savings)

**Current State:**

- `chunks/Dtmyja5T.js`: 95.7 KiB transfer, 59.3 KiB unused
- Unknown what dependency this chunk contains

**Actions:**

1. Add bundle analyzer to Vite config:
   ```js
   import { visualizer } from "rollup-plugin-visualizer";
   // Add to plugins array
   ```
2. Identify large dependencies in unused chunks
3. Lazy load non-critical components
4. Consider dynamic imports for heavy dependencies:
   ```js
   const HeavyComponent = await import("./HeavyComponent.svelte");
   ```

**Investigation Questions:**

- What is in `Dtmyja5T.js`? (Chart library? Icon set? Animation library?)
- Is it used only on certain routes?

---

### 2.3 JavaScript Minification (9 KiB Savings)

**Current State:**

- `chunks/6tCz9-Bd.js`: 10.4 KiB (6.5 KiB potential savings)
- `chunks/I4SC9Jrg.js`: 6.6 KiB (2.1 KiB potential savings)

**Actions:**

1. Review Vite/Rollup minification settings in `vite.config.ts`
2. Ensure terser is enabled with optimal settings:
   ```js
   build: {
     minify: 'terser',
     terserOptions: {
       compress: { drop_console: true, drop_debugger: true }
     }
   }
   ```
3. Check if source maps are accidentally included in production

---

## Tier 3: Quick Wins (Accessibility + Minor)

### 3.1 Fix btn-primary Contrast

**Current State:**

- White text on `#16a34a` (grove-600) background
- Contrast ratio: 4.53:1
- Passes WCAG AA, fails AAA for normal text

**Failing Elements:**

- "Plant Your Blog" button
- "Notify me" button

**Proposed Solution:**
Darken the primary green to `#15803d` (grove-700):

```css
/* In tailwind.preset.js or app.css */
.btn-primary {
	--btn-primary-bg: var(--color-grove-700); /* was grove-600 */
}
```

**New Ratio:** ~5.89:1 (passes WCAG AAA)

**Actions:**

1. Update `btn-primary` background color
2. Verify visual design approval
3. Test across all instances

---

### 3.2 Fix Heading Order in RoadmapPreview

**Current State:**

- `RoadmapPreview.svelte` uses `<h3>` for phase titles
- Skips h2 when used in certain page contexts
- Accessibility warning for heading hierarchy

**Failing Element:**

- `<h3 class="text-xl font-serif text-foreground">Thaw</h3>`

**Proposed Solution:**
Make heading level configurable:

```svelte
<!-- RoadmapPreview.svelte -->
<script lang="ts">
	let { headingLevel = "h3" }: { headingLevel?: "h2" | "h3" | "h4" } = $props();
</script>

<svelte:element this={headingLevel} class="text-xl font-serif text-foreground">
	{phase}
</svelte:element>
```

**Actions:**

1. Add `headingLevel` prop to `RoadmapPreview.svelte`
2. Update landing page usage to pass appropriate level
3. Audit other components for similar issues

---

### 3.3 Review Cloudflare Rocket Loader

**Current State:**

- `rocket-loader.min.js` (Cloudflare): 5 KiB, 47m cache TTL
- Low cache TTL flagged by PageSpeed

**Actions:**

1. Evaluate if Rocket Loader is necessary (may conflict with SvelteKit hydration)
2. If needed, check Cloudflare dashboard for cache settings
3. Consider disabling if not providing benefit

**Location:** Cloudflare Dashboard → Speed → Optimization → Rocket Loader

---

## Implementation Sequence

### Phase 1: Validate Animation Disable

1. Deploy current changes
2. Run PageSpeed Insights on production
3. Verify FCP/LCP improvements
4. Document actual metrics

### Phase 2: Quick Wins (1-2 days)

1. Fix btn-primary contrast
2. Fix heading order in RoadmapPreview
3. Add font preconnect/preload

### Phase 3: CSS/JS Optimization (3-5 days)

1. Set up bundle analyzer
2. Identify and address unused JavaScript
3. Audit and reduce unused CSS
4. Review minification settings

### Phase 4: Architecture Improvements (Future)

1. Extract vine animation CSS to separate file
2. Implement conditional overlay loading
3. Consider edge-side rendering optimizations

---

## Success Metrics

| Metric            | Current | Target | Stretch Goal |
| ----------------- | ------- | ------ | ------------ |
| FCP               | 3.4s    | < 2.0s | < 1.5s       |
| LCP               | 3.5s    | < 2.5s | < 2.0s       |
| Speed Index       | 5.0s    | < 3.5s | < 3.0s       |
| Performance Score | ~50     | > 70   | > 85         |

---

## Monitoring

After implementing changes:

1. **PageSpeed Insights** — Run on both mobile and desktop after each deployment
2. **Cloudflare Analytics** — Monitor real user Core Web Vitals
3. **Bundle Size** — Track JS/CSS bundle sizes in CI

---

## References

- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse Scoring Calculator](https://googlechrome.github.io/lighthouse/scorecalc/)
- [SvelteKit Performance](https://kit.svelte.dev/docs/performance)

---

_Last updated: February 1, 2026_
