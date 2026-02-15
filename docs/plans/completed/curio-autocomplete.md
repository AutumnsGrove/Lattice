# Curio Directive Autocomplete in MarkdownEditor

## Context

Curio directives (`::guestbook::`, `::poll[id]::`, etc.) are powerful but invisible — users have to memorize names or check the KB article every time. This plan adds a `::` trigger autocomplete dropdown to the MarkdownEditor, showing all available curios with their configuration status. Typing `::` opens the menu, typing more filters it, arrow keys + Enter selects, and the directive gets inserted.

---

## Architecture

```
User types :: -> oninput detects trigger -> dropdown opens
                                            |
                        Shows curio list with configured/unconfigured status
                                            |
                    Typing filters (::gue -> guestbook), arrows navigate
                                            |
                      Enter/click -> inserts ::name:: at cursor -> dropdown closes
```

### Data Flow

1. **Curio metadata** (names, icons, requiresArg) lives as a constant in `markdown-directives.ts` -- single source of truth
2. **Curio status** (configured or not) loaded server-side via shared utility, passed through page data -> MarkdownEditor prop
3. **Autocomplete component** is a new Svelte component rendered inside the editor wrapper

---

## Step 1: Curio Metadata Constant

**File:** `packages/engine/src/lib/utils/markdown-directives.ts`

Added `CURIO_METADATA` array alongside existing `CURIO_DIRECTIVES` with `id`, `name`, `requiresArg`, and optional `system` flag.

## Step 2: Shared Server Utility for Curio Status

**Created:** `packages/engine/src/lib/server/curio-status.ts`

Extracted `queryEnabled()` / `queryExists()` helpers from `arbor/pages/+page.server.ts` into a reusable `loadCurioStatus()` function. Refactored `arbor/pages/+page.server.ts` to import from this utility.

## Step 3: Pass Curio Status to Editor Pages

**Modified server files:**

- `arbor/garden/edit/[slug]/+page.server.ts` -- added `loadCurioStatus()` call
- `arbor/garden/new/+page.server.ts` -- **created** with curio status loading
- `arbor/pages/edit/[slug]/+page.server.ts` -- added `loadCurioStatus()` call

**Threaded prop through svelte files:**

- `arbor/garden/edit/[slug]/+page.svelte` -- `configuredCurios={data?.curios ?? []}`
- `arbor/garden/new/+page.svelte` -- `configuredCurios={data?.curios ?? []}`
- `arbor/pages/edit/[slug]/+page.svelte` -- `configuredCurios={data?.curios ?? []}`

## Step 4: Autocomplete Component

**Created:** `packages/engine/src/lib/components/admin/CurioAutocomplete.svelte`

Standalone dropdown with glassmorphism styling, keyboard navigation, filtering, and configured/unconfigured status dots.

## Step 5: Wire Autocomplete into MarkdownEditor

**Modified:** `packages/engine/src/lib/components/admin/MarkdownEditor.svelte`

- Added `configuredCurios` prop
- `::` trigger detection via `checkCurioTrigger()` in oninput
- Position calculation from cursor line/column
- Keyboard interception (Arrow/Enter/Tab/Escape) when autocomplete is open
- Selection handler that replaces trigger text with full directive

---

## Files Changed (Summary)

| File                                                  | Change                                   |
| ----------------------------------------------------- | ---------------------------------------- |
| `src/lib/utils/markdown-directives.ts`                | Add `CURIO_METADATA` export              |
| `src/lib/server/curio-status.ts`                      | **New** -- shared curio status loader    |
| `src/routes/arbor/pages/+page.server.ts`              | Refactor to use shared utility           |
| `src/routes/arbor/garden/edit/[slug]/+page.server.ts` | Load curio status                        |
| `src/routes/arbor/garden/new/+page.server.ts`         | **New** -- load curio status             |
| `src/routes/arbor/pages/edit/[slug]/+page.server.ts`  | Load curio status                        |
| `src/routes/arbor/garden/edit/[slug]/+page.svelte`    | Pass `configuredCurios` prop             |
| `src/routes/arbor/garden/new/+page.svelte`            | Pass `configuredCurios` prop             |
| `src/routes/arbor/pages/edit/[slug]/+page.svelte`     | Pass `configuredCurios` prop             |
| `src/lib/components/admin/CurioAutocomplete.svelte`   | **New** -- dropdown component            |
| `src/lib/components/admin/MarkdownEditor.svelte`      | Add prop, trigger, positioning, keyboard |

---

## Verification

1. Open any editor page (garden/edit, garden/new, pages/edit)
2. Type `::` -- autocomplete dropdown should appear
3. Type `gue` -- should filter to "Guestbook"
4. Arrow down to an item, press Enter -- directive inserted
5. Verify configured curios show green dot, unconfigured show gray
6. Type `::poll` -> select -> cursor lands between `[]` in `::poll[]::`
7. Press Escape -- dropdown closes without inserting
8. Click outside -- dropdown closes
9. Verify existing keyboard shortcuts (Cmd+S, Tab indent, Cmd+B bold) still work when autocomplete is closed
10. `pnpm test` -- existing directive tests still pass
11. `npx svelte-check` -- no type errors
