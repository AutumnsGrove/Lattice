---
title: Animation Guide
description: Subtle animations that create a living world
category: design
lastUpdated: '2026-01-18'
---
# Animation Guide

> Alive but not distracting — subtle animations that create a living world.

Grove's animation system brings warmth and life to the interface while respecting every visitor's preferences. Like leaves stirring in a gentle breeze, our animations add character without demanding attention.

---

## Principles

### 1. Organic, Not Mechanical

Animations should feel like they belong in nature. Growth happens gradually. Movement has weight and intention. Nothing snaps or jerks — everything flows like water finding its path.

### 2. Purposeful Motion

Every animation serves a reason: guiding attention, confirming an action, or creating continuity between states. Decorative motion is kept subtle and optional. If an animation doesn't help someone understand what's happening, it shouldn't exist.

### 3. Respect User Preferences

**This is non-negotiable.** All animations must respect `prefers-reduced-motion`. Some visitors experience motion sickness, vestibular disorders, or simply find animation distracting. Grove is a refuge — it should never cause discomfort.

### 4. Performance First

Animations should never cause jank or delay interaction. We use CSS transforms and opacity (GPU-accelerated properties) rather than animating layout properties. A smooth 60fps experience matters more than elaborate effects.

---

## Available Animations

All animations are available as Tailwind utilities with the `animate-` prefix.

### Fade Animations

Gentle opacity transitions for elements entering or leaving the view.

| Class | Duration | Easing | Use Case |
|-------|----------|--------|----------|
| `animate-fade-in` | 300ms | ease-out | Content appearing, modal opens |
| `animate-fade-out` | 200ms | ease-in | Content disappearing, dismissals |
| `animate-fade-in-up` | 400ms | ease-out | Cards loading, list items appearing |
| `animate-fade-in-down` | 400ms | ease-out | Dropdown menus, notifications from top |

**Keyframe Details:**

```css
/* fade-in: Simple opacity transition */
0%   { opacity: 0 }
100% { opacity: 1 }

/* fade-in-up: Rise gently into view */
0%   { opacity: 0; transform: translateY(8px) }
100% { opacity: 1; transform: translateY(0) }

/* fade-in-down: Descend softly into place */
0%   { opacity: 0; transform: translateY(-8px) }
100% { opacity: 1; transform: translateY(0) }
```

**Example Usage:**

```html
<!-- Card appearing on page load -->
<div class="animate-fade-in-up">
  <GlassCard>Welcome to the Grove</GlassCard>
</div>

<!-- Notification dropping in -->
<div class="animate-fade-in-down">
  <Toast>Your changes have been saved.</Toast>
</div>
```

---

### Growth Animations

Inspired by nature — things growing, blooming, and breathing. These create an organic feel that mechanical scale transforms lack.

| Class | Duration | Easing | Use Case |
|-------|----------|--------|----------|
| `animate-grow` | 400ms | ease-out | Modals opening, cards expanding |
| `animate-grow-slow` | 600ms | ease-out | Hero sections, major reveals |
| `animate-shrink` | 300ms | ease-in | Elements closing, dismissals |
| `animate-bloom` | 500ms | ease-out | Buttons on success, celebrations |
| `animate-pulse-soft` | 2s | ease-in-out | Subtle attention, loading states |

**Keyframe Details:**

```css
/* grow: Scale up gently like a seedling emerging */
0%   { opacity: 0; transform: scale(0.95) }
100% { opacity: 1; transform: scale(1) }

/* shrink: Contract gracefully, like closing a flower */
0%   { opacity: 1; transform: scale(1) }
100% { opacity: 0; transform: scale(0.95) }

/* bloom: Overshoot slightly, then settle — like a flower opening */
0%   { opacity: 0; transform: scale(0.8) }
50%  { transform: scale(1.02) }
100% { opacity: 1; transform: scale(1) }

/* pulse-soft: Gentle breathing, never harsh */
0%, 100% { opacity: 1 }
50%      { opacity: 0.7 }
```

**Example Usage:**

```html
<!-- Modal opening with organic growth -->
<div class="animate-grow">
  <GlassDialog>Are you sure?</GlassDialog>
</div>

<!-- Success state with celebratory bloom -->
<button class="animate-bloom">
  Saved!
</button>

<!-- Subtle indicator that something is processing -->
<div class="animate-pulse-soft">
  Loading your grove...
</div>
```

---

### Nature Animations

These bring the forest to life. Used sparingly for decorative elements — falling leaves, swaying branches, gentle seasonal touches.

| Class | Duration | Easing | Behavior | Use Case |
|-------|----------|--------|----------|----------|
| `animate-leaf-fall` | 3s | ease-in-out | Infinite | Falling leaves, petals, snowflakes |
| `animate-leaf-sway` | 4s | ease-in-out | Infinite | Branches swaying, gentle movement |

**Keyframe Details:**

```css
/* leaf-fall: Drift down while rotating, like an autumn leaf */
0%   { transform: translateY(-10px) rotate(0deg); opacity: 0 }
10%  { opacity: 1 }
90%  { opacity: 1 }
100% { transform: translateY(100px) rotate(45deg); opacity: 0 }

/* leaf-sway: Rock gently back and forth, like a branch in the breeze */
0%, 100% { transform: rotate(-3deg) }
50%      { transform: rotate(3deg) }
```

**Example Usage:**

```html
<!-- Seasonal decoration -->
<div class="animate-leaf-fall">
  <LeafIcon />
</div>

<!-- Tree branch swaying gently -->
<div class="animate-leaf-sway origin-bottom">
  <TreeBranch />
</div>
```

**Important:** Nature animations should always be disabled when `prefers-reduced-motion` is set. They're purely decorative and never essential to understanding the interface.

---

### Slide Animations

Directional entrances for panels, sidebars, and contextual content. These communicate where something came from and where it belongs.

| Class | Duration | Easing | Use Case |
|-------|----------|--------|----------|
| `animate-slide-in-right` | 300ms | ease-out | Sidebars, panel reveals from right |
| `animate-slide-in-left` | 300ms | ease-out | Navigation drawers, back transitions |
| `animate-slide-in-up` | 300ms | ease-out | Bottom sheets, mobile menus |
| `animate-slide-in-down` | 300ms | ease-out | Dropdown menus, header reveals |

**Keyframe Details:**

```css
/* slide-in-right: Enter from the right edge */
0%   { opacity: 0; transform: translateX(16px) }
100% { opacity: 1; transform: translateX(0) }

/* slide-in-left: Enter from the left edge */
0%   { opacity: 0; transform: translateX(-16px) }
100% { opacity: 1; transform: translateX(0) }

/* slide-in-up: Rise from below */
0%   { opacity: 0; transform: translateY(16px) }
100% { opacity: 1; transform: translateY(0) }

/* slide-in-down: Descend from above */
0%   { opacity: 0; transform: translateY(-16px) }
100% { opacity: 1; transform: translateY(0) }
```

**Example Usage:**

```html
<!-- Mobile menu sliding in from left -->
<nav class="animate-slide-in-left">
  <MobileMenu />
</nav>

<!-- Settings panel from right -->
<aside class="animate-slide-in-right">
  <SettingsPanel />
</aside>
```

---

### Spinner Animations

For loading states when you need rotation. The organic spinner varies its speed slightly, feeling more natural than mechanical rotation.

| Class | Duration | Easing | Behavior | Use Case |
|-------|----------|--------|----------|----------|
| `animate-spin-slow` | 2s | linear | Infinite | Standard loading, progress |
| `animate-spin-organic` | 1.5s | ease-in-out | Infinite | Natural-feeling spinners |

**Keyframe Details:**

```css
/* spin-slow: Standard rotation, slower than Tailwind's default */
0%   { transform: rotate(0deg) }
100% { transform: rotate(360deg) }

/* spin-organic: Varies speed throughout rotation, feels alive */
0%   { transform: rotate(0deg) }
25%  { transform: rotate(100deg) }   /* Accelerates */
50%  { transform: rotate(180deg) }
75%  { transform: rotate(260deg) }   /* Decelerates */
100% { transform: rotate(360deg) }
```

**Example Usage:**

```html
<!-- Loading indicator with organic feel -->
<div class="animate-spin-organic">
  <LeafSpinner />
</div>
```

---

## Transitions

For interactive state changes (hover, focus, active), use transition utilities rather than animations. These are smoother and more appropriate for user-initiated changes.

### Duration Utilities

| Class | Duration | Use Case |
|-------|----------|----------|
| `duration-grove-fast` | 150ms | Micro-interactions, hovers |
| `duration-grove` | 200ms | Standard interactions, buttons |
| `duration-grove-slow` | 300ms | Panel transitions, expansions |
| `duration-grove-slower` | 500ms | Major state changes, page transitions |

### Easing Functions

| Class | Curve | Character |
|-------|-------|-----------|
| `ease-grove` | `cubic-bezier(0.4, 0, 0.2, 1)` | Smooth, natural deceleration |
| `ease-grove-bounce` | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | Playful overshoot and settle |
| `ease-grove-soft` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | Gentle, barely perceptible |

**Example Usage:**

```html
<!-- Button with smooth hover transition -->
<button class="transition-all duration-grove ease-grove hover:scale-105">
  Subscribe
</button>

<!-- Card with playful hover effect -->
<div class="transition-transform duration-grove-slow ease-grove-bounce hover:-translate-y-1">
  <GlassCard />
</div>

<!-- Subtle link underline -->
<a class="transition-colors duration-grove-fast ease-grove-soft hover:text-grove-600">
  Learn more
</a>
```

---

## Reduced Motion

**This section is critical. Read it carefully.**

Grove must be comfortable for everyone, including people with vestibular disorders, motion sensitivity, or those who simply prefer less movement. The `prefers-reduced-motion` media query tells us when someone has requested reduced motion in their system settings.

### The Rule

**All animations must be disabled or significantly reduced when `prefers-reduced-motion: reduce` is set.**

### Implementation

#### CSS Approach (Recommended)

```css
/* In your global styles */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

#### Tailwind Approach

Use Tailwind's `motion-safe:` and `motion-reduce:` variants:

```html
<!-- Animation only runs when motion is okay -->
<div class="motion-safe:animate-fade-in-up">
  Content appears with animation for those who want it.
</div>

<!-- Alternative for reduced motion -->
<div class="opacity-0 motion-safe:animate-fade-in motion-reduce:opacity-100">
  Instantly visible when reduced motion is preferred.
</div>
```

#### Svelte Component Pattern

```svelte
<script>
  import { browser } from '$app/environment';

  let prefersReducedMotion = false;

  if (browser) {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion = mediaQuery.matches;

    mediaQuery.addEventListener('change', (e) => {
      prefersReducedMotion = e.matches;
    });
  }
</script>

{#if prefersReducedMotion}
  <div>Content without animation</div>
{:else}
  <div class="animate-fade-in-up">Content with animation</div>
{/if}
```

### What to Disable

| Animation Type | Reduced Motion Behavior |
|----------------|------------------------|
| Decorative (leaf-fall, leaf-sway) | Completely disable |
| Entrance (fade-in, slide-in, grow) | Show instantly or use very subtle fade |
| Loading (spin, pulse) | Keep but simplify (static icon or very subtle) |
| Micro-interactions (hover scale) | Reduce or remove |

### Testing

Always test your work with reduced motion enabled:

- **macOS:** System Preferences > Accessibility > Display > Reduce motion
- **Windows:** Settings > Ease of Access > Display > Show animations
- **iOS:** Settings > Accessibility > Motion > Reduce Motion
- **Chrome DevTools:** Rendering panel > Emulate CSS media feature `prefers-reduced-motion`

---

## Custom Animations

Need an animation that isn't in the preset? Here's how to add it properly.

### Adding to the Preset

Edit `libs/engine/src/lib/ui/tailwind.preset.js`:

```javascript
// In the animation section
animation: {
  // ... existing animations
  'your-animation': 'grove-your-animation 0.4s ease-out',
},

// In the keyframes section
keyframes: {
  // ... existing keyframes
  'grove-your-animation': {
    '0%': { /* start state */ },
    '100%': { /* end state */ },
  },
},
```

### Naming Conventions

- Animation names: `kebab-case` (e.g., `fade-in-up`)
- Keyframe names: Prefix with `grove-` (e.g., `grove-fade-in-up`)
- Keep durations reasonable: 150ms-600ms for UI, up to 3s for decorative

### Guidelines for New Animations

1. **Start from existing patterns.** Most needs can be met by combining fade, slide, and scale.
2. **Keep it subtle.** If you notice the animation, it's probably too much.
3. **Test with reduced motion.** Ensure it degrades gracefully.
4. **Use GPU-friendly properties.** Stick to `transform` and `opacity`.
5. **Consider the emotional tone.** Does this animation feel like Grove?

---

## Quick Reference

### Common Patterns

```html
<!-- Page content loading -->
<main class="motion-safe:animate-fade-in">

<!-- Card in a grid -->
<article class="motion-safe:animate-fade-in-up" style="animation-delay: 100ms">

<!-- Modal dialog -->
<dialog class="motion-safe:animate-grow">

<!-- Toast notification -->
<div class="motion-safe:animate-slide-in-down">

<!-- Sidebar panel -->
<aside class="motion-safe:animate-slide-in-right">

<!-- Interactive button -->
<button class="transition-all duration-grove ease-grove hover:scale-105 active:scale-95">
```

### Animation + Transition Combo

For elements that both animate on entrance and respond to interaction:

```html
<button class="
  motion-safe:animate-fade-in-up
  transition-transform duration-grove ease-grove
  hover:scale-105 active:scale-95
">
  Get Started
</button>
```

---

## Source Reference

All animations are defined in:

```
libs/engine/src/lib/ui/tailwind.preset.js
```

The preset is automatically included when apps import the Grove Tailwind configuration. See `AGENT.md` for integration details.

---

*Remember: The best animation is one you barely notice — it just makes everything feel right.*
