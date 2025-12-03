# Belongs in GroveUI

**Quick Reference Guide for Claude Code & Developers**

This document helps you quickly decide if code belongs in the GroveUI package.

---

## What IS GroveUI?

GroveUI is a **pure design system and UI component library**. It provides:
- Generic, reusable UI components
- Design tokens (colors, typography, spacing, animations)
- Styling utilities and Tailwind presets
- Visual assets (icons, illustrations, patterns)
- Layout primitives with no business logic

**Key Principle**: GroveUI has **ZERO** business logic. It's pure presentation.

---

## ✅ Belongs in GroveUI

### 1. Generic UI Components

**Form Elements**:
- Button (with variants: primary, secondary, danger, ghost, link)
- Input, Textarea
- Select (dropdown)
- Checkbox, Radio, Switch

**Layout Components**:
- Card (with header, content, footer)
- Separator
- Skeleton (loading placeholders)
- Badge

**Feedback Components**:
- Dialog (modals)
- Sheet (slide-out panels)
- Toast (notifications)
- Alert

**Navigation Components**:
- Tabs
- Accordion
- Breadcrumbs

**Data Display**:
- Table (with header, body, footer, sorting UI)
- List components

**Test**: "Could any project use this component without modification?"
- **YES** → Belongs in GroveUI
- **NO** → Belongs in GroveEngine or site-specific

---

### 2. Design Tokens

**Color System**:
- Primary brand colors (Grove Green #16a34a)
- Secondary colors (Bark Brown #3d2914, Cream #fefdfb)
- Semantic colors (background, foreground, muted, accent, destructive)
- Full color scales (50-950 for each)

**Typography**:
- Font families (serif: Georgia, sans: system, mono: SF Mono)
- Font sizes (display-lg, display, heading-lg, body-lg, body, body-sm, caption)
- Line heights
- Font weights

**Spacing & Sizing**:
- Spacing scale (0, 1, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96)
- Custom spacings (18, 22, 30)
- Max-widths (prose, prose-wide, prose-narrow)

**Effects**:
- Shadows (grove-sm, grove, grove-md, grove-lg, grove-xl, grove-inner, grove-glow)
- Border radius (grove: 0.75rem, grove-lg, grove-xl, grove-full)

**Animations**:
- Fade in/out
- Grow/shrink
- Bloom effect
- Pulse-soft
- Leaf-fall, leaf-sway
- Spin variants
- Slide-in (up, down, left, right)
- Transitions (grove-fast, grove, grove-slow, grove-slower)

---

### 3. Styling Utilities

**Class Name Utilities**:
```typescript
// utils/cn.ts
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Tailwind Preset**:
```javascript
// tailwind.preset.js
export default {
  theme: {
    extend: {
      colors: { /* Grove colors */ },
      typography: { /* Custom prose */ },
      animation: { /* Grove animations */ }
    }
  }
}
```

**CSS Files**:
- `grove.css` - Main stylesheet with Tailwind integration
- `tokens.css` - CSS custom properties for design tokens

---

### 4. Visual Assets

**Icons** (SVG):
- Logo (grove logo, leaf, tree, seedling)
- UI icons (using lucide-svelte for consistency)
- Brand marks

**Illustrations** (SVG):
- Empty state illustrations
- Error state illustrations
- Success state illustrations

**Patterns** (SVG):
- Background patterns (leaves, organic shapes)
- Decorative elements

---

### 5. Component Patterns

**Primitive Wrappers**:
- Wraps shadcn-svelte/bits-ui primitives
- Provides simplified, opinionated API
- No business logic, just UI concerns

**Example**:
```svelte
<!-- Button.svelte in GroveUI -->
<script lang="ts">
  import { Button as PrimitiveButton } from '$lib/primitives/button';

  interface Props {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
    size?: 'sm' | 'md' | 'lg';
    children?: Snippet;
  }

  let { variant = 'primary', size = 'md', children, ...restProps }: Props = $props();
</script>

<PrimitiveButton class={buttonVariants({ variant, size })} {...restProps}>
  {@render children?.()}
</PrimitiveButton>
```

**Compositional Patterns**:
- Card = Card.Root + Card.Header + Card.Content + Card.Footer
- Dialog = Dialog.Root + Dialog.Trigger + Dialog.Content + Dialog.Overlay
- Table = Table.Root + Table.Header + Table.Body + Table.Row + Table.Cell

---

## ❌ Does NOT Belong in GroveUI

### Business Logic
- API calls
- Data fetching
- Authentication checks
- Payment processing
- Content parsing (markdown, etc.)
- Data validation beyond UI validation

### Domain-Specific Features
- Grove's annotation system (gutter components)
- Markdown editor with Mermaid
- Blog/page management
- E-commerce features
- User management beyond UI

### Site-Specific Code
- Routes specific to one deployment
- Custom branding unique to one client
- Environment-specific configuration

---

## Decision Tree

```
Is it purely visual with no business logic?
├─ YES: Is it generic enough for any project?
│  ├─ YES: ✅ Belongs in GroveUI
│  └─ NO: Is it Grove-specific UI?
│     ├─ YES: ❌ Belongs in GroveEngine (domain component)
│     └─ NO: ❌ Belongs in Site-Specific
│
└─ NO: Does it contain business logic?
   └─ ❌ Belongs in GroveEngine or open-source utility library
```

### Quick Tests

**The "Any Project" Test**:
"Could a completely different project (e-commerce, dashboard, blog, etc.) use this component without changing it?"
- **YES** → GroveUI
- **NO** → GroveEngine or Site-Specific

**The "Props" Test**:
"Do the component props reference domain concepts (posts, annotations, users, payments)?"
- **YES** → GroveEngine
- **NO** → GroveUI

**The "Logic" Test**:
"Does this component call APIs, process data, or make business decisions?"
- **YES** → GroveEngine
- **NO** → GroveUI

---

## Examples

### ✅ Belongs in GroveUI

**Example 1: Generic Button**
```svelte
<script lang="ts">
  interface Props {
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    onclick?: () => void;
  }

  // No business logic - just presentation
</script>
```
**Why**: Pure UI component, no Grove-specific logic, reusable anywhere.

**Example 2: Card Component**
```svelte
<script lang="ts">
  interface Props {
    children?: Snippet;
    class?: string;
  }

  // Just layout and styling
</script>

<div class="card {className}">
  {@render children?.()}
</div>
```
**Why**: Generic layout primitive, no domain knowledge required.

**Example 3: Design Tokens**
```typescript
// tokens/colors.ts
export const colors = {
  grove: {
    50: '#f0fdf4',
    500: '#16a34a',
    900: '#14532d'
  },
  cream: '#fefdfb',
  bark: '#3d2914'
};
```
**Why**: Pure design system values, applicable to any project.

### ❌ Does NOT Belong in GroveUI

**Example 1: Markdown Editor with Mermaid**
```svelte
<!-- This belongs in GroveEngine -->
<script>
  import { parseMarkdown } from 'grove-utils';

  function handleSave(content: string) {
    // Parses markdown, handles Mermaid diagrams
    // Saves to Grove's content system
  }
</script>
```
**Why**: Domain-specific feature tied to Grove's content system.

**Example 2: Gutter Annotation System**
```svelte
<!-- This belongs in GroveEngine -->
<script>
  import { calculateGutterPosition } from 'gutter-utils';

  // Grove-specific annotation layout logic
</script>
```
**Why**: Specific to Grove's annotation feature, not generic.

**Example 3: Auth-Protected Component**
```svelte
<!-- This belongs in GroveEngine -->
<script>
  import { checkAuth } from 'auth-utils';

  onMount(async () => {
    const user = await checkAuth();
    // Business logic for authentication
  });
</script>
```
**Why**: Contains business logic (auth), not pure UI.

---

## Red Flags: Signs Code Should Be Elsewhere

### 🚩 Probably belongs in GroveEngine:
- Component props include `post`, `user`, `annotation`, `product`, `payment`
- Imports from utilities that parse/process data
- Makes API calls or database queries
- Checks authentication or permissions
- Handles form submission with validation beyond UI concerns

### 🚩 Probably belongs in Site-Specific:
- Hardcoded content or copy
- Specific to one business or deployment
- Uses environment variables
- Contains routing logic

---

## Common Scenarios

### Scenario 1: "I'm creating a form"

**Question**: What does the form contain?

- **Generic form fields** (Input, Select, Textarea with validation states) → **GroveUI**
- **Form that creates blog posts** with markdown parsing → **GroveEngine**
- **Contact form with specific business info** → **Site-Specific**

### Scenario 2: "I'm building a modal"

**Question**: What's inside the modal?

- **Generic Dialog primitive** (open/close, overlay, content) → **GroveUI**
- **Modal that shows markdown preview** with Mermaid support → **GroveEngine**
- **Modal with specific site content/copy** → **Site-Specific**

### Scenario 3: "I'm styling something"

**Question**: Is it a design token or component-specific?

- **Design tokens** (colors, fonts, spacing) → **GroveUI tokens**
- **Generic component styles** (Button hover states) → **GroveUI component**
- **Styles specific to Grove features** (gutter layout) → **GroveEngine**
- **Custom branding for one site** → **Site-Specific**

---

## Integration with Other Packages

### GroveUI → Used by → GroveEngine

GroveEngine **SHOULD**:
- Import generic components from GroveUI
- Wrap them with domain-specific logic
- Never modify GroveUI internals

**Example**:
```typescript
// In GroveEngine
import { Button, Card } from '@groveengine/ui/ui';

// Wrap with domain logic
export function AdminButton(props) {
  // Add admin-specific behavior
  return <Button {...props} />;
}
```

### GroveUI → Used by → Site Deployments

Sites **SHOULD**:
- Import UI components from `@groveengine/ui`
- Use design tokens for custom styling
- Never modify GroveUI components

**Example**:
```typescript
// In site-specific code
import { Button, Card, Input } from '@groveengine/ui/ui';
import { colors } from '@groveengine/ui/tokens';

// Compose for site-specific page
```

---

## File Path Patterns

### Typical GroveUI Paths

**Components**:
- `/src/lib/components/ui/*` - Generic UI components
- `/src/lib/primitives/*` - Low-level primitives

**Design System**:
- `/src/lib/tokens/colors.ts`
- `/src/lib/tokens/typography.ts`
- `/src/lib/tokens/spacing.ts`
- `/src/lib/tokens/animation.ts`
- `/src/lib/tokens/effects.ts`

**Styling**:
- `/src/lib/styles/grove.css`
- `/src/lib/styles/tokens.css`
- `/src/lib/tailwind.preset.js`

**Assets**:
- `/src/lib/assets/icons/*`
- `/src/lib/assets/illustrations/*`
- `/src/lib/assets/patterns/*`

**Utilities**:
- `/src/lib/utils/cn.ts` - Class name utility

---

## Dependency Rules

### GroveUI Dependencies

**Allowed**:
- `svelte` - Framework
- `bits-ui` - Headless UI primitives
- `clsx`, `tailwind-merge` - Styling utilities
- `tailwind-variants` - Variant system
- `tailwindcss` - Styling framework
- `lucide-svelte` - Icon library

**NOT Allowed**:
- ~~`marked`, `mermaid`~~ - Content processing (GroveEngine)
- ~~`stripe`, payment libraries~~ - Business logic (GroveEngine)
- ~~`jwt`, auth libraries~~ - Business logic (GroveEngine)
- ~~Any database libraries~~ - Data layer (GroveEngine)

**Rule**: If it's not purely about UI/styling, it doesn't belong in GroveUI dependencies.

---

## Summary Checklist

When adding new code to GroveUI, verify:

- [ ] Does it contain ZERO business logic?
- [ ] Could any project use it without modification?
- [ ] Does it only deal with presentation/styling?
- [ ] Are all props generic (no domain concepts)?
- [ ] Does it have no dependencies on GroveEngine?
- [ ] Is it reusable across different domains?

If you answered **YES** to all → ✅ **Belongs in GroveUI**

If any are **NO** → Check if it belongs in GroveEngine or Site-Specific code instead.

---

## Version Coupling

**Important**: GroveUI should be **version-independent** from GroveEngine.

- GroveUI: `0.3.0` (UI design system version)
- GroveEngine: `0.3.0` (depends on GroveUI, but versioned separately)

GroveUI can be used by:
- GroveEngine
- Other projects completely unrelated to Grove
- Customer sites directly

This independence is a feature - don't couple versions tightly.

---

**Last Updated**: 2025-12-03
**Related Docs**:
- `BELONGS_IN_ENGINE.md` (GroveEngine decision guide)
- `SITE_SPECIFIC_CODE.md` (Site deployment guide)
- `CUSTOMER_TEMPLATE.md` (New project template)
