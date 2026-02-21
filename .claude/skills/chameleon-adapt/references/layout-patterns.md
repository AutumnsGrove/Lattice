# Chameleon Adapt: Layout Patterns

> Loaded by chameleon-adapt during Phase 2 (SKETCH). See SKILL.md for the full workflow.

---

## The Layering Formula

Every Grove page follows a consistent z-index layering order. Establish this skeleton before applying color or texture.

```
Background (gradients, vines, nature base)
    ↓
Decorative Elements (trees, clouds, particles)
    ↓
Glass Surface (translucent + blur)
    ↓
Content (text, cards, UI)
```

In code:

```svelte
<main class="relative min-h-screen overflow-hidden">
  <!-- Layer 0: Background gradient -->
  <div class="absolute inset-0 bg-gradient-to-b from-sky-100 to-emerald-50 dark:from-slate-900 dark:to-emerald-950" />

  <!-- Layer 1: Decorative nature (z-index 1-3) -->
  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    {#each forestTrees as tree}
      <!-- trees rendered here -->
    {/each}
  </div>

  <!-- Layer 2: Particle effects (z-index 5-100) -->
  {#if !prefersReducedMotion}
    <FallingLeavesLayer trees={forestTrees} season={$season} />
  {/if}

  <!-- Layer 3: Page content (relative, z-10+) -->
  <div class="relative z-10">
    <!-- all actual page content here -->
  </div>
</main>
```

---

## Sticky Navigation

The standard sticky nav pattern. Note the `top-[73px]` — this accounts for any site-level top bar (e.g., alert banners).

```svelte
<nav class="sticky top-[73px] z-30 glass-surface border-b border-divider">
  <!-- Navigation content -->
</nav>
```

Use `top-0` if there is no site-level top bar above the page nav.

---

## Page Section Patterns

### Hero Section — Full Atmosphere

For story pages, landing pages, about pages:

```svelte
<section class="relative min-h-[60vh] flex items-center">
  <!-- Forest background -->
  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    {#each forestTrees as tree}<!-- ... -->{/each}
    {#if !prefersReducedMotion}
      <FallingLeavesLayer trees={forestTrees} season={$season} />
    {/if}
  </div>

  <!-- Glass hero content -->
  <div class="relative z-10 max-w-4xl mx-auto px-6 py-24">
    <Glass variant="tint" class="rounded-2xl p-10">
      <h1 class="text-4xl font-bold">Page Title</h1>
      <p class="mt-4 text-lg text-muted-foreground">Subtitle text</p>
    </Glass>
  </div>
</section>
```

### Content Section — Glass Cards Grid

For feature listings, team pages, blog grids:

```svelte
<section class="relative py-16 px-4">
  <div class="max-w-6xl mx-auto">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each items as item}
        <GlassCard title={item.title} variant="card" hoverable>
          {item.description}
        </GlassCard>
      {/each}
    </div>
  </div>
</section>
```

### Data-Dense Section — Clean Glass, No Nature Distractions

For admin panels, forms, settings:

```svelte
<section class="py-8 px-4">
  <div class="max-w-2xl mx-auto">
    <Glass variant="surface" class="rounded-xl p-6">
      <!-- Form or data content — no trees, no particles -->
      <form><!-- ... --></form>
    </Glass>
  </div>
</section>
```

---

## Responsive Design Patterns

### Breakpoints (Tailwind standard)

| Breakpoint | Width     | Density Multiplier |
| ---------- | --------- | ------------------ |
| Mobile     | `< 768px` | 1.0x               |
| Tablet     | `768px`   | 1.3x               |
| Desktop    | `1024px`  | 1.8x               |
| Large      | `1440px`  | 2.5x               |
| Ultrawide  | `2560px`  | 3.5x               |

### Mobile Navigation — Overflow to Sheet Menu

Desktop nav items that don't fit at small sizes go to a mobile sheet menu:

```svelte
<!-- Desktop navigation (hidden on mobile) -->
<nav class="hidden md:flex items-center gap-4">
  <!-- nav items -->
</nav>

<!-- Mobile menu button (visible on mobile only) -->
<button onclick={() => mobileMenuOpen = true} class="md:hidden p-2 min-w-[44px] min-h-[44px]">
  <Menu class="w-5 h-5" />
</button>

<!-- Sheet drawer for mobile -->
<MobileMenu bind:open={mobileMenuOpen} onClose={() => mobileMenuOpen = false} />
```

### Responsive Text Sizing

```svelte
<h1 class="text-2xl md:text-3xl lg:text-4xl font-bold">
  Page heading
</h1>
<p class="text-sm md:text-base lg:text-lg text-muted-foreground">
  Body copy
</p>
```

### Responsive Grid

```svelte
<!-- Adapts from 1 column (mobile) to 3 columns (desktop) -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
  <!-- items -->
</div>
```

---

## Spacing System

Grove uses Tailwind spacing consistently:

| Context               | Spacing                      |
| --------------------- | ---------------------------- |
| Page horizontal padding | `px-4 md:px-6 lg:px-8`     |
| Section vertical padding | `py-12 md:py-16 lg:py-24`  |
| Card internal padding | `p-4 md:p-6`                |
| Stack gaps (flex/grid) | `gap-4 md:gap-6`            |
| Max content width     | `max-w-6xl mx-auto`          |
| Narrow content width  | `max-w-2xl mx-auto`          |

---

## Accessibility Layout Rules

- **Touch targets:** Minimum `44x44px` on all interactive elements — use `min-w-[44px] min-h-[44px]` or `p-3` on buttons
- **Focus order:** Matches visual DOM order — do not use `tabindex` to reorder
- **Skip links:** Add `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to content</a>` at the top of page layouts
- **Decorative elements:** All nature decorations (`aria-hidden="true"`) — never convey meaning through visual-only elements

```svelte
<!-- Correct: decorative trees are hidden from screen readers -->
<div aria-hidden="true" class="absolute inset-0 pointer-events-none">
  <!-- forest trees -->
</div>

<!-- Correct: touch target size -->
<button class="p-3 min-w-[44px] min-h-[44px] rounded-lg">
  <Menu class="w-5 h-5" />
</button>
```

---

## Page Purpose vs. Decoration Level

| Page Type              | Decoration Level | Pattern                                    |
| ---------------------- | ---------------- | ------------------------------------------ |
| Story/narrative        | Full             | Forest, particles, seasonal birds          |
| Landing/hero           | Full             | Randomized forest, weather effects         |
| About / team           | Moderate         | Forest backdrop, glass cards               |
| Blog / content list    | Moderate         | Subtle nature accents, glass surface nav   |
| Forms / auth           | Minimal          | Clean glass surfaces, no nature elements   |
| Admin / data-dense     | Minimal          | Glass panels only, no decorative elements  |
