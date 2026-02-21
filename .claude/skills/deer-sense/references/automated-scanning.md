# Automated Scanning — Deer Sense Reference

axe-core, Lighthouse automation, CI integration, and common issue checklists.

---

## axe-core CLI

```bash
# Install
npm install --save-dev @axe-core/cli

# Run on local dev server
npx axe https://localhost:5173 --tags wcag2aa

# Run with JSON output for CI
npx axe https://localhost:5173 --tags wcag2aa --output=json > a11y-results.json
```

---

## axe-core in Tests (Puppeteer)

```typescript
// vitest + @axe-core/puppeteer
import { test } from 'vitest';
import { AxePuppeteer } from '@axe-core/puppeteer';
import puppeteer from 'puppeteer';

test('page has no accessibility violations', async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');

  const results = await new AxePuppeteer(page).analyze();

  expect(results.violations).toEqual([]);
  await browser.close();
});
```

---

## Lighthouse CI

```bash
# In CI pipeline
npx lighthouse https://yoursite.com \
  --only-categories=accessibility \
  --output=json

# Look for scores and specific failures
```

Target score: 90+ for WCAG AA compliance. Scores below 80 indicate systemic issues.

---

## CI Integration

```yaml
# .github/workflows/a11y.yml
name: Accessibility Tests
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Build site
        run: npm run build
      - name: Start preview server
        run: npm run preview &
      - name: Wait for server
        run: sleep 3
      - name: Run axe-core
        run: npx axe http://localhost:4173 --exit --tags wcag2aa
```

---

## ESLint Plugin for Svelte

```bash
npm install --save-dev eslint-plugin-svelte-a11y
```

```js
// .eslintrc
{
  "plugins": ["svelte-a11y"],
  "extends": ["plugin:svelte-a11y/recommended"]
}
```

Catches common issues at development time: missing alt text, missing labels, click without keyboard support.

---

## Svelte's Built-In Accessibility Warnings

Svelte warns about common issues during compilation:

```svelte
<!-- Missing alt text — Svelte warns -->
<img src="photo.jpg">

<!-- Correct: descriptive alt -->
<img src="photo.jpg" alt="Sunset over the grove">

<!-- Decorative image — empty string explicitly -->
<img src="divider.svg" alt="">

<!-- No label — Svelte warns -->
<input type="text">

<!-- Correct: associated label -->
<label for="email">Email</label>
<input id="email" type="text">

<!-- Click without keyboard — Svelte warns -->
<div onclick={handleClick}>Click me</div>

<!-- Correct: use a button -->
<button onclick={handleClick}>Click me</button>
```

---

## Common Issues Checklist

```typescript
// Comprehensive a11y audit checklist
const checks = {
  // Images
  imagesHaveAlt: 'All <img> have descriptive alt text',
  decorativeMarked: 'Decorative images have alt=""',

  // Forms
  labelsPresent: 'All inputs have associated labels',
  errorsClear: 'Error messages explain how to fix',
  requiredMarked: 'Required fields are indicated',

  // Navigation
  focusVisible: 'Focus indicators are visible (2px minimum)',
  skipLinks: 'Skip navigation links present',
  headingOrder: 'Headings follow logical order (h1→h2→h3)',

  // Color
  contrastAA: 'Text contrast ratio >= 4.5:1',
  contrastLarge: 'Large text contrast >= 3:1',
  notColorOnly: 'Information not conveyed by color alone',

  // Structure
  landmarks: 'Page has main, nav, complementary landmarks',
  langAttribute: '<html lang="en"> set correctly',
  titlePresent: 'Each page has unique <title>'
};
```

---

## WCAG Levels for Grove

- **A** — Essential (must have — failing A is a blocker)
- **AA** — Ideal (Grove standard — target for all features)
- **AAA** — Enhanced (implement when possible)

**Grove Standard: WCAG 2.1 AA**

Automated tools catch approximately 30% of real accessibility issues. Always pair with manual testing.

---

## Disability Types and What They Need

| Disability Type | Assistive Technology | What They Need |
|----------------|---------------------|----------------|
| **Visual** | Screen readers, magnification | Alt text, semantic HTML, focus indicators |
| **Motor** | Keyboard, switch controls | Keyboard navigation, large touch targets |
| **Cognitive** | Simplified interfaces | Clear language, consistent patterns |
| **Auditory** | Captions, visual indicators | Transcripts, visual alerts |

---

## Accessibility Documentation Template

```markdown
## Accessibility Standards

This project maintains WCAG 2.1 AA compliance:

### Requirements
- All images have alt text
- Color contrast minimum 4.5:1
- Keyboard navigable
- Screen reader tested
- Reduced motion respected

### Testing
- Automated: axe-core in CI (every PR)
- Manual: Keyboard + screen reader (each major feature)
- Checklist: `references/keyboard-testing.md` and `references/screen-reader-testing.md`

### Tools
- axe DevTools browser extension
- WAVE evaluation tool
- Lighthouse accessibility audit
```
