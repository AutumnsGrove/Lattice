# Grove Accessibility Patterns — Deer Sense Reference

Grove-specific accessibility requirements: 44px touch targets, reduced motion, GroveTerm/GroveSwap/GroveText accessibility, and glass card focus indicators.

---

## Touch Target Requirements

Grove standard: **44x44px minimum** for all interactive elements (WCAG 2.5.5 AAA, Grove target AA+).

```svelte
<style>
  /* Minimum touch target for icon buttons */
  .touch-target {
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    /* Visual size can be smaller; padding provides touch area */
  }
</style>

<button class="touch-target" aria-label="Close">
  <XIcon size={16} />
</button>
```

When the visual element is smaller than 44px, use padding to meet the requirement without changing the visual design. The touch area must be 44px even if the rendered icon is 20px.

---

## Reduced Motion

All Grove animations must respect `prefers-reduced-motion`. No exceptions.

```svelte
<!-- src/lib/stores/accessibility.ts -->
export const reducedMotion = readable(
  window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  (set) => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => set(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }
);
```

```svelte
<!-- Seasonal decorations: show static version for reduced motion -->
<script>
  import { reducedMotion } from '$lib/stores/accessibility';
</script>

{#if !$reducedMotion}
  <FallingLeavesLayer />
{:else}
  <StaticLeaves />
{/if}
```

For CSS animations:

```css
@media (prefers-reduced-motion: reduce) {
  .animated-element {
    animation: none;
    transition: none;
  }
}
```

---

## Glass Card Focus Indicators

Glass surfaces (glassmorphism) can hide or obscure browser default focus rings. Always provide explicit focus styles:

```css
/* Grove glass card focus pattern */
.glass-card:focus-within {
  outline: 2px solid var(--color-greens-grove);
  outline-offset: 2px;
}

/* Interactive glass elements */
.glass-button:focus-visible {
  outline: 2px solid var(--color-greens-grove);
  outline-offset: 2px;
  border-radius: var(--radius-grove);
}

/* Never suppress focus entirely */
/* BAD: */
button:focus { outline: none; }
/* GOOD: replace with custom style */
button:focus-visible {
  outline: 2px solid var(--color-greens-grove);
  outline-offset: 2px;
}
```

---

## GroveTerm Accessibility

GroveTerm elements display Grove vocabulary (e.g., "Blooms" instead of "Posts") with interactive tooltips.

**Required attributes:**

```svelte
<!-- GroveTerm component requirements -->
<span
  role="button"
  tabindex="0"
  aria-label="Grove term: {term}, {category} category"
  class="grove-term"
  onkeydown={handleKeydown}
  onclick={togglePopup}
>
  {displayText}
</span>
```

**Testing GroveTerm:**

```
1. Tab to a GroveTerm element
   [ ] Focus ring visible (2px outline)?
   [ ] aria-label reads "Grove term: [term], [category] category"?
   [ ] role="button" and tabindex="0" present?

2. Activate with Enter or Space
   [ ] Popup opens with definition?
   [ ] Focus moves to popup content?
   [ ] ESC closes popup and returns focus to GroveTerm?

3. Toggle Grove Mode OFF
   [ ] Standard terms display (e.g., "Posts" not "Blooms")?
   [ ] Screen reader announces "Grove's name for [standard term]" in popup?
   [ ] GroveSwap updates silently without focus disruption?

4. Check prefers-reduced-motion
   [ ] No animations on GroveTerm hover/open?
   [ ] Popup appears instantly without transition?
```

---

## GroveText with [[term]] Syntax

GroveText parses `[[term]]` syntax and renders inline GroveTerm components.

```
Testing GroveText accessibility:

1. Verify parsed terms are keyboard-navigable
   [ ] Each rendered GroveTerm has tabindex="0"?
   [ ] Tab order flows naturally through text content?
   [ ] Each term has correct aria-label?

2. Verify GroveText doesn't break reading flow
   [ ] Screen reader reads surrounding text naturally?
   [ ] GroveTerm elements don't interrupt sentence structure?
```

---

## Common Barrier Types in Grove

### Visual Barriers

```
- Poor color contrast on glass surfaces (test with actual glassmorphism overlays)
- Missing alt text on decorative nature images (use alt="" for pure decoration)
- No focus indicators on glass cards
- Seasonal animations that can't be disabled
```

### Motor Barriers

```
- Touch targets under 44px (especially close buttons on glass cards)
- Hover-only interactions (falling leaves toggle, season picker)
- No keyboard support for interactive nature elements (forest randomize button)
- Required drag-and-drop without keyboard alternative
```

### Cognitive Barriers

```
- Confusing navigation due to seasonal theme changes
- Grove vocabulary without explanation for new users
- Missing error explanations in form validation
- Inconsistent GroveTerm behavior across the app
```

---

## Accessibility in New Components

When building any new Grove component:

1. Start with semantic HTML elements (`button`, `article`, `nav`, etc.)
2. Add `aria-*` attributes for state (`aria-expanded`, `aria-pressed`, `aria-current`)
3. Verify keyboard: Tab to focus, Enter/Space to activate, Escape to dismiss
4. Test with VoiceOver: does the announcement make sense out of context?
5. Check 44px touch targets for all interactive elements
6. Verify reduced motion: all animations conditional on `$reducedMotion`
7. Verify glass surface focus ring: custom `focus-visible` style applied

These are non-negotiable for any component that ships in Grove.
