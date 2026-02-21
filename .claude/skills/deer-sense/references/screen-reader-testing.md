# Screen Reader Testing — Deer Sense Reference

NVDA/VoiceOver testing procedures, ARIA patterns, live regions, and semantic HTML fixes.

---

## Screen Reader Tools

```
NVDA (Windows)    — Free, most common for testing
JAWS (Windows)    — Industry standard, subscription
VoiceOver (macOS) — Built-in (Cmd+F5 to toggle)
VoiceOver (iOS)   — Built-in (triple-click home/side)
TalkBack (Android) — Built-in accessibility service
Narrator (Windows) — Built-in, for basic checks
```

For development: VoiceOver (macOS) is available without installation and covers the majority of real-world patterns. Pair with Chrome or Firefox for best results.

---

## Screen Reader Checklist

Work through with VoiceOver (Cmd+F5) or NVDA:

```
Page load
  [ ] Page title announced on load
  [ ] Main landmark exists and is reachable
  [ ] Language attribute set (<html lang="en">)

Headings navigation (H key in NVDA, Ctrl+Cmd+H in VoiceOver)
  [ ] Headings follow logical order (h1 → h2 → h3)
  [ ] No skipped heading levels
  [ ] Each heading describes its section

Landmarks (D key in NVDA)
  [ ] main, nav, complementary (aside), footer all present
  [ ] Multiple navs have aria-label to distinguish them

Images
  [ ] All informative images have descriptive alt text
  [ ] Decorative images have alt="" (not read aloud)
  [ ] SVG icons that convey meaning have aria-label

Buttons and links
  [ ] Buttons say what they do (not "click here" or "button")
  [ ] Links say where they go (not "read more")
  [ ] Icon-only buttons have aria-label

Forms
  [ ] Every input has an associated label (for/id pair or aria-labelledby)
  [ ] Error messages are announced (role="alert" or aria-live)
  [ ] Required fields are marked (aria-required="true")
  [ ] Validation errors associated with fields (aria-describedby)

Dynamic content
  [ ] Status updates announced (aria-live="polite")
  [ ] Urgent updates announced (aria-live="assertive")
  [ ] Loading states communicated (aria-busy)
```

---

## ARIA Patterns

### Labels for Icon-Only Buttons

```svelte
<!-- Icon-only buttons MUST have aria-label -->
<button aria-label="Close dialog">
  <XIcon />
</button>

<button aria-label="Add to favorites">
  <HeartIcon />
</button>

<!-- Or use visually hidden text -->
<button>
  <HeartIcon aria-hidden="true" />
  <span class="sr-only">Add to favorites</span>
</button>
```

### State and Properties

```svelte
<!-- Toggle state -->
<button aria-pressed={isExpanded}>
  Expand section
</button>

<!-- Expanded/collapsed state -->
<button
  aria-expanded={isOpen}
  aria-controls="menu-list"
>
  Open menu
</button>
<ul id="menu-list" hidden={!isOpen}>
  <!-- items -->
</ul>
```

### Live Regions

```svelte
<!-- Polite: announced when user is idle -->
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

<!-- Assertive: interrupts immediately (use sparingly) -->
<div aria-live="assertive" role="alert">
  {errorMessage}
</div>
```

---

## Semantic HTML Fixes

### Replace Div Soup

```svelte
<!-- BAD: div soup with no meaning -->
<div class="card" onclick={handleClick}>
  <div class="title">Heading</div>
  <div class="text">Content</div>
</div>

<!-- GOOD: proper semantics -->
<article class="card">
  <h2>Heading</h2>
  <p>Content</p>
  <button onclick={handleClick}>Action</button>
</article>
```

### Form Accessibility

```svelte
<form onsubmit={handleSubmit}>
  <div>
    <label for="email">Email Address *</label>
    <input
      id="email"
      type="email"
      required
      aria-required="true"
      aria-invalid={emailError ? 'true' : 'false'}
      aria-describedby={emailError ? 'email-error' : undefined}
      bind:value={email}
    />
    {#if emailError}
      <span id="email-error" role="alert" class="error">
        {emailError}
      </span>
    {/if}
  </div>

  <button type="submit">Submit</button>
</form>
```

### Color Contrast

```svelte
<!-- Light gray on white — fails WCAG AA -->
<p class="text-gray-400">Subtle text</p>

<!-- Darker gray — passes WCAG AA (4.5:1+) -->
<p class="text-gray-600">Readable text</p>

<!-- Grove palette is pre-tested for contrast -->
<p class="text-greens-grove">Brand text</p>
```

Minimum ratios: **4.5:1** for normal text, **3:1** for large text (18px+ regular or 14px+ bold).

---

## Common Screen Reader Test Scenarios

### Form with Conditional Fields

```
1. Tab to email field
   ✓ Focus indicator visible?
   ✓ Label "Email Address" announced?

2. Enter invalid email, Tab away
   ✓ Error message announced live?
   ✓ Error associated with field (aria-describedby)?

3. Check "Business account" checkbox
   ✓ New company name field appears
   ✓ Screen reader announces new content?
   ✓ Focus moves to new field or stays logical?

4. Tab through to submit
   ✓ Skip link available?
   ✓ Submit button clearly labeled?
```

### Data Table with Sorting

```
1. Navigate to table
   ✓ Table has caption or aria-label?
   ✓ Column headers use <th scope="col">?

2. Tab to "Sort by date" header button
   ✓ aria-sort reflects current direction?

3. Activate sort
   ✓ Table updates without losing focus?
   ✓ Sort change announced via aria-live?
   ✓ aria-sort updates?
```

---

## Final Audit Report Template

```markdown
## DEER SENSE AUDIT COMPLETE

### Pages Tested
- Home page
- Dashboard
- Settings
- Content editor

### Automated Results
- axe-core violations: [before] → [after]
- Lighthouse score: [before] → [after]

### Manual Testing
- [ ] Keyboard navigation: All paths work
- [ ] Screen reader (VoiceOver): Content readable
- [ ] 200% zoom: Layout intact
- [ ] Reduced motion: Animations disabled

### Issues Fixed
1. [Issue]: [fix applied]
2. [Issue]: [fix applied]

### Ongoing Protection
- axe-core in CI pipeline
- ESLint svelte-a11y plugin enabled
- Accessibility checklist in docs
```
