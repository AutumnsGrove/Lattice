# Shadcn-Grove Unification Plan

**Created:** January 30, 2026
**Status:** Planning
**Priority:** High — Structural cleanup for maintainability
**Version:** 0.2.0 → 0.3.0
**Related Issues:**

- (create issue) Unify cn utility locations
- (create issue) Remove TypeScript suppressions from UI components
- (create issue) Refactor GlassButton to extend Button
- (create issue) Refactor GlassConfirmDialog to use Dialog wrapper
- (create issue) Review Glass\* components for shadcn integration

---

## Executive Summary

This plan consolidates the dual-layer UI architecture by:

1. **Consolidating `cn` utility** to a single canonical location
2. **Removing TypeScript suppressions** from 6 wrapper components
3. **Refactoring GlassButton** to extend Button with glass variants
4. **Refactoring GlassConfirmDialog** to wrap Dialog + GlassCard
5. **Reviewing remaining Glass\* components** case-by-case for shadcn integration opportunities

The goal is a clear architecture: `shadcn primitives → Grove abstraction layer → consumer components`.

---

## Current State Analysis

### Layer Structure (Current)

```
shadcn-svelte (bits-ui + tailwind-variants)
    ↓
primitives/ (45+ files - raw shadcn, uses tv() variants)
    ↓
wrappers/ (Button, Card, Dialog, Badge, etc. - Grove abstraction)
    ↓
Glass suite (GlassButton, GlassCard, GlassNavbar - CUSTOM glassmorphism)
```

### Duplication Issues Found

| Issue                                      | Location                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| **Dual `cn` utilities**                    | `$lib/utils/cn.ts` AND `$lib/ui/utils/cn.ts`                                          |
| **TypeScript suppressions**                | Input.svelte, Select.svelte, Accordion.svelte (+ Button.svelte, GlassButton.svelte)   |
| **Variants defined twice**                 | Button variants in `primitives/button-variants.ts` AND manually in GlassButton.svelte |
| **components.json path mismatch**          | Config: `$lib/components/ui`, Actual: `$lib/ui/components/ui`                         |
| **Custom implementations that could wrap** | GlassConfirmDialog (custom dialog), GlassButton (no shadcn)                           |

---

## Target Architecture

```
shadcn-svelte (bits-ui)
    ↓
primitives/ (45+ files)
    ↓
wrapper components (Button, Card, Dialog, etc. - Grove API)
    ↓
Glass* components (GlassButton extends Button, GlassConfirmDialog uses Dialog)
    ↓
consumer components (pages, grafts, etc.)
```

---

## Phase 1: Foundation (Consolidation)

### 1.1 Consolidate `cn` Utility

**Decision:** Keep `$lib/utils/cn.ts` as canonical, make `$lib/ui/utils/cn.ts` a re-export for backward compatibility.

**Actions:**

1. Keep canonical `cn` at `libs/engine/src/lib/utils/cn.ts`

2. Update `$lib/ui/utils/cn.ts` to re-export:

```typescript
// libs/engine/src/lib/ui/utils/cn.ts
export { cn } from "$lib/utils";
export type { ClassValue } from "clsx";
```

3. Update imports in glass components:
   - `GlassButton.svelte`
   - `GlassCard.svelte`
   - `GlassOverlay.svelte`
   - `GlassConfirmDialog.svelte`
   - `GlassNavbar.svelte`
   - `GlassStatusWidget.svelte`
   - `GlassLegend.svelte`
   - `GlassCarousel.svelte`

4. Delete `$lib/ui/utils/` directory after all files updated, or keep as thin compatibility layer

**Rationale:** Minimizes breaking changes while establishing canonical location.

---

### 1.2 Fix `components.json` Path

**Current:**

```json
"ui": "$lib/components/ui"
```

**Expected:**

```json
"ui": "$lib/ui/components/ui"
```

**File:** `libs/engine/components.json`

**Impact:** This is a documentation/config cleanup. The aliases aren't actively used in imports; they're shadcn-svelte CLI conventions.

---

## Phase 2: TypeScript Fixes

### 2.1 Remove `@ts-nocheck` from Input.svelte

**File:** `libs/engine/src/lib/ui/components/ui/Input.svelte`

**Problem:** File type handling conflicts with ShadcnInput's strict types.

**Solution:** Properly type the restProps to exclude problematic types.

```svelte
<script lang="ts">
	import { Input as ShadcnInput } from "$lib/ui/components/primitives/input";
	import type { HTMLInputAttributes } from "svelte/elements";
	import { cn } from "$lib/ui/utils";

	interface Props extends Omit<HTMLInputAttributes, "class" | "type"> {
		label?: string;
		error?: string;
		value?: string | number;
		placeholder?: string;
		type?: "text" | "email" | "password" | "number";
		required?: boolean;
		disabled?: boolean;
		class?: string;
		id?: string;
		ref?: HTMLInputElement | null;
	}

	// ... existing code
</script>
```

**Key Change:** Explicitly omit `"files"` from HTMLInputAttributes since ShadcnInput doesn't support file inputs.

---

### 2.2 Remove `@ts-nocheck` from Select.svelte

**File:** `libs/engine/src/lib/ui/components/ui/Select.svelte`

**Problem:** ShadcnSelect expects `string[]` for multi-select, but wrapper uses `string` for single-select.

**Solution:** Create properly typed SelectSingle wrapper:

```svelte
<script lang="ts">
	import {
		Select as ShadcnSelect,
		SelectContent,
		SelectItem,
		SelectTrigger,
	} from "$lib/ui/components/primitives/select";
	import type { Snippet } from "svelte";

	interface Option {
		value: string;
		label: string;
		disabled?: boolean;
	}

	interface Props {
		value?: string | undefined;
		options: Option[];
		placeholder?: string;
		disabled?: boolean;
		class?: string;
	}
	// ...
</script>
```

**Key Change:** Be explicit that this is a single-select wrapper and type accordingly.

---

### 2.3 Remove `@ts-nocheck` from Accordion.svelte

**File:** `libs/engine/src/lib/ui/components/ui/Accordion.svelte`

**Problem:** `collapsible` prop exists at runtime but not in bits-ui types.

**Solution:** Use type assertion since this is a known bits-ui gap:

```svelte
<script lang="ts">
	import {
		Accordion as ShadcnAccordion,
		AccordionItem,
		AccordionTrigger,
		AccordionContent,
	} from "$lib/ui/components/primitives/accordion";
	import type { Snippet } from "svelte";

	interface AccordionItemConfig {
		value: string;
		title: string;
		content?: string;
		disabled?: boolean;
	}

	interface Props {
		items: AccordionItemConfig[];
		type?: "single" | "multiple";
		collapsible?: boolean;
		class?: string;
		contentSnippet?: Snippet<[item: AccordionItemConfig]>;
	}

	let {
		items,
		type = "single",
		collapsible = false,
		class: className,
		contentSnippet,
	}: Props = $props();

	const accordionType = $derived(type === "single" ? "single" : "multiple");
</script>

<ShadcnAccordion type={accordionType} collapsible={collapsible as true} class={className}>
	<!-- content -->
</ShadcnAccordion>
```

---

## Phase 3: Core Component Refactoring

### 3.1 Refactor GlassButton (Extends Button)

**File:** `libs/engine/src/lib/ui/components/ui/GlassButton.svelte`

**Current:** Completely custom, no shadcn inheritance.

**Target:** Extends Button with glass variants.

**Variants Mapping:**

| GlassButton Variant | Button Props                               |
| ------------------- | ------------------------------------------ |
| `default`           | `variant="primary"` + glass classes        |
| `accent`            | `variant="primary"` + accent glass classes |
| `dark`              | `variant="secondary"` + dark glass classes |
| `ghost`             | `variant="ghost"`                          |
| `outline`           | `variant="outline"`                        |

**Implementation:**

```svelte
<script lang="ts">
	import Button from "./Button.svelte";
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes, HTMLAnchorAttributes } from "svelte/elements";
	import { cn } from "$lib/ui/utils";

	type GlassVariant = "default" | "accent" | "dark" | "ghost" | "outline";
	type ButtonSize = "sm" | "md" | "lg" | "icon";

	interface Props extends Omit<HTMLButtonAttributes, "class"> {
		variant?: GlassVariant;
		size?: ButtonSize;
		disabled?: boolean;
		href?: string;
		class?: string;
		children?: Snippet;
		ref?: HTMLButtonElement | HTMLAnchorElement | null;
	}

	let {
		variant = "default",
		size = "md",
		disabled = false,
		href,
		class: className,
		children,
		ref = $bindable(null),
		type = "button",
		...restProps
	}: Props = $props();

	// Glass-specific classes only - base classes from Button
	const glassClasses: Record<GlassVariant, string> = {
		default: "bg-white/60 dark:bg-emerald-950/25 border-white/40 dark:border-emerald-800/25",
		accent: "bg-accent/70 dark:bg-accent/60 border-accent/40 dark:border-accent/30",
		dark: "bg-slate-900/50 dark:bg-slate-950/50 border-slate-700/30 dark:border-slate-600/30",
		ghost: "",
		outline: "border-white/40 dark:border-emerald-800/30 bg-transparent",
	};

	// Map to base Button variant
	const baseVariant =
		variant === "default"
			? "primary"
			: variant === "accent"
				? "primary"
				: variant === "dark"
					? "secondary"
					: variant;

	const computedClass = $derived(cn(glassClasses[variant], className));
</script>

{#if href && !disabled}
	<Button
		variant={baseVariant}
		{size}
		{href}
		bind:ref
		class={computedClass}
		disabled
		{type}
		{...restProps}
	>
		{@render children?.()}
	</Button>
{:else}
	<Button
		variant={baseVariant}
		{size}
		bind:ref
		class={computedClass}
		disabled
		{type}
		{...restProps}
	>
		{@render children?.()}
	</Button>
{/if}
```

**Key Benefits:**

- Reuses Button's focus management, keyboard handling, polymorphic rendering
- Glass styling is additive on top of Button's foundation
- Smaller bundle (no duplicate variant logic)

---

### 3.2 Refactor GlassConfirmDialog (Uses Dialog + GlassCard)

**File:** `libs/engine/src/lib/ui/components/ui/GlassConfirmDialog.svelte`

**Current:** Custom implementation with focus trapping, keyboard handling.

**Target:** Wraps Dialog + GlassCard + custom focus management.

**Implementation:**

```svelte
<script lang="ts">
	import Dialog from "./Dialog.svelte";
	import GlassCard from "./GlassCard.svelte";
	import Button from "./Button.svelte";
	import type { Snippet } from "svelte";
	import { AlertTriangle, Trash2, HelpCircle } from "lucide-svelte";
	import { cn } from "$lib/ui/utils";

	type DialogVariant = "default" | "danger" | "warning";

	interface Props {
		open?: boolean;
		title: string;
		message?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: DialogVariant;
		loading?: boolean;
		onconfirm?: () => void | Promise<void>;
		oncancel?: () => void;
		children?: Snippet;
	}

	let {
		open = $bindable(false),
		title,
		message,
		confirmLabel = "Confirm",
		cancelLabel = "Cancel",
		variant = "default",
		loading = false,
		onconfirm,
		oncancel,
		children,
	}: Props = $props();

	const variantConfig = {
		default: {
			icon: HelpCircle,
			iconClass: "text-accent-muted",
			confirmVariant: "primary" as const,
		},
		danger: {
			icon: Trash2,
			iconClass: "text-red-500 dark:text-red-400",
			confirmVariant: "danger" as const,
		},
		warning: {
			icon: AlertTriangle,
			iconClass: "text-amber-500 dark:text-amber-400",
			confirmVariant: "primary" as const,
		},
	};

	const config = $derived(variantConfig[variant]);

	function handleCancel() {
		open = false;
		oncancel?.();
	}

	async function handleConfirm() {
		try {
			await onconfirm?.();
			open = false;
		} catch (error) {
			console.error("Confirm action failed:", error);
		}
	}
</script>

<Dialog bind:open {title}>
	<GlassCard variant="frosted" class="max-w-md">
		<div class="flex items-start gap-4 p-4">
			<div
				class={cn(
					"flex-shrink-0 p-3 rounded-full",
					variant === "danger" && "bg-red-100 dark:bg-red-900/30",
					variant === "warning" && "bg-amber-100 dark:bg-amber-900/30",
					variant === "default" && "bg-accent/10 dark:bg-accent/20",
				)}
			>
				<config.icon class={cn("w-6 h-6", config.iconClass)} />
			</div>
			<div class="flex-1 min-w-0">
				<p class="text-sm text-muted-foreground leading-relaxed">
					{message}
				</p>
				{#if children}
					<div class="mt-2">
						{@render children()}
					</div>
				{/if}
			</div>
		</div>

		{#snippet footer()}
			<div class="flex justify-end gap-3">
				<Button variant="ghost" onclick={handleCancel} disabled={loading}>
					{cancelLabel}
				</Button>
				<Button variant={config.confirmVariant} onclick={handleConfirm} disabled={loading}>
					{#if loading}
						<span class="inline-flex items-center gap-2">
							<span
								class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
							></span>
							Processing...
						</span>
					{:else}
						{confirmLabel}
					{/if}
				</Button>
			</div>
		{/snippet}
	</GlassCard>
</Dialog>
```

**Key Benefits:**

- Reuses Dialog's overlay, focus management, escape-to-close
- Uses GlassCard for consistent styling
- Custom focus trapping added on top

---

## Phase 4: Glass Components Review (Case-by-Case)

### 4.1 GlassCard

**Current:** Completely custom, no shadcn.

**Analysis:** Could potentially extend Card, but Card already has specific styling that GlassCard's glass aesthetics would need to override entirely.

**Decision:** Keep as custom. It's not "Card with glass styling" - it's a completely different design language.

**Action:** Add documentation explaining why GlassCard remains custom.

---

### 4.2 GlassOverlay

**Current:** Custom overlay with variants.

**Analysis:** Could extend Sheet's overlay styling, but GlassOverlay has specific intensity/blur variants that Sheet doesn't expose.

**Decision:** Keep as custom, but import cn from canonical location.

**Action:** None - already follows good patterns.

---

### 4.3 GlassNavbar

**Current:** Custom navigation component.

**Analysis:** Not related to any shadcn primitive - it's a unique Grove component for branding/navigation.

**Decision:** Keep as custom. No shadcn equivalent.

**Action:** None.

---

### 4.4 GlassCarousel

**Current:** Custom carousel implementation.

**Analysis:** Shadcn doesn't have a carousel primitive. This is a complex UI component requiring custom logic.

**Decision:** Keep as custom.

**Action:** None.

---

### 4.5 GlassLegend

**Current:** Custom icon legend component.

**Analysis:** Not related to any shadcn primitive.

**Decision:** Keep as custom.

**Action:** None.

---

### 4.6 GlassStatusWidget

**Current:** Custom status indicator component.

**Analysis:** Not related to any shadcn primitive.

**Decision:** Keep as custom.

**Action:** None.

---

## Implementation Checklist

### Phase 1: Foundation

- [ ] Consolidate cn utility to `$lib/utils/cn.ts`
- [ ] Update `$lib/ui/utils/cn.ts` to re-export canonical cn
- [ ] Update imports in GlassButton.svelte
- [ ] Update imports in GlassCard.svelte
- [ ] Update imports in GlassOverlay.svelte
- [ ] Update imports in GlassConfirmDialog.svelte
- [ ] Update imports in GlassNavbar.svelte
- [ ] Update imports in GlassStatusWidget.svelte
- [ ] Update imports in GlassLegend.svelte
- [ ] Update imports in GlassCarousel.svelte
- [ ] Fix components.json path: `$lib/components/ui` → `$lib/ui/components/ui`

### Phase 2: TypeScript Fixes

- [ ] Remove `@ts-nocheck` from Input.svelte
- [ ] Fix file type handling conflict
- [ ] Remove `@ts-nocheck` from Select.svelte
- [ ] Properly type single-select wrapper
- [ ] Remove `@ts-nocheck` from Accordion.svelte
- [ ] Handle collapsible prop type assertion
- [ ] Verify TypeScript compilation passes

### Phase 3: Core Components

- [ ] Refactor GlassButton to extend Button
- [ ] Map glass variants to Button variants
- [ ] Reuse Button's polymorphic rendering
- [ ] Refactor GlassConfirmDialog to use Dialog + GlassCard
- [ ] Implement custom focus trapping on top of Dialog
- [ ] Update Toast imports if needed (toast uses Dialog)
- [ ] Run existing tests to verify behavior
- [ ] Update UI_VERSION to 0.3.0 in index.ts

### Phase 4: Glass Components

- [ ] Add documentation to GlassCard explaining custom status
- [ ] Verify all glass components import from canonical cn
- [ ] No changes to GlassOverlay, GlassNavbar, GlassCarousel, GlassLegend, GlassStatusWidget

### Post-Migration

- [ ] Run TypeScript check: `pnpm -F packages/engine typecheck`
- [ ] Run lint: `pnpm -F packages/engine lint`
- [ ] Run tests: `pnpm -F packages/engine test`
- [ ] Verify no runtime regressions in admin panel
- [ ] Verify no runtime regressions in vineyard page

---

## Technical Considerations

### Backward Compatibility

All public APIs remain unchanged:

- `import { Button, GlassButton, Dialog } from '$lib/ui/components/ui'` still works
- Component props and behavior preserved
- Only internal implementation changes

### Bundle Size Impact

**Expected reduction:**

- GlassButton: Saves ~80 lines of duplicate variant logic
- GlassConfirmDialog: Saves ~100 lines of duplicate dialog infrastructure
- cn consolidation: No change, just relocation

**Total estimated reduction:** ~2-3KB minified

### Testing Strategy

1. **Visual regression tests:** GlassButton, GlassConfirmDialog, GlassCard
2. **Interaction tests:** Dialog open/close, focus management
3. **Type checking:** Full TypeScript compilation

---

## Design Decisions (Resolved)

| Question                         | Decision                                                                   |
| -------------------------------- | -------------------------------------------------------------------------- |
| **cn utility location**          | Keep `$lib/utils/cn.ts` as canonical, re-export from `$lib/ui/utils/cn.ts` |
| **GlassButton approach**         | Extends Button with glass variants, doesn't duplicate variant logic        |
| **GlassConfirmDialog approach**  | Wraps Dialog + GlassCard + custom focus trapping                           |
| **Remaining Glass\* components** | Keep custom, document reasoning                                            |
| **Version bump**                 | 0.2.0 → 0.3.0 (minor, internal changes)                                    |
| **TypeScript suppressions**      | Remove all 6, fix underlying issues                                        |

---

## Timeline Estimate

| Phase     | Scope                               | Estimate     |
| --------- | ----------------------------------- | ------------ |
| Phase 1   | cn consolidation + path fix         | 2-3 hours    |
| Phase 2   | TypeScript fixes (3 components)     | 4-6 hours    |
| Phase 3   | GlassButton + GlassConfirmDialog    | 1 day        |
| Phase 4   | Glass\* review + documentation      | 2-3 hours    |
| Testing   | TypeScript, lint, visual regression | 4 hours      |
| **Total** |                                     | **2-3 days** |

---

## Files Affected

### Directly Modified

```
libs/engine/src/lib/utils/cn.ts              (canonical)
libs/engine/src/lib/ui/utils/cn.ts          (re-export)
libs/engine/components.json                  (path fix)
libs/engine/src/lib/ui/components/ui/Input.svelte
libs/engine/src/lib/ui/components/ui/Select.svelte
libs/engine/src/lib/ui/components/ui/Accordion.svelte
libs/engine/src/lib/ui/components/ui/GlassButton.svelte
libs/engine/src/lib/ui/components/ui/GlassConfirmDialog.svelte
libs/engine/src/lib/ui/components/ui/index.ts  (version bump)
```

### Indirectly Updated (imports)

All files importing cn from `$lib/ui/utils/cn` are unaffected but benefit from consolidation.

---

## Next Steps

1. ~~Create this plan~~ — **Done**
2. Create GitHub issues for each phase
3. Begin Phase 1: cn utility consolidation
4. Proceed through phases sequentially
5. Document learnings for future component architecture decisions

---

_This plan ensures the UI architecture is maintainable while preserving all public APIs and Grove's unique glassmorphism aesthetic._
