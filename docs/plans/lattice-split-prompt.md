# Lattice Split — Execution Prompt

Paste this entire prompt into a fresh Claude Code session to execute the Lattice Split.

---

## The Prompt

You are executing the Lattice Split — a major architectural refactor of the Grove monorepo. Your job is to be a **conductor**: you orchestrate the work, dispatch subagents to do the actual file editing, run verification between phases, and create the final PR. You should NOT do file edits yourself. Delegate all code changes to subagents.

**READ THESE SPECS FIRST before doing anything else:**
- `docs/specs/lattice-split-spec.md` — the execution plan (Phase 0-3)
- `docs/specs/aspen-spec.md` — what the Aspen Worker will be
- `AGENT.md` — project rules

**IMPORTANT RULES:**
- Work in a **git worktree** on a branch called `feat/lattice-split`
- **Never edit files yourself.** Always dispatch a subagent (haiku-coder, sonnet-coder, or bear-migrate skill)
- Run `gw ci --affected` after each major step to catch breakage early
- If a subagent's work breaks the build, fix it with another subagent before moving on
- The end result is **one PR** containing all changes

---

## Step 0: Setup

1. Create a worktree: `git worktree add ../lattice-split-worktree -b feat/lattice-split`
2. `cd ../lattice-split-worktree`
3. `pnpm install`
4. Read both specs (`docs/specs/lattice-split-spec.md` and `docs/specs/aspen-spec.md`) to load full context
5. Run `gw ci` to confirm the repo is green before starting

---

## Step 1: Phase 0 — PR 1 work (Type Extractions + Cleanup)

These are the safest surgeries. Extract cross-layer types and remove dead re-exports. ~14 files.

### S4: Extract Friend type
Dispatch a **haiku-coder** agent:
> Create `libs/engine/src/lib/types/friend.ts` containing the `Friend` interface (currently defined in `libs/engine/src/lib/server/services/friends.ts` — read it first to get the exact type). Export it. Then update these 4 files to import `Friend` from `$lib/types/friend` instead of `$lib/server/services/friends`:
> - `libs/engine/src/lib/ui/stores/friends.svelte.ts`
> - `libs/engine/src/lib/ui/components/chrome/FriendsLoader.svelte`
> - `libs/engine/src/lib/ui/components/chrome/lantern/LanternFriendCard.svelte`
> - `libs/engine/src/lib/ui/components/chrome/lantern/LanternAddFriends.svelte`
> Keep the original `Friend` type in `server/services/friends.ts` but change it to re-export from the new location so nothing else breaks.

### S9: Extract Petal types
Dispatch a **haiku-coder** agent (can run in parallel with S4):
> Create `libs/engine/src/lib/types/petal.ts` containing `PetalCategory` and `PetalProviderConfig` (currently in `libs/engine/src/lib/server/petal/types.ts` — read it first). Then update `libs/engine/src/lib/config/petal.ts` to import from `$lib/types/petal` instead of `$lib/server/petal/types.js`. Keep the original types in server and re-export from the new location.

### S10: Extract Chat WS types
Dispatch a **sonnet-coder** agent (can run in parallel with S4 and S9):
> Read `libs/engine/src/lib/server/services/chat.types.ts` to understand ALL the chat protocol types. Create `libs/engine/src/lib/types/chat.ts` containing the WebSocket protocol types that `ui/` imports: `ChatWSClientMessage`, `ChatWSServerMessage`, `ChatWSClientSendMessage`, `ChatWSClientTyping`, `ChatWSClientRead`, `ChatWSServerIncomingMessage`, `ChatWSServerMessageAck`, `ChatWSServerTyping`, `ChatWSServerRead`, `ChatWSServerError`, `ChatMessageData`, `ChatContentType`, `ChatImageMetadata`, `ChatConversationWithMeta`. Then update these 3 files to import from `$lib/types/chat` instead of `$lib/server/services/chat.types.js`:
> - `libs/engine/src/lib/ui/chat/types.ts`
> - `libs/engine/src/lib/ui/chat/connection.svelte.ts`
> - `libs/engine/src/lib/ui/stores/chat.svelte.ts`
> Keep the original types in server and re-export from the new location. Be careful: some of these types may depend on other types in the same file. Include all necessary type dependencies.

### S5: Remove rehype-groveterm hardcoded import
Dispatch a **haiku-coder** agent:
> In `libs/engine/src/lib/utils/rehype-groveterm.ts`, remove the module-level `import manifestData from "$lib/data/grove-term-manifest.json"` (around line 27) and the `const manifest = manifestData as GroveTermManifest;` line. The `RehypeGroveTermOptions` interface already has an optional `manifest` field. Change it to required. Update the internal logic so that if no manifest is provided, it throws a clear error instead of silently using a default. Also update `libs/engine/src/lib/utils/index.ts` if it re-exports anything that now needs the manifest parameter. Check if any non-test files call `rehypeGroveTerm()` or `processGroveTerms()` without passing a manifest — if so, update them to pass the manifest from `$lib/data/grove-term-manifest.json` at the call site.

### S8: Remove heartwood re-exports from index.ts
Dispatch a **haiku-coder** agent:
> In `libs/engine/src/lib/index.ts`, remove lines 75-119 (the heartwood re-exports section). These exports have zero external consumers — everything imports through `@autumnsgrove/lattice/heartwood` subpath instead. Read the file first to confirm the exact line range. Remove the imports AND the export statements. Do not touch anything else in the file.

**VERIFY:** After all 5 subagents complete:
```bash
cd libs/engine && bun svelte-check
pnpm --filter @autumnsgrove/lattice run build:package
gw ci --affected
```

If anything fails, dispatch a haiku-coder to fix the specific issue.

---

## Step 2: Phase 0 — PR 2 work (Domain Component Moves)

The big one. ~97 files moving from `ui/` to their domain directories. Run these sequentially because they touch overlapping barrels.

### S1: Move Blaze.svelte to blazes/
Dispatch a **sonnet-coder** agent:
> **Migration: Move Blaze.svelte from ui/ to blazes/**
>
> 1. Read `libs/engine/src/lib/ui/components/indicators/Blaze.svelte` and `libs/engine/src/lib/ui/components/indicators/index.ts`
> 2. Create directory `libs/engine/src/lib/blazes/components/`
> 3. Move `Blaze.svelte` to `libs/engine/src/lib/blazes/components/Blaze.svelte` (write the file, keep content identical)
> 4. Create `libs/engine/src/lib/blazes/components/index.ts` with `export { default as Blaze } from "./Blaze.svelte";`
> 5. Remove the `Blaze` export line from `libs/engine/src/lib/ui/components/indicators/index.ts`
> 6. Delete the old `libs/engine/src/lib/ui/components/indicators/Blaze.svelte`
> 7. Update these 6 engine route files to import from `$lib/blazes/components` instead of `$lib/ui/components/indicators`:
>    - `libs/engine/src/routes/garden/[slug]/+page.svelte`
>    - `libs/engine/src/routes/garden/+page.svelte`
>    - `libs/engine/src/routes/arbor/settings/+page.svelte`
>    - `libs/engine/src/routes/arbor/garden/+page.svelte`
>    - `libs/engine/src/routes/arbor/garden/edit/[slug]/+page.svelte`
>    - `libs/engine/src/routes/arbor/garden/new/+page.svelte`
> 8. Update these 3 meadow files to import from `@autumnsgrove/lattice/blazes/components` instead of `@autumnsgrove/lattice/ui/indicators`:
>    - `apps/meadow/src/routes/feed/[id]/+page.svelte`
>    - `apps/meadow/src/lib/components/PostCard.svelte`
>    - `apps/meadow/src/lib/components/ComposeBox.svelte`
> 9. Add to `libs/engine/package.json` exports: `"./blazes/components"` entry with svelte and types pointing to `dist/blazes/components/index.js` and `dist/blazes/components/index.d.ts` (match the pattern of existing exports)
>
> Read each file before editing. Verify import paths are correct.

**VERIFY after S1:** `cd libs/engine && bun svelte-check`

### S2: Move groveterm/ to components/terminology/
Dispatch a **sonnet-coder** agent:
> **Migration: Move groveterm components from ui/ to components/terminology/**
>
> 1. Read all files in `libs/engine/src/lib/ui/components/ui/groveterm/` (GroveTerm.svelte, GroveTermPopup.svelte, GroveText.svelte, types.ts, index.ts, groveterm.test.ts)
> 2. Create `libs/engine/src/lib/components/terminology/`
> 3. Write all 6 files to the new location with identical content
> 4. Delete the old `libs/engine/src/lib/ui/components/ui/groveterm/` directory (delete each file)
> 5. Remove the groveterm exports from `libs/engine/src/lib/ui/components/ui/index.ts` (around lines 82-86, the GroveTerm/GroveTermPopup/GroveText/GroveTermCategory exports)
> 6. Search for ALL files that import from `$lib/ui/components/ui/groveterm` or import GroveTerm/GroveText/GroveTermPopup from `$lib/ui` barrel — update them to import from `$lib/components/terminology` instead
> 7. Also search for any `@autumnsgrove/lattice/ui` imports of GroveTerm — though none are expected
>
> IMPORTANT: There are ~26 consumer files. Use Grep to find every one. Do not guess — search for "GroveTerm", "GroveText", "GroveTermPopup", "groveterm" across the entire `libs/engine/src/` directory. Update every import you find.

### S2b: Move Header/Footer/MobileMenu to components/chrome/
Dispatch a **haiku-coder** agent (after S2 completes):
> **Migration: Move chrome components from ui/ to components/chrome/**
>
> 1. Read Header.svelte, Footer.svelte, MobileMenu.svelte from `libs/engine/src/lib/ui/components/chrome/`
> 2. Note: `libs/engine/src/lib/components/` already exists. Check if `components/chrome/` exists — if not, it needs creating
> 3. Write all 3 files to `libs/engine/src/lib/components/chrome/` with identical content
> 4. Delete the originals from `libs/engine/src/lib/ui/components/chrome/` (just these 3 files — leave other chrome components like Lantern etc. in ui/)
> 5. Update the barrel at `libs/engine/src/lib/ui/components/chrome/index.ts` to remove Header, Footer, MobileMenu exports
> 6. Find all files importing Header, Footer, or MobileMenu from `$lib/ui/components/chrome` — update to `$lib/components/chrome`. There should be ~3 consumers (check `+layout.svelte`, `+page.svelte`, and `lantern.svelte.ts`)

**VERIFY after S2+S2b:** `cd libs/engine && bun svelte-check`

### S3: Move curio UI components to curios/ domain
This is the biggest single surgery (39 files). Use **bear-migrate** skill:
> /bear-migrate
>
> **What's migrating:** 39 Svelte component files from `libs/engine/src/lib/ui/components/content/curios/` to `libs/engine/src/lib/curios/components/`
>
> **Source:** `libs/engine/src/lib/ui/components/content/curios/` (13 main curio components + `artifacts/` subdirectory with 24 files + index.ts)
>
> **Destination:** `libs/engine/src/lib/curios/components/` (new directory, within the existing curios domain module)
>
> **What changes in each file:** Nothing in the component code itself. The imports within these components use `$lib/curios/...` which will still work (they'll be closer to their import targets now, but `$lib` resolution doesn't change).
>
> **Consumers to update (3 files):**
> 1. `libs/engine/src/lib/components/custom/ContentWithGutter.svelte` — has a dynamic import: `` import(`$lib/ui/components/content/curios/Curio${componentName}.svelte`) `` — change to `` import(`$lib/curios/components/Curio${componentName}.svelte`) ``
> 2. `libs/engine/src/routes/arbor/curios/artifacts/+page.svelte` — update imports from `$lib/ui/components/content/curios/artifacts/...` to `$lib/curios/components/artifacts/...`
> 3. `apps/meadow/src/routes/+layout.svelte` — update CurioCursorsLayer and CurioAmbientLayer imports
>
> **Barrel to update:** Remove curios re-exports from `libs/engine/src/lib/ui/components/content/` barrel if one exists. Delete the empty `libs/engine/src/lib/ui/components/content/curios/` directory after move.
>
> **Verify:** `cd libs/engine && bun svelte-check` after the move completes.

**VERIFY after S3:**
```bash
cd libs/engine && bun svelte-check
pnpm --filter @autumnsgrove/lattice run build:package
gw ci --affected
```

---

## Step 3: Phase 0 — PR 3 work (Barrel Cleanup)

65 files import through mega-barrels (`$lib/ui`, `$lib/ui/components/ui`, etc.) instead of using direct imports. Fix them all.

Dispatch a **sonnet-coder** agent:
> **Barrel cascade cleanup**
>
> Search for all Svelte files in `libs/engine/src/` that import from these barrel paths:
> - `$lib/ui` (the mega-barrel)
> - `$lib/ui/components/ui`
> - `$lib/ui/components/ui/index`
>
> For each file found, replace the barrel import with a direct import to the specific component file. For example:
> ```
> // BEFORE (barrel)
> import { GlassCard, GlassPanel } from "$lib/ui";
>
> // AFTER (direct)
> import GlassCard from "$lib/ui/components/ui/GlassCard.svelte";
> import GlassPanel from "$lib/ui/components/ui/GlassPanel.svelte";
> ```
>
> To find the correct direct path for each component, read the barrel files to see where each component is actually defined.
>
> If a file has a comment `// barrel-ok`, skip it.
>
> Work in batches of ~15 files at a time. After each batch, report which files were updated.

NOTE: This may need multiple sonnet-coder dispatches if the context gets too large. Split into batches: route files first, then lib files.

**VERIFY:**
```bash
cd libs/engine && bun svelte-check
gw ci --affected
```

---

## Step 4: Phase 0 — PR 4 work (Final Verification)

Run the cross-layer import check yourself (conductor does this, not a subagent):

```bash
# Check: no framework module imports from domain modules
# Framework: actions, auth, config, errors, feature-flags, loom, styles, threshold, types, ui, utils
# Domain: amber, blazes, components, curios, data, db, durable-objects, email, firefly, git, grafts, heartwood, lumen, payments, reverie, scribe, sentinel, server, thorn, warden, zephyr
```

Use Grep to search for any remaining cross-layer imports in framework module directories. If any are found, dispatch a haiku-coder to fix them.

Then run full CI:
```bash
gw ci
```

---

## Step 5: Phase 1 — Create apps/aspen/ Worker Scaffold

Dispatch an **opus-coder** agent (this is architectural work):
> **Create the Aspen Worker scaffold at `apps/aspen/`**
>
> Read `docs/specs/aspen-spec.md` for the full specification. Also read `libs/engine/wrangler.toml`, `libs/engine/svelte.config.js`, and `libs/engine/package.json` to understand the current config.
>
> Create these files:
>
> 1. `apps/aspen/package.json` — name `grove-aspen`, dependencies on `@autumnsgrove/lattice` (workspace:*), `@autumnsgrove/prism` (workspace:*), `@autumnsgrove/foliage` (workspace:*), `@autumnsgrove/infra` (workspace:*). Copy devDependencies pattern from another app like `apps/landing/package.json`. Include `@sveltejs/adapter-cloudflare`.
>
> 2. `apps/aspen/svelte.config.js` — use `@sveltejs/adapter-cloudflare` in Worker mode. Read `libs/engine/svelte.config.js` for reference on prerender settings and other config.
>
> 3. `apps/aspen/tsconfig.json` — extend the monorepo base. Read another app's tsconfig for the pattern.
>
> 4. `apps/aspen/vite.config.ts` — standard SvelteKit vite config. Read another app for the pattern.
>
> 5. `apps/aspen/wrangler.toml` — Copy ALL bindings from `libs/engine/wrangler.toml`. Change the worker name to `grove-aspen`. This is critical — every D1, R2, KV, DO, service binding, and AI binding must be present. Read the aspen-spec.md binding tables to cross-reference.
>
> 6. `apps/aspen/tailwind.config.js` — scan both `./src/**` and `../../libs/engine/src/lib/**` for classes. Import preset from `@autumnsgrove/prism/tailwind`. Read another app's tailwind config for the pattern.
>
> 7. `apps/aspen/.prettierrc` and `apps/aspen/.prettierignore` — copy from another app.
>
> 8. `apps/aspen/postcss.config.js` — copy from another app.
>
> Do NOT create any route files or app-level files yet. Those come in Step 6.

**VERIFY:** `pnpm install` from root to wire the new workspace package.

---

## Step 6: Phase 2 — Move Routes and App Files

This is the big move. 291 route files + app-level files. Use **bear-migrate**:

> /bear-migrate
>
> **What's migrating:** All route files and app-level files from `libs/engine/src/` to `apps/aspen/src/`
>
> **App-level files to COPY (not move yet):**
> - `libs/engine/src/hooks.server.ts` → `apps/aspen/src/hooks.server.ts`
> - `libs/engine/src/app.html` → `apps/aspen/src/app.html`
> - `libs/engine/src/app.d.ts` → `apps/aspen/src/app.d.ts`
> - `libs/engine/src/app.css` → `apps/aspen/src/app.css`
>
> **Route files to COPY:**
> - Everything in `libs/engine/src/routes/` → `apps/aspen/src/routes/` (preserve directory structure exactly)
>
> **Import transformation rule for ALL copied files:**
> Every `$lib/` import needs to become an `@autumnsgrove/lattice/` import, because `$lib` in apps/aspen/ won't resolve to libs/engine/src/lib/ anymore.
>
> Examples:
> ```typescript
> // BEFORE (in engine, $lib = libs/engine/src/lib/)
> import { GlassCard } from "$lib/ui/components/ui/GlassCard.svelte";
> import { createDb } from "$lib/db/index.js";
> import type { Friend } from "$lib/types/friend";
>
> // AFTER (in aspen, imports from lattice package)
> import { GlassCard } from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
> import { createDb } from "@autumnsgrove/lattice/db";
> import type { Friend } from "@autumnsgrove/lattice/types/friend";
> ```
>
> **IMPORTANT exceptions:**
> - `$app/` imports stay as `$app/` (SvelteKit built-in)
> - `$env/` imports stay as `$env/` (SvelteKit built-in)
> - Relative imports (`./`, `../`) within route files pointing to other route files stay relative
> - Some route files import from route-local files like `+page.server.ts` — those stay relative
>
> **Strategy:**
> Since this is ~291 files, work in batches by directory:
> 1. First: app-level files (hooks, app.html, app.d.ts, app.css) — 4 files
> 2. Then: `routes/api/` — 144 files (biggest batch, but mostly server-side)
> 3. Then: `routes/arbor/` — 99 files
> 4. Then: `routes/garden/` + `routes/auth/` + remaining routes — ~44 files
>
> For each batch, use a sonnet-coder subagent to handle the copy + import transformation.
> After each batch, verify with: `cd apps/aspen && npx tsc --noEmit` (or svelte-check if available)
>
> **After ALL files are copied and transformed:**
> - Delete `libs/engine/src/routes/` entirely
> - Delete `libs/engine/src/hooks.server.ts`
> - Delete `libs/engine/src/app.html`, `app.d.ts`, `app.css`
> - Update `libs/engine/svelte.config.js` to remove adapter and prerender config (it's now a library-only package)

**VERIFY:**
```bash
pnpm install
cd apps/aspen && bun svelte-check
cd libs/engine && bun svelte-check
gw ci
```

---

## Step 7: Phase 3 — Final Verification

Run all checks:

```bash
# Everything builds
pnpm -r run build

# CI passes
gw ci

# Engine has no routes
ls libs/engine/src/routes/ 2>/dev/null && echo "FAIL: routes still exist" || echo "OK: no routes"

# No framework→domain cross-layer imports remain
# (use Grep to verify)

# No barrel cascade imports remain (except barrel-ok)
# (use Grep to verify)
```

If everything passes, the worktree is ready for PR creation.

---

## Step 8: Create the PR

```bash
git add -A
git commit -m "feat: the Lattice Split — engine cleanup and Aspen Worker deployment

Phase 0: Resolve 10 cross-layer dependencies in libs/engine
- Extract Friend, Petal, Chat types to types/ directory
- Move Blaze.svelte to blazes/components/
- Move groveterm to components/terminology/
- Move Header/Footer/MobileMenu to components/chrome/
- Move 39 curio UI components to curios/components/
- Remove dead heartwood re-exports from index.ts
- Remove hardcoded manifest import from rehype-groveterm
- Fix 65 barrel cascade imports

Phase 1-2: Create apps/aspen/ Cloudflare Worker
- New SvelteKit app with adapter-cloudflare (Worker mode)
- Move 291 route files from libs/engine/src/routes/
- Move hooks.server.ts, app.html, app.d.ts, app.css
- Update all route imports from \$lib/ to @autumnsgrove/lattice/
- libs/engine/ is now a pure library (no routes, no deployment)

Co-Authored-By: Claude (Grove Agent)"

git push -u origin feat/lattice-split
```

Then create the PR:
```bash
gh pr create --title "feat: the Lattice Split" --body "$(cat <<'EOF'
## Summary

- Clean up cross-layer tangles inside libs/engine (10 surgery points)
- Fix 65 barrel cascade imports
- Extract tenant-facing app into apps/aspen/ as a Cloudflare Worker
- libs/engine/ becomes a pure library (no src/routes/)

**Spec:** docs/specs/lattice-split-spec.md
**Aspen spec:** docs/specs/aspen-spec.md

## What Changed

### Phase 0: Internal Cleanup
- S1: Blaze.svelte → blazes/components/
- S2: groveterm/ → components/terminology/
- S2b: Header/Footer/MobileMenu → components/chrome/
- S3: 39 curio UI files → curios/components/
- S4: Friend type → types/friend.ts
- S5: rehype-groveterm hardcoded import removed
- S8: Dead heartwood re-exports removed from index.ts
- S9: Petal types → types/petal.ts
- S10: Chat WS types → types/chat.ts
- 65 barrel cascade imports → direct imports

### Phase 1-2: Aspen Worker
- New apps/aspen/ with full wrangler.toml bindings
- 291 route files moved from libs/engine/
- hooks.server.ts (837 lines) + app files moved
- All $lib/ imports → @autumnsgrove/lattice/ package imports

## Test plan
- [ ] `gw ci` passes
- [ ] `pnpm -r run build` succeeds
- [ ] libs/engine/ has no src/routes/
- [ ] No cross-layer imports in framework modules
- [ ] No barrel cascade imports (except barrel-ok)
- [ ] `wrangler dev` starts for apps/aspen/ (manual check)
- [ ] Tenant routing works via X-Forwarded-Host (staging check)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Return the PR URL.
