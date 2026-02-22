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

The monorepo is organized into `apps/`, `libs/`, `services/`, and `workers/`.

```bash
# Engine (core blog platform)
cd libs/engine && pnpm dev

# Landing page (grove.place)
cd apps/landing && pnpm dev

# Forage frontend (domain search)
cd apps/domains && pnpm dev

# Plant (tenant blog management)
cd apps/plant && pnpm dev

# Any app follows the same pattern
cd apps/<name> && pnpm dev
```

### With Cloudflare Bindings

To run the engine with local D1, KV, and R2 bindings (mimics production):

```bash
cd libs/engine
pnpm dev:wrangler
```

This uses `wrangler dev` under the hood and creates local D1/KV/R2 stores automatically.

---

## Database

### Migrations

The engine uses Cloudflare D1 (SQLite). Migrations live in `libs/engine/migrations/`.

```bash
cd libs/engine

# Apply migrations locally
wrangler d1 migrations apply grove-engine-db --local

# Apply migrations to production
wrangler d1 migrations apply grove-engine-db --remote
```

### Creating Migrations

```bash
cd libs/engine
wrangler d1 migrations create grove-engine-db "description-of-change"
```

This creates a new `.sql` file in `migrations/`. Write your SQL, then apply locally to test.

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

Payments are processed through Stripe. Products and prices are managed in the Stripe Dashboard.

1. Products exist in the [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Price IDs are configured in `apps/plant/src/lib/server/stripe.ts`
3. Required secrets (set in Cloudflare Dashboard): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

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

```
Lattice/
├── apps/
│   ├── amber/             # Media storage frontend
│   ├── clearing/          # Status page
│   ├── domains/           # Forage frontend (domain search)
│   ├── ivy/               # Zero-knowledge email client
│   ├── landing/           # Marketing site (grove.place)
│   ├── login/             # Auth login page
│   ├── meadow/            # Community feed
│   ├── plant/             # Tenant blog management
│   ├── terrarium/         # Admin & testing interface
├── libs/
│   ├── engine/            # @autumnsgrove/lattice — core engine
│   ├── foliage/           # Theme system
│   ├── gossamer/          # Shared utilities
│   ├── shutter/           # Image processing
│   ├── vineyard/          # Component showcase library
├── services/
│   ├── amber/             # Storage API worker
│   ├── durable-objects/   # Cloudflare Durable Objects
│   ├── forage/            # Domain search service
│   ├── grove-router/      # Subdomain routing Worker
│   ├── heartwood/         # Authentication service
│   ├── pulse/             # Analytics service
│   ├── zephyr/            # Email gateway
├── workers/               # Scheduled/utility workers
├── docs/                  # Specs, patterns, guides
├── AgentUsage/            # Agent workflow documentation
├── AGENT.md               # Agent instructions
├── CONTRIBUTING.md         # Contribution guidelines
└── CLAUDE.md              # Claude Code configuration
```

---

## Troubleshooting

**Port conflicts:** Each app defaults to a different port. If you get conflicts, use `--port <number>`.

**Missing Cloudflare bindings:** If you see D1/KV/R2 errors in local dev, make sure you're using `pnpm dev:wrangler` (engine only) or that the app's `wrangler.toml` is configured.

**Tailwind classes not working:** Make sure the app imports the engine's Tailwind preset and scans engine component paths in its `content` array. See the Tailwind Preset section above.
