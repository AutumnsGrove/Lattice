# Spacing System

> Consistent spacing creates visual rhythm and hierarchy—like the natural intervals between trees in a forest.

---

## Base Unit

Grove uses a **4px base unit**. All spacing values are multiples of 4, creating a harmonious vertical and horizontal rhythm throughout the interface.

Why 4px? It's small enough for fine-tuning, divisible enough for flexibility, and large enough to create visible distinctions between spacing levels.

```
4px  = 0.25rem = 1 unit
8px  = 0.5rem  = 2 units
16px = 1rem    = 4 units
...and so on
```

---

## Tailwind Spacing Scale

The standard Tailwind spacing scale (which Grove extends) follows this pattern:

| Class | Size | Pixels | Common Usage |
|-------|------|--------|--------------|
| `0` | 0 | 0px | Reset spacing |
| `px` | 1px | 1px | Hairline borders |
| `0.5` | 0.125rem | 2px | Tiny gaps |
| `1` | 0.25rem | 4px | Inline spacing, icon gaps |
| `1.5` | 0.375rem | 6px | Tight form labels |
| `2` | 0.5rem | 8px | Button padding (y), tight gaps |
| `2.5` | 0.625rem | 10px | — |
| `3` | 0.75rem | 12px | Small card padding |
| `3.5` | 0.875rem | 14px | — |
| `4` | 1rem | 16px | Standard padding, card gaps |
| `5` | 1.25rem | 20px | — |
| `6` | 1.5rem | 24px | Section padding (small) |
| `7` | 1.75rem | 28px | — |
| `8` | 2rem | 32px | Component margins |
| `9` | 2.25rem | 36px | — |
| `10` | 2.5rem | 40px | Large gaps |
| `11` | 2.75rem | 44px | Touch target minimum |
| `12` | 3rem | 48px | Section padding (medium) |
| `14` | 3.5rem | 56px | — |
| `16` | 4rem | 64px | Large section spacing |
| `20` | 5rem | 80px | Hero spacing |
| `24` | 6rem | 96px | Major section breaks |
| `28` | 7rem | 112px | — |
| `32` | 8rem | 128px | Extra large spacing |
| `36` | 9rem | 144px | — |
| `40` | 10rem | 160px | — |
| `44` | 11rem | 176px | — |
| `48` | 12rem | 192px | — |
| `52` | 13rem | 208px | — |
| `56` | 14rem | 224px | — |
| `60` | 15rem | 240px | — |
| `64` | 16rem | 256px | — |
| `72` | 18rem | 288px | — |
| `80` | 20rem | 320px | — |
| `96` | 24rem | 384px | — |

---

## Grove Custom Spacing

Beyond the standard scale, Grove defines additional spacing values for specific needs:

| Class | Size | Pixels | Purpose |
|-------|------|--------|---------|
| `18` | 4.5rem | 72px | Mid-size section spacing |
| `22` | 5.5rem | 88px | Between hero and content |
| `30` | 7.5rem | 120px | Large decorative spacing |

These fill gaps in the standard scale where Grove's layouts need intermediate values.

```html
<!-- Using custom spacing -->
<section class="py-18">Medium section padding</section>
<div class="mt-22">Space after hero</div>
<footer class="pt-30">Generous footer breathing room</footer>
```

---

## Max Widths

For readable prose and content containers, Grove provides character-based max-widths:

| Class | Width | Usage |
|-------|-------|-------|
| `max-w-prose-narrow` | 55ch | Focused reading, poetry, quotes |
| `max-w-prose` | 65ch | Standard body text, blog posts |
| `max-w-prose-wide` | 75ch | Technical docs, wider content |

```html
<!-- Standard prose container -->
<article class="max-w-prose mx-auto">
  <p>Content at comfortable reading width...</p>
</article>

<!-- Narrow for intimate content -->
<blockquote class="max-w-prose-narrow mx-auto">
  A quote that draws the eye inward.
</blockquote>

<!-- Wide for technical content -->
<div class="max-w-prose-wide mx-auto">
  <pre><code>Code blocks benefit from extra width</code></pre>
</div>
```

**Why character-based widths?** Lines of 65 characters are optimal for reading comprehension. This isn't arbitrary—it's typography wisdom that makes content feel natural.

---

## Component Spacing Patterns

### Cards

Cards use consistent internal spacing to create cohesive containers.

```html
<div class="p-4 space-y-4">
  <!-- Standard card: 16px padding, 16px gap between children -->
  <h3>Card Title</h3>
  <p>Card content</p>
  <button>Action</button>
</div>

<!-- Compact card variant -->
<div class="p-3 space-y-2">
  <h4>Compact Card</h4>
  <p>Tighter spacing for dense UIs</p>
</div>

<!-- Spacious card variant -->
<div class="p-6 space-y-6">
  <h2>Feature Card</h2>
  <p>More breathing room for hero content</p>
</div>
```

### Sections

Page sections need generous vertical spacing to create clear visual breaks.

```html
<section class="py-12 max-w-4xl mx-auto px-4">
  <!-- Standard section: 48px vertical padding -->
  <h2>Section Title</h2>
  <!-- Content -->
</section>

<section class="py-16 lg:py-24">
  <!-- Hero section: more generous, responsive -->
</section>

<section class="py-8">
  <!-- Compact section: tighter spacing -->
</section>
```

### Forms

Forms have their own spacing rhythm to maintain visual hierarchy between label, input, and helper text.

```html
<form class="space-y-6">
  <!-- 24px between form groups -->

  <div class="space-y-1.5">
    <!-- 6px between label and input -->
    <label class="text-body-sm">Email</label>
    <input type="email" class="..." />
  </div>

  <div class="space-y-1.5">
    <label class="text-body-sm">Password</label>
    <input type="password" class="..." />
    <p class="text-caption text-bark-600">At least 8 characters</p>
  </div>

  <div class="space-y-4">
    <!-- 16px between checkbox groups -->
    <label class="flex items-center gap-2">
      <input type="checkbox" />
      <span>Remember me</span>
    </label>
  </div>

  <button type="submit" class="...">Sign In</button>
</form>
```

**Form spacing summary:**
- `space-y-6` — Between form groups
- `space-y-1.5` — Between label and input
- `space-y-4` — Between checkbox/radio groups
- `gap-2` — Between checkbox and label text

### Navigation

```html
<nav class="flex items-center gap-6">
  <!-- 24px between nav items -->
  <a href="#">Home</a>
  <a href="#">About</a>
  <a href="#">Blog</a>
</nav>

<!-- Mobile nav with tighter spacing -->
<nav class="flex flex-col gap-4 p-4">
  <a href="#">Home</a>
  <a href="#">About</a>
</nav>
```

---

## Nature Element Spacing

Decorative nature elements (trees, leaves, petals) follow organic positioning rules rather than strict grids. This creates the feeling of a real forest clearing rather than a manicured garden.

### Principles

1. **Randomized offsets** — Trees and decorations use slight random offsets from their base positions
2. **Density variation** — Elements cluster naturally rather than spacing evenly
3. **Depth layers** — Background elements have different spacing than foreground
4. **Viewport-aware** — Decorations adapt to screen size, thinning on mobile

### Implementation Pattern

```svelte
<script>
  // Organic positioning for forest elements
  const trees = Array.from({ length: 12 }, (_, i) => ({
    x: (i * 8) + (Math.random() * 4 - 2), // Base grid + random offset
    scale: 0.8 + Math.random() * 0.4,      // Size variation
    delay: Math.random() * 0.5,            // Staggered animation
  }));
</script>

<div class="absolute inset-0 pointer-events-none overflow-hidden">
  {#each trees as tree}
    <div
      class="absolute bottom-0"
      style="left: {tree.x}%; transform: scale({tree.scale})"
    >
      <!-- Tree SVG -->
    </div>
  {/each}
</div>
```

### Spacing Guidelines for Nature Elements

| Element | Base Spacing | Random Variance |
|---------|--------------|-----------------|
| Background trees | 8-10% viewport width | +/- 2% |
| Foreground trees | 15-20% viewport width | +/- 3% |
| Falling leaves | Random across viewport | Full random |
| Ground elements | Clustered near edges | +/- 5% |

**Important:** Nature decorations should never interfere with content readability. Use `pointer-events-none` and ensure sufficient contrast between decorations and text areas.

---

## Responsive Spacing

Grove components typically increase spacing at larger breakpoints for better visual balance.

```html
<!-- Responsive section padding -->
<section class="py-8 md:py-12 lg:py-16">
  <!-- 32px → 48px → 64px -->
</section>

<!-- Responsive gaps -->
<div class="grid gap-4 md:gap-6 lg:gap-8">
  <!-- Cards with responsive gutters -->
</div>

<!-- Responsive max-width -->
<div class="px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
  <!-- Content container -->
</div>
```

### Mobile-First Spacing Tips

- Start with tighter spacing on mobile (screen real estate is precious)
- Increase generously at `md` and `lg` breakpoints
- Touch targets must be at least 44x44px regardless of visual spacing
- Vertical rhythm can be tighter on mobile; horizontal rhythm stays consistent

---

## Quick Reference

| Pattern | Classes |
|---------|---------|
| Card padding | `p-4` or `p-6` |
| Card content gap | `space-y-4` |
| Section vertical | `py-12` or `py-16` |
| Section max-width | `max-w-4xl mx-auto` |
| Form group gap | `space-y-6` |
| Label to input | `space-y-1.5` |
| Nav item gap | `gap-6` |
| Inline icon gap | `gap-2` |
| Button padding | `px-4 py-2` or `px-6 py-3` |
| Prose width | `max-w-prose` |

---

Spacing is the white space between thoughts. Get it right, and content breathes. Get it wrong, and even good words feel cramped or lost. Let your layouts have room to grow.
