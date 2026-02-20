# Hero Carousel Redesign + Broken Link Fixes

## Summary

Redesign the 5 hero carousel slides from a cramped two-panel layout to a **scene-as-background with glass text overlay** approach. Fix all broken `/knowledge/features/*` links across the landing page.

---

## Problem

1. **Mobile is terrible**: `aspect-[4/3]` + `grid-rows-[40%_60%]` = 112px for scene, 168px for text on a phone. Everything is cramped and cut off.
2. **Scenes look sparse**: Small absolutely-positioned nature elements scattered in a tiny panel look like floating debris.
3. **6 broken links**: `/knowledge/features/*` route doesn't exist — articles live under `/knowledge/help/*`.

## Design Approach: Scene-as-Background

Instead of splitting the slide into two side-by-side panels, layer them:

```
Layer 1 (back):  Full-bleed nature scene (fills entire slide)
Layer 2 (mid):   Directional gradient veil (ensures text readability)
Layer 3 (front): Glass text overlay (anchored bottom-left)
```

- **Mobile**: Scene fills entire slide height. Text overlay anchored at bottom with glass background, taking ~60% width.
- **Desktop**: Scene fills entire slide. Text overlay on left side (~50% width), nature elements weighted rightward for visual balance.
- **Result**: Nature scene gets the FULL canvas. Text is readable via glass tint. No cramping.

---

## File Changes (in order)

### 1. `libs/engine/src/lib/ui/components/ui/GlassCarousel.svelte`

**Add `aspectRatio` prop** (non-breaking, default preserves current behavior):

- Add to Props interface: `aspectRatio?: string` (default `"4/3"`)
- Replace hardcoded `aspect-[4/3]` on the card stack div (line 332) with inline `style="aspect-ratio: {aspectRatio}"`
- Support special value `"none"` → no aspect-ratio set, container uses parent height instead
- **After this change**: rebuild engine with `svelte-package -o dist`

### 2. `apps/landing/src/lib/components/hero/HeroSlide.svelte`

**Replace two-panel grid with layered stack:**

```svelte
<!-- Old: grid-rows-[40%_60%] splitting scene/text -->
<!-- New: stacked layers -->
<div class="relative w-full h-full overflow-hidden bg-gradient-to-br {gradientClass}">
	<!-- Layer 1: Full-bleed scene -->
	<div class="absolute inset-0" aria-hidden="true">
		{@render scene()}
	</div>

	<!-- Layer 2: Gradient veil for text readability -->
	<div
		class="absolute inset-0 pointer-events-none
    bg-gradient-to-t from-white/80 via-white/40 to-transparent
    dark:from-slate-900/85 dark:via-slate-900/40 dark:to-transparent
    md:bg-gradient-to-r md:from-white/80 md:via-white/30 md:to-transparent
    md:dark:from-slate-900/85 md:dark:via-slate-900/30 md:dark:to-transparent"
	></div>

	<!-- Layer 3: Glass text overlay -->
	<div
		class="absolute bottom-0 left-0 right-0 md:right-auto md:top-0 md:w-[55%]
    flex flex-col justify-end md:justify-center
    p-5 pb-6 md:p-8 lg:p-10"
	>
		<Lexend as="div" class="flex flex-col gap-2.5 md:gap-3">
			{@render text()}
		</Lexend>
	</div>
</div>
```

Key changes:

- Scene is `absolute inset-0` (fills entire slide)
- Gradient veil: bottom-to-top on mobile (text at bottom), left-to-right on desktop (text on left)
- Text overlay: anchored bottom on mobile, left column on desktop
- More padding: `p-5 pb-6` mobile, `p-8` tablet, `p-10` desktop

### 3. Each hero component (5 files)

**Recompose scene elements** for full-canvas layout:

Common pattern for all 5 slides:

- **Increase element sizes** ~25-30% (they now have the full slide as canvas)
- **Spread wider** — elements can use 0-100% of width instead of being confined to a 45% panel
- **Weight rightward on desktop** — since text overlays the left, cluster nature elements center-right
- **Show more elements on mobile** — remove some `hidden md:block` restrictions since they have room now
- **Keep seasonal props** and `animate={active}` as-is

Files:

- `apps/landing/src/lib/components/hero/HeroRefuge.svelte`
- `apps/landing/src/lib/components/hero/HeroOwnership.svelte`
- `apps/landing/src/lib/components/hero/HeroShade.svelte`
- `apps/landing/src/lib/components/hero/HeroCentennial.svelte`
- `apps/landing/src/lib/components/hero/HeroCommunity.svelte`

### 4. `apps/landing/src/routes/+page.svelte`

**Carousel usage update:**

```svelte
<GlassCarousel
  itemCount={5}
  showDots={true}
  showArrows={true}
  autoplay={false}
  variant="minimal"
  aspectRatio="none"
  class="w-full h-[280px] sm:h-[320px] md:h-[380px] lg:h-[420px]"
>
```

- Switch to `variant="minimal"` (hero slides have their own gradients, don't need carousel's glass border)
- Use `aspectRatio="none"` + explicit responsive heights instead of fixed 4/3
- Heights give comfortable room: 280px phone → 420px desktop

**Fix broken feature grid links (lines 46-69):**

- `'/knowledge/features/flow-editor'` → `'/knowledge/help/what-is-flow'`
- `'/knowledge/features/shade'` → `'/knowledge/help/what-is-shade'`
- `'/knowledge/features/domains'` → `'/pricing'` (no domains article exists)
- `'/knowledge/features/gallery'` → `'/knowledge/help/what-is-gallery'`

### 5. Fix hero broken links

- `HeroShade.svelte` line 30: `href="/knowledge/features/shade"` → `href="/knowledge/help/what-is-shade"`
- `HeroCentennial.svelte` line 30: `href="/knowledge/features/centennial"` → `href="/knowledge/help/what-is-centennial"`

### 6. `apps/landing/src/lib/components/hero/hero.test.ts`

Update test expectations for corrected URLs:

- `ctaHref: "/knowledge/features/shade"` → `"/knowledge/help/what-is-shade"`
- `ctaHref: "/knowledge/features/centennial"` → `"/knowledge/help/what-is-centennial"`

---

## Verification

1. **Engine rebuild**: `cd packages/engine && bun x svelte-package -o dist`
2. **Type check**: `cd packages/landing && npx svelte-check --tsconfig ./tsconfig.json`
3. **Tests**: `cd packages/landing && bun run test` (hero.test.ts should pass)
4. **Visual check**: `cd packages/landing && bun run dev` → test at 375px (mobile), 768px (tablet), 1280px (desktop)
5. **Link check**: Click all CTA buttons in hero slides + feature grid cards → verify they resolve
6. **Season check**: Click the logo to cycle seasons → verify all slides adapt
7. **Reduced motion**: Enable `prefers-reduced-motion: reduce` in DevTools → verify no animations

---

## What We're NOT Changing

- GlassCarousel navigation (dots, arrows, swipe) — works fine
- Carousel stack card animation — works fine
- Season system — works great
- Gradient color palettes in `hero-types.ts` — the 5 variants are good
- Nature component library — using existing engine components as-is
