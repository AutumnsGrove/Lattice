# The Lattice Split — Developer Guide

The engine used to be two things at once: a library and a deployed app. Routes, hooks, and deployment config lived inside `libs/engine/` alongside the UI components, error framework, and database services. A library shouldn't have `src/routes/`.

Now it doesn't. The library stays in `libs/engine/`. The app moved to `apps/aspen/`.

---

## What Changed

### Before

```
libs/engine/          @autumnsgrove/lattice
├── src/lib/          Library code (UI, errors, curios, server, etc.)
├── src/routes/       291 route files (why is this in a library?)
├── src/hooks.server.ts   837 lines of auth/routing
├── src/app.html      HTML shell
└── wrangler.toml     Cloudflare deployment
```

### After

```
libs/engine/          @autumnsgrove/lattice  (pure library)
├── src/lib/          Library code — same as before
├── src/app.html      Minimal stub (keeps svelte-package happy)
├── src/app.d.ts      Type definitions (App.Locals, App.Platform)
└── svelte.config.js  No adapter, no prerender

apps/aspen/           grove-aspen  (Cloudflare Worker)
├── src/routes/       All 291 route files
├── src/hooks.server.ts   Auth, routing, CSRF, rate limiting
├── src/app.html      Grove Entrance overlay, theme detection
├── src/app.d.ts      Same types as engine (both need them)
├── src/app.css        Global styles
├── wrangler.toml     All Cloudflare bindings
└── svelte.config.js  adapter-cloudflare (Worker mode)
```

### Internal Cleanup (Phase 0)

The split also fixed cross-layer tangles inside the engine. Framework modules (`ui/`, `config/`, `utils/`) were importing from domain modules (`blazes/`, `curios/`, `server/`). Ten surgery points resolved those dependencies:

| What moved | From | To |
|------------|------|----|
| `Friend` type | `server/services/friends.ts` | `types/friend.ts` |
| `PetalCategory`, `PetalProviderConfig` | `server/petal/types.ts` | `types/petal.ts` |
| 14 Chat WS types | `server/services/chat.types.ts` | `types/chat.ts` |
| `Blaze.svelte` | `ui/components/indicators/` | `blazes/components/` |
| GroveTerm (6 files) | `ui/components/ui/groveterm/` | `components/terminology/` |
| Header, Footer, MobileMenu | `ui/components/chrome/` | `components/chrome/` |
| 39 curio UI components | `ui/components/content/curios/` | `curios/components/` |

The original types still re-export from their old locations, so nothing outside the engine breaks.

---

## How Aspen Works

Aspen is a SvelteKit app deployed as a Cloudflare Worker. When someone visits `autumn.grove.place`, the `grove-router` Worker sends the request to Aspen via `X-Forwarded-Host`.

Aspen handles everything a tenant interacts with: the public site, the admin panel (arbor), all API endpoints, auth flows, and the real-time chat.

### Route Groups

| Directory | Files | What it does |
|-----------|-------|-------------|
| `routes/api/` | 144 | REST endpoints (blooms, curios, images, chat, etc.) |
| `routes/arbor/` | 99 | Admin panel (settings, garden, analytics, curios) |
| `routes/garden/` | ~8 | Public blog content and search |
| `routes/auth/` | ~6 | Login, callback, logout, magic link |
| `routes/(site)/` | varies | Public curio pages (gallery, guestbook, timeline) |
| `routes/(tenant)/` | varies | Auth-gated layout |

### Bindings

Aspen connects to the same infrastructure the engine used. All bindings are in `apps/aspen/wrangler.toml`:

- **D1:** `DB` (grove-engine-db), `CURIO_DB` (grove-curios-db)
- **R2:** `IMAGES`, `EXPORTS_BUCKET`, `IMAGES_SOURCE`
- **KV:** `CACHE_KV`, `FLAGS_KV`
- **DOs:** TENANTS, POST_META, POST_CONTENT, SENTINEL, EXPORTS, THRESHOLD, CHAT
- **Services:** AUTH (Heartwood), ZEPHYR (email), REVERIE (AI config)
- **AI:** Workers AI for Petal image moderation

### Import Pattern

Route files in Aspen import from the engine as a package:

```typescript
// In apps/aspen/ — imports from the lattice package
import { API_ERRORS, throwGroveError } from "@autumnsgrove/lattice/errors";
import Button from "@autumnsgrove/lattice/ui/components/ui/Button.svelte";
import { createDb } from "@autumnsgrove/lattice/db";
```

`$app/` and `$env/` imports work normally (SvelteKit builtins). Relative imports between route files (`./utils.ts`, `+page.server.ts`) also work as expected.

---

## Local Development

### Running Aspen

```bash
# From the monorepo root
cd apps/aspen

# Start the dev server (uses wrangler for local D1/KV/R2 bindings)
pnpm dev

# Or with wrangler directly for full binding simulation
wrangler dev
```

Local tenant routing uses the `?subdomain=` query parameter:

```
http://localhost:5173/?subdomain=midnight-bloom     # Home page
http://localhost:5173/garden?subdomain=midnight-bloom  # Blog
http://localhost:5173/arbor?subdomain=midnight-bloom    # Admin
```

### Building the Engine

If you change library code in `libs/engine/src/lib/`, Aspen picks it up automatically during `vite dev` (workspace resolution). For production builds or type-checking:

```bash
# Build the engine as a library package
pnpm --filter @autumnsgrove/lattice run build:package

# Type-check the engine
cd libs/engine && bun svelte-check

# Type-check Aspen
cd apps/aspen && bun svelte-check
```

### Running CI

```bash
# Check everything affected by your changes
gw ci --affected

# Full CI (all packages)
gw ci
```

---

## The Engine as a Library

`libs/engine/` is now a pure library. It has no routes, no hooks, no deployment config. It exists so that `apps/aspen/`, `apps/meadow/`, `apps/landing/`, and other apps can import from `@autumnsgrove/lattice`.

### What's in the Engine

| Directory | Purpose | Import path |
|-----------|---------|-------------|
| `src/lib/ui/` | UI components, stores, styles | `@autumnsgrove/lattice/ui/*` |
| `src/lib/errors/` | Signpost error framework | `@autumnsgrove/lattice/errors` |
| `src/lib/server/` | Database services, auth helpers | `@autumnsgrove/lattice/server/*` |
| `src/lib/curios/` | Curio widget logic + components | `@autumnsgrove/lattice/curios/*` |
| `src/lib/heartwood/` | Auth client | `@autumnsgrove/lattice/heartwood` |
| `src/lib/threshold/` | Rate limiting | `@autumnsgrove/lattice/threshold/*` |
| `src/lib/blazes/` | Content markers | `@autumnsgrove/lattice/blazes/*` |
| `src/lib/types/` | Shared types (Friend, Petal, Chat) | `@autumnsgrove/lattice/types/*` |
| `src/lib/components/` | Domain components (terminology, chrome) | `@autumnsgrove/lattice/components/*` |
| `src/lib/config/` | Tiers, petal config | `@autumnsgrove/lattice/config/*` |
| `src/lib/utils/` | Markdown, CSRF, sanitization | `@autumnsgrove/lattice/utils/*` |

### What the Engine Doesn't Have

- No `src/routes/` directory
- No `hooks.server.ts`
- No `app.css`
- No Cloudflare adapter in `svelte.config.js`
- No `wrangler.toml` deployment config (the existing one is for local dev bindings only)

The engine still has `src/app.html` (a minimal stub that `svelte-package` requires) and `src/app.d.ts` (type definitions for `App.Locals` and `App.Platform` that library code references).

### Adding New Exports

When you add something to the engine that Aspen or other apps need:

1. Write the code in `libs/engine/src/lib/your-module/`
2. Add the export to `libs/engine/package.json` under `"exports"`
3. Import it in the consuming app as `@autumnsgrove/lattice/your-module`

The engine's `package.json` has explicit export entries for every importable path. If a path isn't listed there, it won't resolve from consuming apps.

---

## Module Layers

The engine has two layers. Framework modules are general-purpose. Domain modules contain business logic. Framework modules should not import from domain modules.

**Framework:** `actions`, `auth`, `config`, `errors`, `feature-flags`, `loom`, `styles`, `threshold`, `types`, `ui`, `utils`

**Domain:** `amber`, `blazes`, `components`, `curios`, `db`, `durable-objects`, `email`, `firefly`, `git`, `grafts`, `heartwood`, `lumen`, `payments`, `reverie`, `scribe`, `sentinel`, `server`, `thorn`, `warden`, `zephyr`

Domain modules can import from framework modules and from each other. Framework modules only import from other framework modules.

---

## Deployment

Aspen deploys as a Cloudflare Worker named `grove-aspen`.

```bash
# Deploy secrets (first time only, or when adding new ones)
gw secret apply --worker grove-aspen

# Deploy the worker
cd apps/aspen && pnpm run deploy
```

The `grove-router` Worker sends unmatched subdomains to Aspen as the default fallback. Other apps (landing, plant, meadow) handle their reserved subdomains.

---

*The lattice stays whole. The aspen finds its own light.*
