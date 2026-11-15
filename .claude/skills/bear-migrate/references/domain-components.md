# Domain Guide: Components — Bear Migrate Reference

Component API migrations, prop changes, import rewrites, and framework upgrade patterns for Svelte/SvelteKit codebases.

---

## Preservation (WAKE)

```bash
# Always branch before a component migration
git branch bear/migrate-component-name
git checkout bear/migrate-component-name

# Snapshot current type-check and test state
cd libs/engine && bun svelte-check 2>&1 | tail -5
gw ci --affected
```

The "backup" for component migrations is the git branch. If the migration goes sideways, `git checkout main` restores everything.

---

## Inventory Patterns (GATHER)

### Find All Usages of a Component

```bash
# Find every file that imports the component
rg "import.*ComponentName"

# Find template usage (Svelte)
rg "<ComponentName"

# Find re-exports through barrels
rg "export.*ComponentName"
```

### Map the Prop Surface

```bash
# Find all props being passed
rg "ComponentName.*prop="
rg "<ComponentName" --context 5
```

### Categorize Usages

Build an inventory table:

| File | Import Style | Props Used | Needs Manual Review |
|------|-------------|------------|-------------------|
| `src/routes/+page.svelte` | Direct | `icon`, `title` | No |
| `src/lib/ui/index.ts` | Barrel re-export | N/A | Yes — barrel cascade risk |
| `src/routes/settings/+page.svelte` | Direct | `icon`, `title`, `variant` | Yes — uses deprecated `variant` |

### Count and Classify

- **Simple**: Same props, just import path changes → automated
- **Moderate**: Prop renamed or restructured → semi-automated with review
- **Complex**: API fundamentally different → manual per-file

---

## Transformation Patterns (MOVE)

### Import Path Migration

```typescript
// Old: barrel import (dangerous — barrel cascades)
import { GlassCard } from "$lib/ui";

// New: direct import
import GlassCard from "$lib/ui/components/ui/GlassCard.svelte";
```

**Strategy:** File-by-file, verify each compiles before moving to next.

### Prop Rename

```svelte
<!-- Old -->
<GlassCard variant="outlined" label="Settings">

<!-- New -->
<GlassCard glass="outlined" title="Settings">
```

**Strategy:** Use `rg` to find all usages, build a mapping, apply consistently.

### Component Replacement

When replacing one component with another entirely:

```svelte
<!-- Old: inline icon + wrapper -->
<div class="card">
  <Icon name={iconName} size={20} />
  <span>{title}</span>
</div>

<!-- New: GlassCard handles it -->
<GlassCard icon={iconName} title={title} />
```

**Strategy:** More than a find-replace — understand what the old pattern did, verify the new component covers all cases.

### Svelte 4 → 5 Gotchas

- `$derived.by()` values are plain values — access as `tags`, NOT `tags()`
- `{@const}` string literals widen to `string` — use `as const` for literal types
- Multi-rule `svelte-ignore` comments are unreliable — split each onto its own line
- Stale `svelte-ignore` comments cause lint errors — remove when no longer needed

---

## Barrel Import Safety

**Never migrate TO barrel imports.** Always migrate AWAY from them.

- `$lib/ui` (mega-barrel, ~100 modules) — barrel cascades kill hydration
- `$lib/ui/components/ui` (47+ components) — same risk
- `$lib/ui/components/nature` (40+ nature components) — same risk

**Rule:** Svelte files use direct imports. Suppress pre-commit hook with `// barrel-ok` only when justified.

---

## Verification Patterns (HIBERNATE)

### Type Check

```bash
cd libs/engine && bun svelte-check
# OR for the whole monorepo:
gw ci --affected
```

### Visual Spot Check

For UI component migrations, always visually inspect a sample:

1. Pick 3-5 representative pages that use the migrated component
2. Run dev server, navigate to each
3. Check: renders correctly, interactions work, no layout shift
4. Screenshot before/after if the change is subtle

### Unused Import Check

```bash
# After migration, verify no old imports remain
rg "import.*OldComponentName"
# Should return 0 results
```

### Bundle Size Check

```bash
# If consolidating components, verify bundle didn't grow
pnpm run build
# Compare dist/ sizes before and after
```

---

## Migration Completion Report

```markdown
## BEAR MIGRATION COMPLETE

### Migration: [Component] → [New Pattern]
- Files migrated: [count]
- Files skipped (intentional): [count] — [reason]
- Props changed: [list]

### Validation
- [x] svelte-check passes
- [x] No orphaned imports
- [x] Visual spot check (N pages)
- [x] CI passes

### Notes
- [Any edge cases or follow-up work]
```
