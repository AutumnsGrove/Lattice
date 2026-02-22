# Phase 2: Consolidate Token Systems (Elephant Build)
## Issue #660 - Token System Unification

---

## 🐘 TRUMPET: The Vision

**Goal:** Consolidate three competing token systems into one unified, maintainable system.

**Current State:**
1. ✅ `lib/styles/tokens.css` - Flattened semantic tokens (PHASE 1 COMPLETE)
2. ❌ `lib/ui/styles/tokens.css` - Duplicate Grove palette (needs removal)
3. ❌ `lib/ui/styles/grove.css` - Component styles (needs assessment)
4. ❌ `tailwind.preset.js` - Has Grove colors but hardcoded hex values
5. ❌ Components - 121+ hardcoded hex values in admin routes alone

**Target State:**
- Single source: `lib/styles/tokens.css` (flattened semantic + primitive tokens)
- Tailwind preset references CSS variables, not hardcoded hex
- Zero hardcoded colors in component files
- All colors theme-aware (light/dark mode)

---

## 📦 GATHER: Materials Inventory

### Files to Modify (13)

**Token System (3 files):**
1. `libs/engine/src/lib/styles/tokens.css` - Add primitive Grove palette
2. `libs/engine/src/lib/ui/tailwind.preset.js` - Reference CSS vars instead of hex
3. `libs/engine/tailwind.config.js` - Ensure proper variable mapping

**Component Styles (10 files - highest impact):**
These have the most hardcoded colors:
1. `libs/engine/src/routes/admin/images/+page.svelte` (17 hex colors)
2. `libs/engine/src/routes/admin/blog/new/+page.svelte`
3. `libs/engine/src/routes/admin/blog/edit/[slug]/+page.svelte`
4. `libs/engine/src/routes/admin/pages/+page.svelte`
5. `libs/engine/src/lib/components/admin/MarkdownEditor.svelte`
6. `libs/engine/src/routes/(apps)/domains/+page.svelte` (syntax highlighting colors)
7. `libs/engine/src/routes/blog/[slug]/+page.svelte`
8. `libs/engine/src/routes/+error.svelte`
9. `libs/engine/src/routes/+layout.svelte`
10. `libs/engine/src/routes/+page.svelte`

### Files to Delete (2)
1. `libs/engine/src/lib/ui/styles/tokens.css` - Duplicate of tailwind.preset.js colors
2. `libs/engine/src/lib/ui/styles/grove.css` - Assess if any unique styles needed

---

## 🏗️ BUILD: Construction Sequence

### Stage 1: Unify Primitive Tokens
**Goal:** Move Grove palette from tailwind.preset.js to tokens.css

1. Add primitive color tokens to `lib/styles/tokens.css`:
   ```css
   /* Grove palette (light mode) */
   --grove-50: #f0fdf4;
   --grove-100: #dcfce7;
   ... etc (already exists in lib/ui/styles/tokens.css)
   
   /* Dark mode overrides */
   .dark {
     /* Any dark mode primitive overrides */
   }
   ```

2. Update `tailwind.preset.js` to use CSS custom properties:
   ```javascript
   colors: {
     grove: {
       50: "var(--grove-50)",
       100: "var(--grove-100)",
       // etc
     }
   }
   ```

### Stage 2: Replace Hardcoded Colors (Admin Routes Priority)
**Goal:** Replace hex values with semantic tokens

Priority order (by hex count):
1. `admin/images/+page.svelte` - 17 colors
2. `admin/blog/edit/[slug]/+page.svelte` - high complexity
3. `admin/blog/new/+page.svelte` - likely similar to edit
4. Remaining admin routes
5. Non-admin routes

Mapping strategy:
- `#2c5f2d` → `var(--color-primary)` or `text-grove-600`
- `#666`, `#888` → `var(--color-text-muted)` or `text-muted-foreground`
- `#fafafa`, `#f5f5f5` → `var(--color-bg-secondary)` or `bg-secondary`

### Stage 3: Cleanup
1. Delete `lib/ui/styles/tokens.css`
2. Delete or merge `lib/ui/styles/grove.css`
3. Update imports
4. Test dark mode toggle

---

## ✅ TEST: Validation Checklist

- [ ] All type checks pass (`npm run typecheck` in engine)
- [ ] No visual regressions in light mode
- [ ] No visual regressions in dark mode
- [ ] Admin dashboard colors consistent
- [ ] Blog pages render correctly
- [ ] No console errors about undefined CSS variables

---

## 🎉 CELEBRATE: Definition of Done

- Single `tokens.css` file with all primitive + semantic tokens
- Tailwind preset references CSS variables
- Zero `#[0-9a-f]{6}` in admin route components
- Dark mode works without `:global(.dark)` hacks
- Issue #660 marked complete
