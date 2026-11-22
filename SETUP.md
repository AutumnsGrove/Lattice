# Development Setup

Everything you need to get Lattice running locally.

---

## Prerequisites

- **Node.js** 20+
- **pnpm** 9+ (dependency management, lockfile source of truth)
- **bun** (optional, for faster local execution)
- **Cloudflare account** (for deployment — not needed for local dev)

---

## Install

```bash
git clone https://github.com/AutumnsGrove/Lattice.git
cd Lattice
pnpm install
```

---

## The pnpm + bun Workflow

We use **pnpm for dependency management** and **bun for local execution speed**.

```bash
# DEPENDENCIES — always use pnpm (keeps lockfile in sync with CI)
pnpm install
pnpm add <package>
pnpm remove <package>

# LOCAL EXECUTION — use bun for speed (optional, 10-50x faster)
bun run dev
bun run build
bun x prettier --write .
bun x tsc --noEmit
```

**Why this works:** Bun uses the `node_modules` that pnpm creates — no separate lockfile. The `bun.lock` is gitignored; `pnpm-lock.yaml` is the source of truth for CI.

**Avoid:** `bun install` or `bun add` — these update `bun.lock` instead of `pnpm-lock.yaml`, causing drift between local and CI environments.

---

## Running Apps

The monorepo is organized into `apps/`, `libs/`, `services/`, `workers/` and `tools/`.

`libs/engine` is the framework, not a site — `cd libs/engine && pnpm dev` renders components in isolation and will not give you a blog. To see Grove working:

```bash
# Everything at once: workers, Aspen, Landing, Plant, with real D1/KV/R2
# and Durable Objects via miniflare. Prints a demo-mode login URL when ready.
./scripts/dev-stack.sh fast

# Or one app at a time, with hot reload
pnpm dev:aspen      # a tenant site + /arbor      (localhost:5173)
pnpm dev:landing    # grove.place                (localhost:5174)
pnpm dev:plant      # signup                     (localhost:5175)
pnpm dev:heartwood  # auth
```

Any app follows the same pattern: `cd apps/<name> && pnpm dev`.

### With Cloudflare Bindings

To run the engine with local D1, KV, and R2 bindings (mimics production):

```bash
cd libs/engine
pnpm dev:wrangler
```

This uses `wrangler dev` under the hood and creates local D1/KV/R2 stores automatically.

---

## Database

### D1 Databases (3 total)

The platform uses three Cloudflare D1 databases, split by domain:

| Database                 | Binding    | Tables | Migrations                                   | Content                              |
| ------------------------ | ---------- | ------ | -------------------------------------------- | ------------------------------------ |
| `grove-engine-db`        | `DB`       | ~78    | `libs/engine/migrations/*.sql`               | Core: auth, tenants, pages, billing  |
| `grove-curios-db`        | `CURIO_DB` | 45     | `libs/engine/migrations/curios/*.sql`        | Curio widgets (timeline, gallery...) |
| `grove-observability-db` | `OBS_DB`   | 16     | `libs/engine/migrations/observability/*.sql` | Sentinel + Vista monitoring          |

### Migrations

```bash
cd libs/engine

# Core database (grove-engine-db)
wrangler d1 migrations apply grove-engine-db --local    # Local
wrangler d1 migrations apply grove-engine-db --remote   # Production

# Curios database (grove-curios-db)
wrangler d1 execute grove-curios-db --local --file=migrations/curios/001_initial_schema.sql
wrangler d1 execute grove-curios-db --remote --file=migrations/curios/001_initial_schema.sql

# Observability database (grove-observability-db)
wrangler d1 execute grove-observability-db --local --file=migrations/observability/001_initial_schema.sql
wrangler d1 execute grove-observability-db --remote --file=migrations/observability/001_initial_schema.sql
```

### Creating Migrations

```bash
cd libs/engine

# Core database — uses wrangler's built-in migration system
wrangler d1 migrations create grove-engine-db "description-of-change"
```

This creates a new `.sql` file in `migrations/`. Write your SQL, then apply locally to test.

For curios or observability databases, create `.sql` files directly in their respective migration directories.

---

## Testing

All test commands run from the engine package:

```bash
cd libs/engine

pnpm test              # Run tests (Vitest, watch mode)
pnpm test:run          # Run once (CI-friendly)
pnpm test:coverage     # With coverage report
pnpm test:security     # Security test suite
pnpm test:ui           # Vitest UI (browser-based)
```

---

## Building

```bash
# Build the engine npm package
cd libs/engine
pnpm build:package

# Build any app for deployment
cd apps/<name>
pnpm build
```

---

## Stripe

Payments are processed through Stripe via the BillingHub (`billing.grove.place`) — a two-worker hub pattern mirroring the login hub.

1. Products exist in the [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Price IDs are hardcoded in `services/billing-api/src/types.ts`
3. Required secrets (applied via `gw secret apply`):
   - `STRIPE_SECRET_KEY` → `grove-billing-api`
   - `STRIPE_WEBHOOK_SECRET` → `grove-billing-api` and `grove-billing`

Full setup instructions: [`docs/setup/stripe-setup.md`](docs/setup/stripe-setup.md)

---

## Deployment

Apps auto-deploy via GitHub Actions on push to `main`. Each app's `wrangler.toml` has its resource IDs hardcoded.

Manual deployment for any package:

```bash
cd apps/<name>
pnpm build && wrangler pages deploy .svelte-kit/cloudflare --project-name <project>
```

---

## Tailwind Preset

All consumer apps **must** use the engine's shared Tailwind preset. Without it, engine component styles (custom z-index, animations, colors) won't generate correctly.

```javascript
// tailwind.config.js in any app
import grovePreset from "../../libs/engine/src/lib/ui/tailwind.preset.js";

export default {
	presets: [grovePreset],
	content: [
		"./src/**/*.{html,js,svelte,ts}",
		// REQUIRED: scan engine components for Tailwind classes
		"../../libs/engine/src/lib/**/*.{html,js,svelte,ts}",
	],
};
```

---

## Project Structure

Only tracked directories are listed — see `README.md` for what each one does.

```
Lattice/
├── apps/
│   ├── amber/             # Media storage frontend
│   ├── aspen/             # Tenant site renderer + /arbor admin
│   ├── billing/           # Plan, portal, cancel, resume
│   ├── clearing/          # Status page
│   ├── domains/           # Forage frontend (domain search)
│   ├── landing/           # grove.place
│   ├── login/             # Unified auth hub
│   └── plant/             # Signup and onboarding
├── libs/
│   ├── curios/            # Gallery, guestbook, polls, timeline
│   ├── engine/            # @autumnsgrove/lattice — the framework
│   ├── foliage/           # Per-site theming
│   ├── gossamer/          # ASCII visual effects
│   ├── grove-agent/       # Agent framework
│   ├── grove-crypto/      # Envelope encryption, SecretsManager
│   ├── grove-errors/      # Structured error types
│   ├── grove-markdown/    # Markdown pipeline
│   ├── infra/             # D1/KV/R2 abstraction
│   ├── loom/              # Durable Object framework
│   ├── prism/             # Design tokens and icon gateway
│   ├── shutter/           # Page summarisation (cloudflare/ is the package)
│   └── thorn/             # Content moderation SDK
├── services/              # Long-running Workers (auth, router, media, mail, billing)
├── workers/               # Scheduled and background Workers
├── tools/                 # gw, glimpse, labels, pre-commit scripts
├── scripts/               # dev-stack.sh, migrations, generators
├── docs/                  # Specs, patterns, plans, help centre, museum
└── AGENT.md               # Agent instructions (start here if you are one)
```

---

## Troubleshooting

**Port conflicts:** Each app defaults to a different port. If you get conflicts, use `--port <number>`.

**Missing Cloudflare bindings:** If you see D1/KV/R2 errors in local dev, make sure you're using `pnpm dev:wrangler` (engine only) or that the app's `wrangler.toml` is configured.

**Tailwind classes not working:** Make sure the app imports the engine's Tailwind preset and scans engine component paths in its `content` array. See the Tailwind Preset section above.
