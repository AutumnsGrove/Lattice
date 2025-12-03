# GroveEngine Migration Prompt

**For use in the GroveEngine repository at: `/Users/mini/Documents/Projects/GroveEngine`**

---

## Context

I'm separating the GroveEngine and GroveUI packages to eliminate overlap and establish clear boundaries. This prompt handles ALL the GroveEngine-side changes.

## Current State

**GroveEngine** (this repo):
- Version: 0.1.0
- Published as: `@autumnsgrove/groveengine` on npm
- Contains 58 duplicate UI components that are moving to GroveUI
- Contains domain-specific components (gutter, admin, gallery) that should stay
- Will become version 0.3.0 after migration

**GroveUI** (separate repo):
- Version: 0.3.0 (after its migration)
- Published as: `@groveengine/ui` on npm
- Now contains generic UI wrappers we can import

## Your Mission

Execute ALL of the following changes to GroveEngine:

---

## Task 1: Add @groveengine/ui Dependency

GroveEngine will now import generic UI components from GroveUI instead of bundling them.

**UPDATE** `/packages/engine/package.json`:

Add to dependencies:
```json
{
  "dependencies": {
    "@groveengine/ui": "^0.3.0",
    // ... existing dependencies remain
  }
}
```

**RUN**:
```bash
cd /Users/mini/Documents/Projects/GroveEngine
npm install
```

---

## Task 2: Delete Moved UI Components

Remove the 7 generic UI components that now live in GroveUI.

**DELETE** from `/packages/engine/src/lib/components/ui/`:

1. **Button**:
   - Delete `/button/` directory
   - Delete `Button.svelte`

2. **Card**:
   - Delete `/card/` directory
   - Delete `Card.svelte`

3. **Badge**:
   - Delete `/badge/` directory
   - Delete `Badge.svelte`

4. **Input**:
   - Delete `/input/` directory
   - Delete `Input.svelte`

5. **Textarea**:
   - Delete `/textarea/` directory
   - Delete `Textarea.svelte`

6. **Separator**:
   - Delete `/separator/` directory

7. **Skeleton**:
   - Delete `/skeleton/` directory
   - Delete `Skeleton.svelte`

**KEEP** (admin-specific components):
- `/dialog/` + `Dialog.svelte`
- `/sheet/` + `Sheet.svelte`
- `/select/` + `Select.svelte`
- `/table/` + `Table.svelte`
- `/tabs/` + `Tabs.svelte`
- `/accordion/` + `Accordion.svelte`
- `Toast.svelte` + `toast.ts`

---

## Task 3: Update Component Exports

**UPDATE** `/packages/engine/src/lib/components/ui/index.ts`:

Remove exports for deleted components:

```typescript
// REMOVE these imports/exports:
// export { default as Button } from "./Button.svelte";
// export { default as Card } from "./Card.svelte";
// export { default as Badge } from "./Badge.svelte";
// export { default as Input } from "./Input.svelte";
// export { default as Textarea } from "./Textarea.svelte";
// export { default as Skeleton } from "./Skeleton.svelte";

// REMOVE button/card/badge/input/textarea/separator/skeleton re-exports

// KEEP these (admin-specific):
export { default as Dialog } from "./Dialog.svelte";
export { default as Sheet } from "./Sheet.svelte";
export { default as Select } from "./Select.svelte";
export { default as Tabs } from "./Tabs.svelte";
export { default as Accordion } from "./Accordion.svelte";
export { default as Table } from "./Table.svelte";
export { default as Toast } from "./Toast.svelte";
export { toast } from "./toast";

// Keep shadcn re-exports for Dialog, Sheet, Table, Tabs, Accordion, Select
// ... (existing exports remain)
```

---

## Task 4: Update Main Engine Index

**UPDATE** `/packages/engine/src/lib/index.ts`:

The line `export * from './components/ui/index';` will now only export the admin-specific components (Dialog, Sheet, Select, Table, Tabs, Accordion, Toast) since we removed the generic ones.

This is actually fine - no changes needed here. The wildcard export will automatically export only what remains.

---

## Task 5: Update All Imports Throughout Codebase

This is the BIG task. We need to find and replace all imports of the moved components.

### Search and Replace Pattern

**Find all files** importing these components:
- Button
- Card
- Badge
- Input
- Textarea
- Skeleton
- Separator

**Change imports FROM**:
```typescript
import { Button, Card, Input } from '$lib/components/ui/Button';
// OR
import { Button } from '$lib/components/ui';
```

**Change imports TO**:
```typescript
import { Button, Card, Input } from '@groveengine/ui/ui';
```

### Files to Update

Use grep/search to find ALL occurrences in:

1. **Custom Components** (`/packages/engine/src/lib/components/custom/`)
2. **Admin Components** (`/packages/engine/src/lib/components/admin/`)
3. **Gallery Components** (`/packages/engine/src/lib/components/gallery/`)
4. **Engine Routes** (`/packages/engine/src/routes/**/*.svelte`)
5. **Example Site** (`/packages/example-site/src/routes/**/*.svelte`)
6. **Landing Site** (`/landing/src/routes/**/*.svelte`)

### Specific Files That Likely Need Updates

Based on common usage patterns, check these files:

**Admin Components**:
- `/packages/engine/src/lib/components/admin/MarkdownEditor.svelte` - Uses Button, Input, Textarea
- `/packages/engine/src/lib/components/admin/GutterManager.svelte` - Uses Card, Button, Input

**Custom Components**:
- `/packages/engine/src/lib/components/custom/ContentWithGutter.svelte` - May use Card
- `/packages/engine/src/lib/components/custom/TableOfContents.svelte` - May use Card

**Gallery Components**:
- `/packages/engine/src/lib/components/gallery/ImageGallery.svelte` - May use Button, Card

**Example Site Routes** (ALL route files):
- Search for imports from `$lib/components/ui/`
- Update to import from `@groveengine/ui/ui`

**Landing Site Routes** (ALL route files):
- Same pattern as example site

### Bash Command to Find Files

```bash
# Find all files importing Button, Card, Badge, Input, Textarea, Skeleton
grep -r "from '\$lib/components/ui/Button" packages/engine/src/
grep -r "from '\$lib/components/ui/Card" packages/engine/src/
grep -r "from '\$lib/components/ui/Badge" packages/engine/src/
grep -r "from '\$lib/components/ui/Input" packages/engine/src/
grep -r "from '\$lib/components/ui/Textarea" packages/engine/src/
grep -r "from '\$lib/components/ui/Skeleton" packages/engine/src/
grep -r "from '\$lib/components/ui'" packages/engine/src/ | grep -E "(Button|Card|Badge|Input|Textarea|Skeleton)"

# Also check example-site and landing
grep -r "from '\$lib/components/ui'" packages/example-site/src/
grep -r "from '\$lib/components/ui'" landing/src/
```

---

## Task 6: Update Example Site Dependencies

**UPDATE** `/packages/example-site/package.json`:

Add GroveUI dependency:

```json
{
  "name": "example-site",
  "dependencies": {
    "@autumnsgrove/groveengine": "workspace:*",
    "@groveengine/ui": "^0.3.0"
  }
}
```

**UPDATE** all route files in `/packages/example-site/src/routes/`:

Change imports:
```typescript
// UI Components → from GroveUI
import { Button, Card, Input, Badge, Skeleton } from '@groveengine/ui/ui';

// Engine Features → from GroveEngine
import { ContentWithGutter, MarkdownEditor } from '@autumnsgrove/groveengine';

// Admin Components → from GroveEngine (they stayed)
import { Dialog, Sheet, Table } from '@autumnsgrove/groveengine';
```

---

## Task 7: Update Landing Site Dependencies

**UPDATE** `/landing/package.json`:

Add GroveUI dependency:

```json
{
  "name": "landing",
  "dependencies": {
    "@autumnsgrove/groveengine": "workspace:*",
    "@groveengine/ui": "^0.3.0"
  }
}
```

**UPDATE** all route files in `/landing/src/routes/`:

Same pattern as example-site.

---

## Task 8: Update Package Exports

**UPDATE** `/packages/engine/package.json`:

Remove exports for moved components, keep admin components:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "svelte": "./dist/index.js",
      "default": "./dist/index.js"
    },
    "./components/custom/*": {
      "types": "./dist/components/custom/*.svelte.d.ts",
      "svelte": "./dist/components/custom/*.svelte"
    },
    "./components/admin/*": {
      "types": "./dist/components/admin/*.svelte.d.ts",
      "svelte": "./dist/components/admin/*.svelte"
    },
    "./components/gallery/*": {
      "types": "./dist/components/gallery/*.svelte.d.ts",
      "svelte": "./dist/components/gallery/*.svelte"
    },
    "./components/ui": {
      "types": "./dist/components/ui/index.d.ts",
      "svelte": "./dist/components/ui/index.js"
    },
    "./utils/*": {
      "types": "./dist/utils/*.d.ts",
      "default": "./dist/utils/*.js"
    },
    "./auth/*": {
      "types": "./dist/auth/*.d.ts",
      "default": "./dist/auth/*.js"
    },
    "./server/*": {
      "types": "./dist/server/*.d.ts",
      "default": "./dist/server/*.js"
    },
    "./payments": {
      "types": "./dist/payments/index.d.ts",
      "default": "./dist/payments/index.js"
    },
    "./payments/*": {
      "types": "./dist/payments/*.d.ts",
      "default": "./dist/payments/*.js"
    }
  }
}
```

Note: `./components/ui` export remains but now only contains admin-specific components.

**UPDATE** version:
```json
{
  "version": "0.3.0"
}
```

---

## Task 9: Update Root Package Exports

**UPDATE** `/package.json` (root):

```json
{
  "name": "@autumnsgrove/grove-engine",
  "version": "0.3.0",
  "exports": {
    ".": {
      "types": "./packages/engine/dist/index.d.ts",
      "svelte": "./packages/engine/dist/index.js",
      "default": "./packages/engine/dist/index.js"
    },
    "./components/custom/*": {
      "types": "./packages/engine/dist/components/custom/*.svelte.d.ts",
      "svelte": "./packages/engine/dist/components/custom/*.svelte"
    },
    "./components/admin/*": {
      "types": "./packages/engine/dist/components/admin/*.svelte.d.ts",
      "svelte": "./packages/engine/dist/components/admin/*.svelte"
    },
    "./components/gallery/*": {
      "types": "./packages/engine/dist/components/gallery/*.svelte.d.ts",
      "svelte": "./packages/engine/dist/components/gallery/*.svelte"
    },
    "./utils/*": {
      "types": "./packages/engine/dist/utils/*.d.ts",
      "default": "./packages/engine/dist/utils/*.js"
    },
    "./auth/*": {
      "types": "./packages/engine/dist/auth/*.d.ts",
      "default": "./packages/engine/dist/auth/*.js"
    },
    "./server/*": {
      "types": "./packages/engine/dist/server/*.d.ts",
      "default": "./packages/engine/dist/server/*.js"
    },
    "./payments": {
      "types": "./packages/engine/dist/payments/index.d.ts",
      "default": "./packages/engine/dist/payments/index.js"
    },
    "./payments/*": {
      "types": "./packages/engine/dist/payments/*.d.ts",
      "default": "./packages/engine/dist/payments/*.js"
    }
  }
}
```

Note: Removed `./components/ui` from root exports since those are now in GroveUI.

---

## Task 10: Update CHANGELOG.md

**UPDATE** `/CHANGELOG.md`:

Add entry for version 0.3.0:

```markdown
## [0.3.0] - 2025-12-03

### Added
- Dependency on @groveengine/ui for generic UI components
- Documentation guides:
  - BELONGS_IN_ENGINE.md (code placement decisions)
  - SITE_SPECIFIC_CODE.md (deployment guide)
  - CUSTOMER_TEMPLATE.md (new project template)

### Removed
- Generic UI components (moved to @groveengine/ui)
  - Button, Card, Badge, Input, Textarea, Skeleton, Separator
  - These are now imported from @groveengine/ui instead

### Changed
- BREAKING CHANGE: Import generic UI components from @groveengine/ui/ui
- Admin-specific components remain in GroveEngine (Dialog, Sheet, Select, Table, Tabs, Accordion, Toast)
- Version bump: 0.1.0 → 0.3.0
- Updated all internal imports to use @groveengine/ui
- Updated example-site and landing dependencies

### Fixed
- Clear separation between generic UI (GroveUI) and domain logic (GroveEngine)
- Eliminated component duplication between packages
```

---

## Task 11: Create Migration Guide

**CREATE** `/MIGRATION_V0.1_TO_V0.3.md`:

```markdown
# Migration Guide: GroveEngine v0.1 → v0.3

## Breaking Changes

### Generic UI Components Moved to @groveengine/ui

Generic UI components (Button, Card, Badge, Input, Textarea, Skeleton, Separator) have been moved to the @groveengine/ui package.

### Before (v0.1)

\`\`\`typescript
import { Button, Card, Input } from '@autumnsgrove/groveengine';
\`\`\`

### After (v0.3)

\`\`\`typescript
// Generic UI components
import { Button, Card, Input } from '@groveengine/ui/ui';

// Domain-specific components (still in engine)
import { ContentWithGutter, MarkdownEditor } from '@autumnsgrove/groveengine';

// Admin components (still in engine)
import { Dialog, Sheet, Table } from '@autumnsgrove/groveengine';
\`\`\`

## Migration Steps

### 1. Install New Dependency

\`\`\`bash
npm install @groveengine/ui@^0.3.0
npm install @autumnsgrove/groveengine@^0.3.0
\`\`\`

### 2. Update Imports

Find and replace imports throughout your codebase:

**Generic UI Components** (move to GroveUI):
- Button
- Card
- Badge
- Input
- Textarea
- Skeleton
- Separator

**Domain Components** (stay in GroveEngine):
- ContentWithGutter
- LeftGutter
- GutterItem
- TableOfContents
- MobileTOC
- CollapsibleSection
- MarkdownEditor
- GutterManager
- ImageGallery
- Lightbox
- ZoomableImage

**Admin Components** (stay in GroveEngine):
- Dialog
- Sheet
- Select
- Table
- Tabs
- Accordion
- Toast

### 3. Update Tailwind Config

If you're using GroveUI, update your Tailwind config to scan GroveUI files:

\`\`\`javascript
// tailwind.config.js
import grovePreset from '@groveengine/ui/tailwind';

export default {
  presets: [grovePreset],
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/@groveengine/ui/**/*.{html,js,svelte,ts}',
    './node_modules/@autumnsgrove/groveengine/**/*.{html,js,svelte,ts}'
  ]
};
\`\`\`

### 4. Test Your Application

\`\`\`bash
npm run check
npm run build
npm run dev
\`\`\`

## What Stayed in GroveEngine?

GroveEngine remains the home for:
- Content management features (markdown parsing, gutter annotations)
- Authentication & session management
- Payment processing
- Image processing & gallery
- Admin-specific UI components
- API routes and server logic
- Database schemas

## What Moved to GroveUI?

GroveUI is now the home for:
- Generic, reusable UI components
- Design tokens (colors, typography, spacing, animations)
- Styling utilities
- Tailwind presets

## Need Help?

See the decision guides:
- `BELONGS_IN_ENGINE.md` - What belongs in GroveEngine
- `BELONGS_IN_UI.md` - What belongs in GroveUI (in GroveUI repo)
- `SITE_SPECIFIC_CODE.md` - What belongs in your site deployment

## Example: Full Component Import Pattern

\`\`\`typescript
// ✅ Correct imports after v0.3
import { Button, Card, Input, Badge, Skeleton } from '@groveengine/ui/ui';
import {
  ContentWithGutter,
  MarkdownEditor,
  ImageGallery,
  Dialog,
  Sheet,
  Table
} from '@autumnsgrove/groveengine';

export function MyPage() {
  return (
    <Card>
      <ContentWithGutter>
        <h1>My Content</h1>
        <Button>Click Me</Button>
      </ContentWithGutter>
    </Card>
  );
}
\`\`\`
```

---

## Task 12: Update README.md

**UPDATE** `/README.md`:

Add migration notice and update component lists:

```markdown
## Installation

\`\`\`bash
npm install @autumnsgrove/groveengine@^0.3.0
npm install @groveengine/ui@^0.3.0
\`\`\`

## Breaking Changes in v0.3

Generic UI components have been moved to `@groveengine/ui`. See [MIGRATION_V0.1_TO_V0.3.md](./MIGRATION_V0.1_TO_V0.3.md) for details.

## Components

### Domain-Specific Components

**Content Components**:
- ContentWithGutter - Annotation layout system
- LeftGutter - Annotation sidebar
- GutterItem - Individual annotation
- TableOfContents - Auto-generated TOC
- MobileTOC - Mobile navigation
- CollapsibleSection - Collapsible content

**Admin Components**:
- MarkdownEditor - Rich markdown editor with Mermaid
- GutterManager - Annotation management
- Admin UI wrappers: Dialog, Sheet, Select, Table, Tabs, Accordion, Toast

**Gallery Components**:
- ImageGallery - Multi-image display
- Lightbox - Full-screen viewer
- ZoomableImage - Pinch-to-zoom
- LightboxCaption - Image captions

### Generic UI Components

For generic UI components (Button, Card, Input, etc.), see [@groveengine/ui](https://github.com/AutumnsGrove/GroveUI).
```

---

## Task 13: Build and Verify

After making all changes:

1. **Install dependencies**:
   ```bash
   npm install
   cd packages/example-site && npm install
   cd ../landing && npm install
   ```

2. **Run type checking**:
   ```bash
   npm run check
   ```

3. **Build all packages**:
   ```bash
   npm run build
   ```

4. **Test demo sites**:
   ```bash
   cd packages/example-site && npm run dev
   # Verify all pages load and UI components work
   ```

---

## Success Criteria

When done, verify:

- [ ] @groveengine/ui dependency added to engine package.json
- [ ] 7 generic UI components deleted from engine
- [ ] All imports updated throughout codebase
- [ ] Example-site dependencies updated
- [ ] Landing site dependencies updated
- [ ] Package exports updated (engine and root)
- [ ] Version bumped to 0.3.0
- [ ] CHANGELOG.md updated
- [ ] MIGRATION_V0.1_TO_V0.3.md created
- [ ] README.md updated
- [ ] `npm run check` passes with no errors
- [ ] `npm run build` succeeds for engine, example-site, and landing
- [ ] No imports from deleted components remain
- [ ] All demo sites load and function correctly

---

## Important Notes

- **DO NOT publish to npm yet** - coordinate with GroveUI publishing
- **DO commit your changes** to git with a clear commit message
- GroveUI must be published FIRST (it's at v0.3.0), then GroveEngine can reference it
- After both migrations are done, publish order: GroveUI → GroveEngine

---

## Git Commit Message

When done, commit with:

```
feat: Migrate generic UI to @groveengine/ui package

BREAKING CHANGE: Generic UI components now imported from @groveengine/ui

- Add @groveengine/ui@^0.3.0 dependency
- Remove generic UI components (Button, Card, Badge, Input, Textarea, Skeleton)
- Update all imports to use @groveengine/ui/ui
- Update example-site and landing dependencies
- Update package exports
- Version bump: 0.1.0 → 0.3.0
- Add migration guide (MIGRATION_V0.1_TO_V0.3.md)

GroveEngine now focuses on domain-specific features (content management,
auth, payments, gutter system) while generic UI comes from @groveengine/ui.

Admin-specific components (Dialog, Sheet, Select, Table, Tabs, Accordion,
Toast) remain in GroveEngine as they're optimized for admin interfaces.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Questions?

If anything is unclear or you encounter issues:
1. Check the decision guides (BELONGS_IN_ENGINE.md)
2. Reference the migration guide (MIGRATION_V0.1_TO_V0.3.md)
3. Ask for clarification before proceeding

**Good luck! This migration establishes clear boundaries between UI and engine logic.**
