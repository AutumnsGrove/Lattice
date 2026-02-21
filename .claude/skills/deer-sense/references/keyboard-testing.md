# Keyboard Testing — Deer Sense Reference

Manual keyboard navigation, focus management, trap patterns, and zoom testing.

---

## Keyboard Navigation Checklist

Work through this checklist on every page and component:

```
Tab through entire page
  [ ] Tab order makes sense (top-to-bottom, left-to-right generally)
  [ ] Can you activate every button with Enter or Space?
  [ ] Can you activate every link with Enter?
  [ ] Is there a visible focus indicator on every focused element?
  [ ] No keyboard traps (can you always Tab away from something)?
  [ ] Skip link visible when focused, jumps past navigation?
  [ ] Arrow keys work inside components (menus, sliders, radio groups)?
  [ ] Escape key closes modals and dropdowns?
```

---

## Zoom Testing

```
Test at these browser zoom levels:
  [ ] 100% (baseline)
  [ ] 150% (mild vision support)
  [ ] 200% (moderate vision support — WCAG AA requirement)
  [ ] 400% (severe vision support)

Verify at 200%+:
  [ ] No horizontal scrolling required
  [ ] All content still visible
  [ ] No overlapping elements
  [ ] Text reflows, doesn't clip
  [ ] Touch targets remain reachable
```

Use browser zoom (Ctrl+/Cmd+ on desktop) — this tests text reflow and layout, not just magnification.

---

## Focus Management Patterns

### Modal Focus Trap

```svelte
<script>
  let modalOpen = $state(false);
  let modalRef: HTMLDivElement;
  let previousFocus: Element;

  function openModal() {
    previousFocus = document.activeElement as Element;
    modalOpen = true;
    // Focus first element when modal opens
    tick().then(() => {
      modalRef?.querySelector<HTMLElement>('input, button, [href]')?.focus();
    });
  }

  function closeModal() {
    modalOpen = false;
    // Return focus to trigger button
    (previousFocus as HTMLElement)?.focus();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') closeModal();
    if (event.key === 'Tab') trapFocus(event, modalRef);
  }
</script>

{#if modalOpen}
  <div
    bind:this={modalRef}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    onkeydown={handleKeydown}
  >
    <h2 id="modal-title">Modal Title</h2>
    <!-- Content -->
    <button onclick={closeModal}>Close</button>
  </div>
{/if}
```

### Focus Trap Utility

```typescript
// src/lib/utils/focus-trap.ts
export function trapFocus(event: KeyboardEvent, container: HTMLElement) {
  const focusable = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey) {
    // Shift+Tab: wrap from first to last
    if (document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  } else {
    // Tab: wrap from last to first
    if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
```

---

## Modal Testing Checklist

```
Setup: Any modal dialog

1. Trigger modal from button
   [ ] Focus moves INTO modal?
   [ ] First focusable element receives focus?
   [ ] Modal has role="dialog" and aria-modal="true"?
   [ ] Modal has accessible name (aria-labelledby)?

2. Tab through modal
   [ ] Focus trapped inside modal?
   [ ] Tab wraps from last to first element?
   [ ] Shift+Tab works backwards?

3. Press Escape
   [ ] Modal closes?
   [ ] Focus returns to trigger button?

4. Click overlay/backdrop
   [ ] Modal closes (if intended)?
   [ ] Or stays open (if critical data entry)?
```

---

## Form with Conditional Fields Testing

```
Setup: Multi-step or conditional form

1. Tab to first field
   [ ] Focus indicator visible?
   [ ] Label announced (check with screen reader)?

2. Enter invalid data, Tab away
   [ ] Error message appears?
   [ ] Error associated with field (aria-describedby)?
   [ ] Error announced live (role="alert" or aria-live)?

3. Show/hide conditional field
   [ ] Focus stays logical?
   [ ] New content announced if focus-worthy?
   [ ] Tab order includes new field?

4. Submit form
   [ ] Submit with Enter from text field?
   [ ] Submit with Space or Enter on button?
   [ ] Success/error state keyboard accessible?
```

---

## Sortable Table Testing

```
Setup: Data table with sortable columns

1. Navigate to table
   [ ] Table has caption or aria-label?
   [ ] Column headers use <th scope="col">?
   [ ] Row headers use <th scope="row">?

2. Tab to sort button in column header
   [ ] Sort control is focusable?
   [ ] Current sort direction reflected in aria-sort?

3. Activate sort with Enter
   [ ] Table updates without losing focus?
   [ ] Sort change announced (aria-live)?
   [ ] aria-sort updates to new direction?

4. Navigate table with arrow keys (screen reader browse mode)
   [ ] Can move cell-by-cell?
   [ ] Row/column context announced?
```

---

## Common Keyboard Trap Scenarios

Keyboard traps most often appear in:
- Custom dropdown menus without Escape key support
- Date pickers that capture arrow keys without offering exit
- Inline editors that intercept Tab
- Third-party widgets (maps, embeds, carousels)

**Fix pattern:** Every component that captures keyboard input must provide a documented exit key (usually Escape) and restore focus to the appropriate parent element.

---

## Touch Target Requirements

Grove standard: **44x44px minimum** for all interactive elements.

```svelte
<!-- Ensure touch targets meet minimum size -->
<button class="touch-target">
  <XIcon size={16} />
</button>

<style>
  .touch-target {
    /* Minimum 44x44px touch target */
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
```

For icon-only buttons where the visual size is small, use padding to achieve the minimum touch area while keeping the icon visually compact.
