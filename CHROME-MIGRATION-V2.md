# Chrome Migration Plan v2 — Corrected Implementation

> **Status**: Ready for implementation
> **Previous Attempt**: Rolled back due to build order violation and import failures
> **This Document**: Corrects all issues found in code review

---

## Executive Summary

This is a corrected migration plan based on thorough code review of the existing engine chrome components. The original implementation failed because:

1. Consumer apps were modified to import from the engine **before** the package was built
2. Critical bugs exist in the current engine chrome components that would cause runtime failures

**This plan addresses both issues** with a phased approach that:
- Fixes all bugs in engine components FIRST
- Builds and verifies the package BEFORE any consumer app changes
- Migrates incrementally with rollback capability at each step

---

## Part 1: Critical Bugs Found in Current Engine Components

### Bug 1: ThemeToggle Import Path (CRITICAL)

**File**: `packages/engine/src/lib/ui/components/chrome/ThemeToggle.svelte`

**Current (BROKEN)**:
```typescript
import { theme } from '$lib/stores/theme';
```

**Problem**:
- `$lib/stores/theme` maps to `src/lib/stores/theme.ts` which **does not exist**
- Stores are located at `src/lib/ui/stores/theme.ts`
- The build creates a wrong relative path: `../../../stores/theme` instead of `../../stores/theme`

**Fix Required**:
```typescript
import { themeStore } from '$lib/ui/stores/theme';
```

### Bug 2: ThemeToggle Wrong Export Name (CRITICAL)

**File**: `packages/engine/src/lib/ui/components/chrome/ThemeToggle.svelte`

**Current (BROKEN)**:
```typescript
import { theme } from '$lib/stores/theme';
let isDark = $derived($theme === 'dark');
// Uses: theme.toggle()
```

**Problem**:
- Engine exports `themeStore`, not `theme`
- Engine's `themeStore` has different API: uses `themeStore.resolvedTheme` not direct subscribe

**Fix Required**:
```typescript
import { themeStore } from '$lib/ui/stores/theme';
let isDark = $derived($themeStore.resolvedTheme === 'dark');
// Uses: themeStore.toggle()
```

**OR** (Preferred - maintain landing compatibility):

Create a wrapper that provides the same API as landing's `theme` store:
```typescript
// In stores/index.ts
export { themeStore, themeStore as theme } from './theme';
```

### Bug 3: stores/index.ts Missing themeStore Export

**File**: `packages/engine/src/lib/ui/stores/index.ts`

**Current**:
```typescript
export { seasonStore } from "./season";
// themeStore NOT exported!
```

**Fix Required**:
```typescript
export { seasonStore } from "./season";
export { themeStore } from "./theme";
```

### Bug 4: types.ts Missing Component Type Import

**File**: `packages/engine/src/lib/ui/components/chrome/types.ts`

**Current**:
```typescript
export interface NavItem {
  href: string;
  label: string;
  icon?: Component;  // Component is not imported!
  // ...
}
```

**Fix Required**:
```typescript
import type { Component } from 'svelte';

export interface NavItem {
  href: string;
  label: string;
  icon?: Component;
  // ...
}
```

---

## Part 2: Code Comparison — Engine vs Landing

### Header.svelte

| Aspect | Engine | Landing | Match? |
|--------|--------|---------|--------|
| Glassmorphism | `bg-surface/95 backdrop-blur-sm` | `bg-surface/95 backdrop-blur-sm` | ✅ |
| Nav items | Configurable via props + defaults | Hardcoded in component | ✅ Better |
| Season store | Uses `seasonStore` | Uses `season` | ⚠️ Different name |
| Theme toggle | Uses `ThemeToggle` | Uses `ThemeToggle` | ✅ |
| Mobile menu | Passes `navItems` prop | No props | ✅ Better |

**Verdict**: Engine Header is a proper generalization. Works correctly.

### Footer.svelte

| Aspect | Engine | Landing | Match? |
|--------|--------|---------|--------|
| Structure | 3-column, configurable | 3-column, hardcoded | ✅ Better |
| Links | Via props + defaults | Hardcoded | ✅ Better |
| Season | Uses `seasonStore` | Uses `season` | ⚠️ Different name |
| Theme toggle | Includes `ThemeToggle` | Includes `ThemeToggle` | ✅ |

**Verdict**: Engine Footer is a proper generalization. Works correctly.

### MobileMenu.svelte

| Aspect | Engine | Landing | Match? |
|--------|--------|---------|--------|
| Items | Configurable via props | Hardcoded | ✅ Better |
| Backdrop | `bg-black/50 backdrop-blur-sm` | `bg-black/50 backdrop-blur-sm` | ✅ |
| Panel | `bg-surface` | `bg-surface` | ✅ |
| Focus trap | Yes | Yes | ✅ |

**Verdict**: Engine MobileMenu is properly generalized. Works correctly.

### ThemeToggle.svelte

| Aspect | Engine | Landing | Match? |
|--------|--------|---------|--------|
| Import | `$lib/stores/theme` | `$lib/stores/theme` | ❌ BROKEN |
| Export name | Expects `theme` | Has `theme` | ❌ Wrong (engine has `themeStore`) |
| API | `$theme === 'dark'` | `$theme === 'dark'` | ❌ Wrong (engine uses resolvedTheme) |
| Styling | Identical | Identical | ✅ |

**Verdict**: ThemeToggle has critical bugs that must be fixed.

### Season Store

| Aspect | Engine | Landing |
|--------|--------|---------|
| Export name | `seasonStore` | `season` |
| API | `seasonStore.cycle()` | `season.cycle()` |
| Storage key | `grove-season` | `grove-season` |
| Default | `autumn` | `autumn` |

**Verdict**: Functionally identical, just different export names.

### Theme Store

| Aspect | Engine | Landing |
|--------|--------|---------|
| Export name | `themeStore` | `theme` |
| Type support | `'light' | 'dark' | 'system'` | `'light' | 'dark'` |
| Default | `'system'` | `'dark'` |
| API | `themeStore.toggle()`, `themeStore.resolvedTheme` | `theme.toggle()`, `$theme` |

**Verdict**: Engine has more features (system preference support) but different API.

---

## Part 3: Implementation Plan

### Phase 0: Fix Engine Bugs (MUST DO FIRST)

**DO NOT proceed to Phase 1 until all bugs are fixed and verified.**

#### Step 0.1: Fix ThemeToggle.svelte

**File**: `packages/engine/src/lib/ui/components/chrome/ThemeToggle.svelte`

```svelte
<script lang="ts">
	import { themeStore } from '$lib/ui/stores/theme';

	let isDark = $derived($themeStore.resolvedTheme === 'dark');
</script>

<button
	onclick={() => themeStore.toggle()}
	class="p-2 rounded-lg text-foreground-subtle hover:text-accent-muted hover:bg-surface transition-colors"
	aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
	title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
>
	{#if isDark}
		<!-- Sun icon -->
		<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="12" cy="12" r="5" />
			<line x1="12" y1="1" x2="12" y2="3" />
			<line x1="12" y1="21" x2="12" y2="23" />
			<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
			<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
			<line x1="1" y1="12" x2="3" y2="12" />
			<line x1="21" y1="12" x2="23" y2="12" />
			<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
			<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
		</svg>
	{:else}
		<!-- Moon icon -->
		<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
		</svg>
	{/if}
</button>
```

#### Step 0.2: Fix stores/index.ts

**File**: `packages/engine/src/lib/ui/stores/index.ts`

```typescript
/**
 * UI Stores Index
 * Re-exports all shared UI stores from the engine package
 */

export { seasonStore } from "./season";
export { themeStore } from "./theme";
```

#### Step 0.3: Fix types.ts

**File**: `packages/engine/src/lib/ui/components/chrome/types.ts`

```typescript
import type { Component } from 'svelte';

export interface NavItem {
  href: string;
  label: string;
  icon?: Component;
  external?: boolean;
}

export interface FooterLink {
  href: string;
  label: string;
  icon?: Component;
  external?: boolean;
}

export type MaxWidth = "narrow" | "default" | "wide";
```

#### Step 0.4: Verify Build

```bash
cd packages/engine
pnpm run package
```

**Expected output**: Build completes with no errors.

#### Step 0.5: Verify Import Paths

After build, run this verification:

```bash
node -e "
const fs = require('fs');
const path = require('path');

const checks = [
  ['dist/ui/components/chrome/ThemeToggle.svelte', '../../stores/theme'],
  ['dist/ui/components/chrome/Header.svelte', '../../stores/season'],
  ['dist/ui/components/chrome/Footer.svelte', '../../stores/season'],
];

let allPassed = true;
for (const [file, expectedImport] of checks) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes(expectedImport)) {
    console.log('✅', file, 'has correct import');
  } else {
    console.log('❌', file, 'MISSING expected import:', expectedImport);
    allPassed = false;
  }
}

if (allPassed) {
  console.log('\\n✅ All import paths verified!');
} else {
  console.log('\\n❌ FAILED: Some imports are wrong. Do not proceed.');
  process.exit(1);
}
"
```

---

### Phase 1: Build and Verify Engine Package

**Only proceed after Phase 0 is complete.**

#### Step 1.1: Clean Build

```bash
cd packages/engine
rm -rf dist
pnpm run package
```

#### Step 1.2: Verify dist Structure

```bash
# All these files must exist:
ls dist/ui/components/chrome/Header.svelte
ls dist/ui/components/chrome/Footer.svelte
ls dist/ui/components/chrome/ThemeToggle.svelte
ls dist/ui/components/chrome/MobileMenu.svelte
ls dist/ui/components/chrome/index.js
ls dist/ui/stores/season.js
ls dist/ui/stores/theme.js
ls dist/ui/stores/index.js
```

#### Step 1.3: Test Package Locally

```bash
# From landing directory
cd ../landing
pnpm link ../packages/engine

# Start dev server
pnpm dev

# Should start without errors. Chrome imports aren't used yet,
# but this verifies the package structure is valid.
```

---

### Phase 2: Migrate Landing App

**Only proceed after Phase 1 is complete.**

#### Step 2.1: Update +layout.svelte (DO NOT CHANGE YET)

The layout doesn't render Header/Footer directly — pages do. So no changes needed here.

#### Step 2.2: Migrate +page.svelte (Homepage)

**IMPORTANT**: Make ONE change, test, then continue.

**Before**:
```svelte
<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import { season } from '$lib/stores/season';
	// ...
</script>

<Header />
<!-- content -->
<Footer />
```

**After**:
```svelte
<script lang="ts">
	import { Header, Footer, seasonStore } from '@autumnsgrove/groveengine/ui/chrome';
	import { Logo } from '@autumnsgrove/groveengine/ui/nature';
	// ...
</script>

<Header season={$seasonStore} onSeasonChange={() => seasonStore.cycle()} />
<!-- content -->
<Footer season={$seasonStore} />
```

**Test**: `pnpm dev` — verify homepage renders correctly.

**Rollback if needed**:
```bash
git checkout HEAD -- landing/src/routes/+page.svelte
```

#### Step 2.3: Migrate Other Pages

Repeat Step 2.2 for each page that uses Header/Footer:
- [ ] `/manifesto/+page.svelte`
- [ ] `/vision/+page.svelte`
- [ ] `/roadmap/+page.svelte`
- [ ] `/pricing/+page.svelte`
- [ ] `/knowledge/+page.svelte`
- [ ] `/forest/+page.svelte`
- [ ] `/contact/+page.svelte`
- [ ] etc.

**Rule**: Test after EACH page. If any page breaks, rollback that single file.

---

### Phase 3: Cleanup (Only After All Pages Work)

#### Step 3.1: Remove Local Components

**Only after ALL pages are migrated and tested:**

```bash
rm landing/src/lib/components/Header.svelte
rm landing/src/lib/components/Footer.svelte
rm landing/src/lib/components/MobileMenu.svelte
rm landing/src/lib/components/ThemeToggle.svelte
```

**Keep**: `Logo.svelte` if it has landing-specific customizations, otherwise remove.

#### Step 3.2: Optionally Remove Local Stores

If landing's `season` store is identical to engine's `seasonStore`, you can remove:
```bash
rm landing/src/lib/stores/season.ts
```

And update imports across the app to use `seasonStore` from engine.

---

### Phase 4: Migrate Other Apps

Repeat Phase 2-3 for:
- [ ] Meadow
- [ ] Clearing (uses HeaderMinimal/FooterMinimal)

---

## Part 4: Testing Checklist

For each migrated page:

- [ ] Page renders without console errors
- [ ] Header displays correctly
- [ ] Navigation links work
- [ ] Mobile menu opens/closes
- [ ] Theme toggle works (light/dark)
- [ ] Season toggle works (logo click cycles seasons)
- [ ] Footer displays correctly
- [ ] All footer links work
- [ ] Responsive design maintained
- [ ] Glassmorphism effects visible

---

## Part 5: Rollback Procedures

### If Homepage Breaks

```bash
git checkout HEAD -- landing/src/routes/+page.svelte
pnpm dev
```

### If Any Page Breaks

```bash
git checkout HEAD -- landing/src/routes/[page]/+page.svelte
pnpm dev
```

### If Engine Build Breaks

```bash
cd packages/engine
git checkout HEAD -- src/lib/ui/components/chrome/
git checkout HEAD -- src/lib/ui/stores/
pnpm run package
```

### Full Rollback

```bash
git stash
# or
git checkout main
```

---

## Part 6: Success Criteria

The migration is complete when:

1. **Engine package builds** without errors
2. **All import paths resolve** correctly in dist
3. **Landing homepage** uses engine chrome components
4. **All landing pages** use engine chrome components
5. **Local chrome components** are deleted from landing
6. **No console errors** on any page
7. **All functionality preserved** (nav, theme, season, mobile menu)

---

## Appendix: File Reference

### Engine Files to Modify (Phase 0)

| File | Change |
|------|--------|
| `packages/engine/src/lib/ui/components/chrome/ThemeToggle.svelte` | Fix import path and export name |
| `packages/engine/src/lib/ui/stores/index.ts` | Add themeStore export |
| `packages/engine/src/lib/ui/components/chrome/types.ts` | Add Component type import |

### Landing Files to Modify (Phase 2)

| File | Change |
|------|--------|
| `landing/src/routes/+page.svelte` | Update imports |
| `landing/src/routes/*/+page.svelte` | Update imports (all pages with Header/Footer) |

### Files to Delete (Phase 3)

| File | When |
|------|------|
| `landing/src/lib/components/Header.svelte` | After all pages migrated |
| `landing/src/lib/components/Footer.svelte` | After all pages migrated |
| `landing/src/lib/components/MobileMenu.svelte` | After all pages migrated |
| `landing/src/lib/components/ThemeToggle.svelte` | After all pages migrated |

---

*Document created: 2026-01-05*
*Based on: CHROME-EXTRACTION-PLAN.md, CHROME-ROLLBACK-ANALYSIS.md, and code review*
*Ready for implementation in a new session*
