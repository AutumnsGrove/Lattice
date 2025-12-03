# GroveUI Migration Prompt

**For use in the GroveUI repository at: `/Users/mini/Documents/Projects/GroveUI`**

---

## Context

I'm separating the GroveEngine and GroveUI packages to eliminate overlap and fix circular dependencies. This prompt handles ALL the GroveUI-side changes.

## Current State

**GroveUI** (this repo):
- Version: 0.2.0
- Published as: `@groveengine/ui` on npm
- Contains 40+ UI components including a gutter system
- Has circular dependency: `IconLegend` imports `CollapsibleSection` from GroveEngine

**GroveEngine** (separate repo):
- Version: 0.1.0
- Published as: `@autumnsgrove/groveengine` on npm
- Contains 58 duplicate UI components we're removing
- Will become version 0.3.0 after migration

## Your Mission

Execute ALL of the following changes to GroveUI:

---

## Task 1: Remove Gutter System (Domain-Specific → GroveEngine)

The gutter annotation system is Grove-specific and belongs in GroveEngine, not in the UI library.

**DELETE** the entire gutter directory:
```
/src/lib/components/gutter/ContentWithGutter.svelte
/src/lib/components/gutter/LeftGutter.svelte
/src/lib/components/gutter/GutterItem.svelte
/src/lib/components/gutter/TableOfContents.svelte
/src/lib/components/gutter/MobileTOC.svelte
/src/lib/components/gutter/CollapsibleSection.svelte
```

**UPDATE** `/src/lib/components/index.ts`:
- Remove all gutter exports
- Remove `GUTTER_VERSION` constant

**UPDATE** `/package.json`:
- Remove `./gutter` export path

---

## Task 2: Add Generic CollapsibleSection Component

Create a NEW generic collapsible component (not domain-specific) that IconLegend can use.

**CREATE** `/src/lib/components/ui/CollapsibleSection.svelte`:

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    defaultOpen?: boolean;
    children?: Snippet;
    class?: string;
  }

  let {
    title,
    defaultOpen = false,
    children,
    class: className = '',
    ...restProps
  }: Props = $props();

  let isOpen = $state(defaultOpen);

  function toggle() {
    isOpen = !isOpen;
  }
</script>

<div class="collapsible-section {className}" {...restProps}>
  <button
    type="button"
    class="collapsible-trigger w-full flex items-center justify-between px-4 py-3 text-left font-medium border-b hover:bg-muted/50 transition-colors"
    onclick={toggle}
    aria-expanded={isOpen}
  >
    <span>{title}</span>
    <svg
      class="w-5 h-5 transition-transform {isOpen ? 'rotate-180' : ''}"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {#if isOpen}
    <div class="collapsible-content px-4 py-4">
      {@render children?.()}
    </div>
  {/if}
</div>

<style>
  .collapsible-section {
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    overflow: hidden;
  }

  .collapsible-trigger {
    background: hsl(var(--background));
  }

  .collapsible-content {
    background: hsl(var(--card));
  }
</style>
```

**ADD** export to `/src/lib/components/ui/index.ts`:
```typescript
export { default as CollapsibleSection } from './CollapsibleSection.svelte';
```

---

## Task 3: Fix IconLegend Import

Now that we have a generic CollapsibleSection in GroveUI, update IconLegend to use it.

**UPDATE** `/src/lib/components/icons/IconLegend.svelte`:

**FIND**:
```typescript
import { CollapsibleSection } from '@autumnsgrove/groveengine';
```

**REPLACE WITH**:
```typescript
import CollapsibleSection from '$lib/components/ui/CollapsibleSection.svelte';
```

This removes the circular dependency!

---

## Task 4: Add Generic UI Wrappers from GroveEngine

Copy these 7 generic UI wrapper components from GroveEngine. These are currently duplicated in both repos and belong in GroveUI.

### Files to COPY from GroveEngine:

You'll need to reference the GroveEngine repo at `/Users/mini/Documents/Projects/GroveEngine/packages/engine/src/lib/components/ui/`

**Copy these components** (wrapper + subdirectory):

1. **Button**:
   - `/button/button.svelte`
   - `Button.svelte`

2. **Card**:
   - `/card/card.svelte`
   - `/card/card-content.svelte`
   - `/card/card-description.svelte`
   - `/card/card-footer.svelte`
   - `/card/card-header.svelte`
   - `/card/card-title.svelte`
   - `Card.svelte`

3. **Badge**:
   - `/badge/badge.svelte`
   - `Badge.svelte`

4. **Input**:
   - `/input/input.svelte`
   - `Input.svelte`

5. **Textarea**:
   - `/textarea/textarea.svelte`
   - `Textarea.svelte`

6. **Separator**:
   - `/separator/separator.svelte`
   - (No wrapper - just primitive)

7. **Skeleton**:
   - `/skeleton/skeleton.svelte`
   - `Skeleton.svelte`

**COPY TO**: `/src/lib/components/ui/` (maintaining subdirectory structure)

### Update Imports

After copying, you'll need to update any internal imports in these files:
- Change `$lib/` to `$lib/` (should be fine)
- Verify bits-ui imports work
- Verify cn utility imports work

---

## Task 5: Update Exports

**UPDATE** `/src/lib/components/ui/index.ts`:

Add exports for all the new components:

```typescript
// Existing exports...

// New wrapper components from GroveEngine
export { default as Button } from './Button.svelte';
export { default as Card } from './Card.svelte';
export { default as Badge } from './Badge.svelte';
export { default as Input } from './Input.svelte';
export { default as Textarea } from './Textarea.svelte';
export { default as Skeleton } from './Skeleton.svelte';

// Also export primitives
export {
  Root as ButtonRoot
} from './button';

export {
  Root as CardRoot,
  Header as CardHeader,
  Title as CardTitle,
  Description as CardDescription,
  Content as CardContent,
  Footer as CardFooter
} from './card';

export {
  Root as BadgeRoot
} from './badge';

export {
  Root as InputRoot
} from './input';

export {
  Root as TextareaRoot
} from './textarea';

export {
  Root as SeparatorRoot
} from './separator';

export {
  Root as SkeletonRoot,
  Skeleton as SkeletonComponent
} from './skeleton';

export { default as CollapsibleSection } from './CollapsibleSection.svelte';
```

**UPDATE** `/src/lib/components/index.ts`:

Add the new UI exports to the main component index.

---

## Task 6: Update package.json

**UPDATE** `/package.json`:

1. **Version bump**: `0.2.0` → `0.3.0`

2. **Update exports** to include new components and remove gutter:

```json
{
  "name": "@groveengine/ui",
  "version": "0.3.0",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "svelte": "./dist/index.js"
    },
    "./ui": {
      "types": "./dist/components/ui/index.d.ts",
      "svelte": "./dist/components/ui/index.js"
    },
    "./ui/*": {
      "types": "./dist/components/ui/*.svelte.d.ts",
      "svelte": "./dist/components/ui/*.svelte"
    },
    "./gallery": {
      "types": "./dist/components/gallery/index.d.ts",
      "svelte": "./dist/components/gallery/index.js"
    },
    "./editor": {
      "types": "./dist/components/editor/index.d.ts",
      "svelte": "./dist/components/editor/index.js"
    },
    "./indicators": {
      "types": "./dist/components/indicators/index.d.ts",
      "svelte": "./dist/components/indicators/index.js"
    },
    "./content": {
      "types": "./dist/components/content/index.d.ts",
      "svelte": "./dist/components/content/index.js"
    },
    "./forms": {
      "types": "./dist/components/forms/index.d.ts",
      "svelte": "./dist/components/forms/index.js"
    },
    "./icons": {
      "types": "./dist/components/icons/index.d.ts",
      "svelte": "./dist/components/icons/index.js"
    },
    "./states": {
      "types": "./dist/components/states/index.d.ts",
      "svelte": "./dist/components/states/index.js"
    },
    "./charts": {
      "types": "./dist/components/charts/index.d.ts",
      "svelte": "./dist/components/charts/index.js"
    },
    "./tokens": {
      "types": "./dist/tokens/index.d.ts",
      "default": "./dist/tokens/index.js"
    },
    "./utils": {
      "types": "./dist/utils/index.d.ts",
      "default": "./dist/utils/index.js"
    },
    "./styles": {
      "default": "./dist/styles/grove.css"
    },
    "./styles/*": {
      "default": "./dist/styles/*.css"
    },
    "./tailwind": {
      "default": "./dist/tailwind.preset.js"
    }
  }
}
```

Note: **REMOVED** `./gutter` export path.

---

## Task 7: Create BELONGS_IN_UI.md Guide

**CREATE** `/BELONGS_IN_UI.md`:

Copy the contents from the GroveEngine repo at `/Users/mini/Documents/Projects/GroveEngine/BELONGS_IN_UI.md` (I created this file earlier).

This guide helps developers quickly decide if code belongs in GroveUI.

---

## Task 8: Update CHANGELOG.md

**UPDATE** `/CHANGELOG.md`:

Add entry for version 0.3.0:

```markdown
## [0.3.0] - 2025-12-03

### Added
- Generic CollapsibleSection component for UI library
- Button wrapper component from GroveEngine
- Card wrapper component from GroveEngine
- Badge wrapper component from GroveEngine
- Input wrapper component from GroveEngine
- Textarea wrapper component from GroveEngine
- Skeleton wrapper component from GroveEngine
- BELONGS_IN_UI.md decision guide

### Removed
- Gutter system (moved to GroveEngine as domain-specific feature)
  - ContentWithGutter
  - LeftGutter
  - GutterItem
  - TableOfContents
  - MobileTOC
  - CollapsibleSection (domain-specific version)

### Fixed
- Circular dependency: IconLegend now uses local CollapsibleSection instead of importing from GroveEngine

### Changed
- Version bump: 0.2.0 → 0.3.0
- Package exports updated to reflect component changes
```

---

## Task 9: Update README.md

**UPDATE** `/README.md`:

1. Update component count
2. Remove gutter system from component list
3. Add new generic wrappers to component list
4. Update installation/usage examples

Example section to update:

```markdown
## Components

### UI Components (18 components)
- Button, Card, Badge, Input, Textarea
- Dialog, Sheet, Select, Tabs, Accordion
- Skeleton, Table, Separator
- Toast notifications
- CollapsibleSection

### Gallery Components (4 components)
- ImageGallery, Lightbox, ZoomableImage, LightboxCaption

### Editor Components (2 components)
- MarkdownEditor, GutterManager

### Indicators (3 components)
- StatusBadge, ScoreBar, CreditBalance

### Content Cards (3 components)
- ProductCard, SearchCard, PlanCard

### Charts (4 components)
- ActivityOverview, LOCBar, RepoBreakdown, Sparkline

### States (4 components)
- LoadingSkeleton, EmptyState, Loading, ThemeToggle

**Note**: Gutter system has been moved to GroveEngine (domain-specific feature).
```

---

## Task 10: Build and Verify

After making all changes:

1. **Install dependencies** (if needed):
   ```bash
   npm install
   ```

2. **Run type checking**:
   ```bash
   npm run check
   ```

3. **Build the package**:
   ```bash
   npm run build
   ```

4. **Verify exports**:
   - Check that `dist/` contains all expected files
   - Verify `dist/components/ui/` has new components
   - Verify `dist/components/gutter/` is gone

---

## Success Criteria

When done, verify:

- [ ] Gutter directory completely removed
- [ ] Generic CollapsibleSection created in ui/
- [ ] IconLegend imports from local CollapsibleSection
- [ ] 7 generic UI wrappers copied from GroveEngine
- [ ] All exports updated (package.json and index files)
- [ ] Version bumped to 0.3.0
- [ ] CHANGELOG.md updated
- [ ] README.md updated
- [ ] BELONGS_IN_UI.md guide added
- [ ] `npm run check` passes with no errors
- [ ] `npm run build` succeeds
- [ ] No imports from `@autumnsgrove/groveengine` remain

---

## Important Notes

- **DO NOT publish to npm yet** - we need to coordinate with GroveEngine changes
- **DO commit your changes** to git with a clear commit message
- The GroveEngine migration will happen separately
- After both migrations are done, we'll publish GroveUI first, then GroveEngine

---

## Git Commit Message

When done, commit with:

```
feat: Separate UI from domain logic, remove circular dependency

BREAKING CHANGE: Gutter system moved to GroveEngine

- Remove gutter system (ContentWithGutter, LeftGutter, etc.)
- Add generic CollapsibleSection for UI library
- Add generic UI wrappers from GroveEngine (Button, Card, Badge, Input, Textarea, Skeleton)
- Fix circular dependency in IconLegend
- Update exports and version to 0.3.0
- Add BELONGS_IN_UI.md decision guide

The gutter annotation system is Grove-specific and has been moved to
@autumnsgrove/groveengine where it belongs. GroveUI now contains only
generic, reusable UI components with no domain-specific logic.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Questions?

If anything is unclear or you encounter issues:
1. Check the decision guides (BELONGS_IN_UI.md)
2. Reference the GroveEngine repo for component structure
3. Ask for clarification before proceeding

**Good luck! This is a big migration but it will clean up the architecture significantly.**
