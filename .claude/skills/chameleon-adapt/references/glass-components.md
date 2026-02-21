# Chameleon Adapt: Glass Components

> Loaded by chameleon-adapt during Phase 2 (SKETCH) and Phase 4 (TEXTURE). See SKILL.md for the full workflow.

All glass components import from `@lattice/ui/ui`.

---

## Import

```svelte
import { Glass, GlassCard, GlassButton, GlassOverlay } from '@lattice/ui/ui';
```

---

## Glass Variants

| Variant   | Use Case              | Light Mode  | Dark Mode  |
| --------- | --------------------- | ----------- | ---------- |
| `surface` | Headers, navbars      | 95% white   | 95% slate  |
| `tint`    | Text over backgrounds | 60% white   | 50% slate  |
| `card`    | Content cards         | 80% white   | 70% slate  |
| `accent`  | Callouts, highlights  | 30% accent  | 20% accent |
| `overlay` | Modal backdrops       | 50% black   | 60% black  |
| `muted`   | Subtle backgrounds    | 40% white   | 30% slate  |

---

## `<Glass>`

General-purpose glass container. Use for readable text placed over busy backgrounds.

```svelte
<!-- Basic container with tint variant -->
<Glass variant="tint" class="p-6 rounded-xl">
  <p>Readable text over busy backgrounds</p>
</Glass>

<!-- Surface variant for sticky navigation -->
<Glass variant="surface" class="sticky top-0 z-30 border-b border-divider">
  <!-- nav content -->
</Glass>

<!-- Accent variant for callouts -->
<Glass variant="accent" class="p-4 rounded-lg">
  Important notice
</Glass>
```

---

## `<GlassCard>`

Card component with built-in glass styling, optional title, and hover effect.

```svelte
<!-- Default card -->
<GlassCard title="Settings" variant="default" hoverable>
  Content here
</GlassCard>

<!-- Card without title -->
<GlassCard variant="tint">
  <p>Just content</p>
</GlassCard>
```

**Props:**

| Prop       | Type      | Default     | Description                         |
| ---------- | --------- | ----------- | ------------------------------------ |
| `title`    | `string`  | —           | Optional card heading                |
| `variant`  | `string`  | `"default"` | Glass variant (see table above)      |
| `hoverable`| `boolean` | `false`     | Adds subtle lift/glow on hover       |

---

## `<GlassButton>`

Button styled with glass effect. Use for CTAs placed over nature/seasonal backgrounds.

```svelte
<GlassButton variant="accent">Subscribe</GlassButton>
<GlassButton variant="surface">Learn More</GlassButton>
```

**Props:**

| Prop      | Type     | Default    | Description                     |
| --------- | -------- | ---------- | -------------------------------- |
| `variant` | `string` | `"surface"` | Glass variant                   |

---

## `<GlassOverlay>`

Backdrop for modals and drawers.

```svelte
<GlassOverlay bind:open={modalOpen}>
  <!-- modal content -->
</GlassOverlay>
```

---

## CSS Utility Classes

Apply glass effects directly to any HTML element without importing components:

```html
<!-- Basic glass -->
<div class="glass rounded-xl p-4">Basic glass</div>

<!-- Text container (60% white) -->
<div class="glass-tint p-6">Text container</div>

<!-- Highlighted section -->
<div class="glass-accent p-4">Highlighted section</div>

<!-- Sticky navbar -->
<nav class="glass-surface sticky top-0">Navbar</nav>
```

| Class           | Variant   | Notes                          |
| --------------- | --------- | ------------------------------ |
| `glass`         | `card`    | Default glass                  |
| `glass-tint`    | `tint`    | For text legibility            |
| `glass-accent`  | `accent`  | Highlights, callouts           |
| `glass-surface` | `surface` | Navbars, sticky headers        |
| `glass-muted`   | `muted`   | Subtle background sections     |

---

## Composition Patterns

### Sticky Navigation

```svelte
<nav class="sticky top-[73px] z-30 glass-surface border-b border-divider">
  <!-- Navigation content -->
</nav>
```

### Glass Over Forest Background

The layering order matters. Glass sits above nature, below content:

```
Background (gradients, vines)
    ↓
Decorative Elements (trees, clouds, particles)
    ↓
Glass Surface (translucent + blur)   ← Glass lives here
    ↓
Content (text, cards, UI)
```

### Modal with Glass Backdrop

```svelte
{#if modalOpen}
  <div class="fixed inset-0 z-50">
    <Glass variant="overlay" class="absolute inset-0" />
    <div class="relative z-10 flex items-center justify-center h-full">
      <GlassCard variant="card" class="max-w-lg w-full p-6">
        <!-- modal content -->
      </GlassCard>
    </div>
  </div>
{/if}
```

### Text Section Over Busy Background

```svelte
<section class="relative">
  <!-- Background nature elements -->
  <div class="absolute inset-0 overflow-hidden">
    <!-- trees, particles, etc. -->
  </div>

  <!-- Glass text container lifted above -->
  <div class="relative z-10 max-w-2xl mx-auto py-16 px-4">
    <Glass variant="tint" class="rounded-2xl p-8">
      <h2 class="text-2xl font-semibold">Readable heading</h2>
      <p>Readable body text over the forest.</p>
    </Glass>
  </div>
</section>
```

---

## Performance Notes

- **Multiple glass layers** can cause blur compositing cost — stack no more than 2-3 layered glass surfaces on the same axis.
- On mobile, prefer `glass-tint` (lighter effect) over heavy variants to reduce GPU load.
- Dark mode glass variants are pre-tuned — do not override `backdrop-filter` manually.
