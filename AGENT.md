# Project Instructions - Agent Workflows

> **Note**: This is the main orchestrator file. For detailed guides, see `AgentUsage/README.md`

---

## Project Naming

|                       |                       |
| --------------------- | --------------------- |
| **Public name**       | Lattice               |
| **Internal codename** | Lattice               |
| **npm package**       | @autumnsgrove/lattice |

Lattice is the core framework that powers the Grove ecosystem. The name evokes a framework that supports growth—vines climb it, gardens are built around it. Use "Lattice" in user-facing documentation and marketing; use "Lattice" for internal references, database names, and infrastructure.

---

## User Identity Terminology

Grove uses specific terms for community members. **Always use these in user-facing text.**

| Identity       | Who                       | Usage                                                |
| -------------- | ------------------------- | ---------------------------------------------------- |
| **Wanderer**   | Everyone who enters Grove | "Welcome, Wanderer" — default greeting for all users |
| **Rooted**     | Subscribers (paid users)  | "You've taken root" — when someone subscribes        |
| **Pathfinder** | Trusted community guides  | Appointed by Wayfinder — similar to "Trusted Admins" |
| **Wayfinder**  | Autumn (singular)         | The grove keeper — finds and shows the way           |

**Key rules:**

- Never use "user" or "member" in user-facing text — use "Wanderer"
- Never use "subscriber" in user-facing text — use "Rooted" or "the Rooted"
- The symmetry: Wanderers _seek_ the way, the Wayfinder _shows_ the way
- Identity is separate from subscription tiers (Seedling/Sapling/Oak/Evergreen)

See `docs/grove-user-identity.md` for full documentation.

---

## Project Purpose

Multi-tenant blog platform where users get their own blogs on subdomains (username.grove.place). Built on Cloudflare infrastructure with SvelteKit, featuring an optional community feed where blogs can share posts, vote, and react with emojis.

**The Why:** This isn't just a SaaS—it's about helping friends have their own space online, away from big tech algorithms. It's solarpunk-aligned (decentralized, community-owned), and built to be genuinely helpful rather than exploitative. Grove provides queer-friendly infrastructure: safe digital spaces, especially valuable when physical environments feel hostile.

## Tech Stack

- **Language:** TypeScript, JavaScript
- **Framework:** SvelteKit 2.0+
- **Backend:** Cloudflare Workers, D1 (SQLite), KV, R2 Storage
- **Infrastructure:** Wrangler (app deployment)
- **Auth:** Heartwood (Google OAuth 2.0 + PKCE)
- **Payments:** Stripe
- **Email:** Resend
- **Styling:** Tailwind CSS
- **Package Manager:** pnpm (CI/deployments) + bun (local dev speed)

## Local Development

**Hybrid pnpm + bun workflow:** Use pnpm for dependency management (keeps lockfile in sync with CI), use bun for fast local execution.

```bash
# DEPENDENCIES - Always use pnpm (syncs with CI)
pnpm install              # Install all deps
pnpm add <package>        # Add a package

# LOCAL EXECUTION - Use bun for speed (10-50x faster)
bun run dev               # Start dev server
bun run build             # Build locally
bun x prettier --write .  # Run prettier
bun x tsc --noEmit        # Type check
```

**Why this works:** Bun uses the `node_modules` that pnpm creates—no separate lockfile needed.

**Avoid:** `bun install` or `bun add` — these update bun.lock instead of pnpm-lock.yaml, causing drift.

### Stripe Configuration

Products and prices are managed in Stripe Dashboard. Price IDs are hardcoded in `apps/plant/src/lib/server/stripe.ts`. Set 2 secrets in Cloudflare: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Full instructions: `docs/setup/stripe-setup.md`

### Production Deployment

Apps auto-deploy via GitHub Actions on push to main. Resource IDs are hardcoded in each app's `wrangler.toml`.

## Design Standards

### Typography

- **Default Font:** Lexend — used across all Grove properties
- **Font Fallback:** All font mappings should fall back to `lexend`, not other fonts
- **Available Fonts:** See `libs/engine/static/fonts/` for the full collection

### CRITICAL: Tailwind Preset Required

**All consumer apps MUST use the engine's Tailwind preset.**

The engine provides a shared Tailwind preset (`libs/engine/src/lib/ui/tailwind.preset.js`) that defines custom z-index scale, Grove color palette, typography, animations, and shared design tokens.

**Every app's `tailwind.config.js` must include:**

```javascript
import grovePreset from "../../libs/engine/src/lib/ui/tailwind.preset.js";

export default {
	presets: [grovePreset],
	content: [
		"./src/**/*.{html,js,svelte,ts}",
		// REQUIRED: Scan engine components for Tailwind classes
		"../../libs/engine/src/lib/**/*.{html,js,svelte,ts}",
	],
};
```

**Why this matters:** Engine components use custom Tailwind utilities like `z-grove-mobile-menu`. Without the preset, Tailwind won't generate CSS for them—causing invisible styling bugs.

## Architecture Notes

- Multi-tenant architecture with subdomain routing
- Cloudflare-first infrastructure (Workers, D1, KV, R2)
- Phase-based development: Lattice → Multi-tenant → Website → Meadow → Polish

### D1 Database Architecture (3 databases)

| Database                 | Binding    | Tables | Purpose                                              |
| ------------------------ | ---------- | ------ | ---------------------------------------------------- |
| `grove-engine-db`        | `DB`       | ~78    | Core: auth, tenants, pages, billing, platform config |
| `grove-curios-db`        | `CURIO_DB` | 45     | Curio widgets: timeline, gallery, guestbook, etc.    |
| `grove-observability-db` | `OBS_DB`   | 16     | Observability: sentinel monitoring, vista analytics  |

**Binding rules:**

- **Curio routes** (`/api/curios/*`, `/arbor/curios/*`, `/(site)/timeline|gallery|guestbook|pulse`) → use `platform?.env?.CURIO_DB`
- **Observability routes** (`/api/sentinel/*`, `/api/vista/*`) → use `platform?.env?.OBS_DB`
- **Everything else** (auth, tenants, pages, billing) → use `platform?.env?.DB`
- **Cross-DB routes** (e.g., timeline generate/backfill/save-token) need **both** `DB` and `CURIO_DB` — `DB` for SecretsManager, `CURIO_DB` for curio tables

### Key Architecture Documents

| Document                                                            | Purpose                                                                      |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `docs/plans/infra/completed/database-consolidation-architecture.md` | 3-phase database extraction plan (completed Feb 2026)                        |
| `docs/patterns/loom-durable-objects-pattern.md`                     | Loom DO coordination layer for auth, tenant coordination, D1 batching        |
| `docs/specs/rings-spec.md`                                          | Rings analytics system with privacy-first design and DO integration          |
| `docs/grove-ai-gateway-integration.md`                              | Cloudflare AI Gateway integration for per-tenant AI quotas and observability |

---

## Essential Instructions (Always Follow)

### Grove Wrap (gw) — Required CLI

All git, GitHub, and Cloudflare operations go through `gw`. Write operations require `--write`. The `enforce-gw` hook blocks raw commands automatically.

```bash
gw context                              # Start every session here
gw git ship --write -a -m "feat: msg"   # Auto-stage + format + check + commit + push
gw dev ci --affected --fail-fast --diagnose # Verify before committing
gw git pr-prep                          # PR readiness report
```

Run `gw --help` for full commands. See `AgentUsage/git_guide.md` for details.

**Note:** `--write` is auto-implied for interactive terminal sessions but required for agents/CI/MCP. DANGEROUS-tier operations (`--write --force`) are never auto-implied.

### Core Behavior

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary for achieving your goal
- ALWAYS prefer editing existing files to creating new ones
- NEVER proactively create documentation files (\*.md) or README files unless explicitly requested

### MANDATORY: Agent Self-Verification Protocol

**After making ANY code changes, you MUST verify your work before committing.** Do not commit broken code.

```bash
# Step 1: Ensure dependencies are in sync
pnpm install

# Step 2: Run affected-only CI
gw dev ci --affected --fail-fast --diagnose
```

**When verification fails:** Read diagnostics, fix errors, re-run, repeat until clean, THEN commit.

**When to run:** After completing code changes (before commit), after PR review feedback (before push), after multi-file refactoring.

**When to skip:** Documentation-only changes (.md files only), configuration-only changes.

**This is non-negotiable.** Every workflow must end with verification before commit.

### Naming Conventions

- **Directories**: Use CamelCase (e.g., `VideoProcessor`, `AudioTools`, `DataAnalysis`)
- **Date-based paths**: Use skewer-case with YYYY-MM-DD (e.g., `logs-2025-01-15`)
- **No spaces or underscores** in directory names (except date-based paths)

### Task Tracking (GitHub Issues)

- **All tasks are tracked in [GitHub Issues](https://github.com/AutumnsGrove/Lattice/issues)** — not in local files
- **Check open issues** when starting a session to understand current priorities
- **Close issues** when work is complete — reference the issue number in commits (e.g., `fixes #123`)
- **Bulk issue creation** — Use skill: `grove-issues` to parse brain dumps into structured issues

### Git Workflow

> **Use `gw git` commands, not raw git.** See gw section above.

**Conventional Commits Format (enforced by gw):**

```bash
<type>(<scope>): <brief description>
# Types: feat, fix, docs, refactor, test, chore, perf
```

**Daily workflow:**

```bash
gw context                                    # Start here
gw git ship --write -a -m "feat(auth): msg"   # Commit + push
gw git pr-prep                                # Before creating PRs
```

See `AgentUsage/git_guide.md` for complete reference.

### Claude Code Hooks

Two hooks are registered in `~/.claude/settings.json`:

- **PreToolUse `enforce-gw.py`** — Blocks raw git/gh/wrangler write commands, redirects to gw equivalents
- **PostToolUse `auto-format.py`** — Auto-runs Prettier after every Edit/Write on supported file types

### Pull Requests

Use conventional commits format for PR titles. Write a brief description of what the PR does and why.

---

## Engine-First Pattern (CRITICAL)

> **The engine exists to prevent duplication. USE IT.**

**Before implementing ANY utility, component, or pattern in an app:**

```
1. CHECK: Does the engine already have this?
   └── YES → Import from @autumnsgrove/lattice
   └── NO  → Continue to step 2

2. IMPLEMENT: Add it to the engine FIRST
   └── libs/engine/src/lib/...

3. IMPORT: Then use it from the engine in your app
   └── import { thing } from '@autumnsgrove/lattice/...'
```

### What the Engine Provides

| Category              | Import Path                           | Examples                     |
| --------------------- | ------------------------------------- | ---------------------------- |
| **UI Components**     | `@autumnsgrove/lattice/ui/chrome`     | Header, Footer, Logo         |
| **UI Utilities**      | `@autumnsgrove/lattice/ui/utils`      | `cn()` (with tailwind-merge) |
| **Stores**            | `@autumnsgrove/lattice/ui/stores`     | `seasonStore`, `themeStore`  |
| **Nature Components** | `@autumnsgrove/lattice/ui/nature`     | Trees, creatures, palette    |
| **Glass UI**          | `@autumnsgrove/lattice/ui`            | GlassCard, GlassButton       |
| **General Utils**     | `@autumnsgrove/lattice/utils`         | csrf, sanitize, markdown     |
| **Content**           | `@autumnsgrove/lattice/ui/content`    | ContentWithGutter, TOC       |
| **Forms**             | `@autumnsgrove/lattice/ui/forms`      | Form components              |
| **Gallery**           | `@autumnsgrove/lattice/ui/gallery`    | Image galleries              |
| **Charts**            | `@autumnsgrove/lattice/ui/charts`     | Data visualization           |
| **Icons**             | `@autumnsgrove/lattice/ui/icons`      | Icon components              |
| **Typography**        | `@autumnsgrove/lattice/ui/typography` | Text components              |
| **Auth**              | `@autumnsgrove/lattice/auth`          | Authentication utilities     |
| **Errors**            | `@autumnsgrove/lattice/errors`        | Signpost error codes         |
| **Type Safety**       | `@autumnsgrove/lattice/server`        | Rootwork boundary utilities  |

### Common Violations (Don't Do These)

```typescript
// ❌ BAD - Creating local utilities
export function cn(...classes) {
	return classes.filter(Boolean).join(" ");
}

// ✅ GOOD - Import from engine
import { cn } from "@autumnsgrove/lattice/ui/utils";
```

### Quick Engine Export Check

```bash
cat libs/engine/package.json | grep -A2 '"\./'
```

---

## Skills

Skills are invoked via the Skill tool. Each skill's description explains when to use it. For help choosing a skill, invoke skill: `robin-guide`.

Skills live in `.claude/skills/` — lean instruction files with deep references loaded on demand.

### Gathering Chains (Multi-Animal Workflows)

When a task spans multiple specialties, gatherings orchestrate the right animals in sequence:

| Gathering                | Animals                                       | Use When                                 |
| ------------------------ | --------------------------------------------- | ---------------------------------------- |
| `gathering-feature`      | Bloodhound → Elephant → Turtle → Beaver → Owl | Full feature lifecycle                   |
| `gathering-architecture` | Eagle → Crow → Swan → Elephant                | System design → challenge → spec → build |
| `gathering-ui`           | Chameleon → Deer                              | UI design + accessibility                |
| `gathering-security`     | Spider → Raccoon → Turtle                     | Auth + audit + hardening                 |
| `gathering-migration`    | Bloodhound → Bear                             | Scout territory → migrate data           |
| `gathering-planning`     | Bee → Badger                                  | Idea capture → board organization        |

---

## Code Style

### Function & Variable Naming

- Use meaningful, descriptive names
- Keep functions small and focused on single responsibilities

### Error Handling (Signpost Standard)

**MANDATORY: Every error MUST use a Signpost error code.** Bare `throw new Error()` is not acceptable.

**Import:**

```typescript
import {
	API_ERRORS,
	ARBOR_ERRORS,
	SITE_ERRORS,
	throwGroveError,
	logGroveError,
	buildErrorJson,
	buildErrorUrl,
} from "@autumnsgrove/lattice/errors";
```

**Which Helper Where:**

| Context                        | Helper              | Example                                                                    |
| ------------------------------ | ------------------- | -------------------------------------------------------------------------- |
| API routes (`+server.ts`)      | `buildErrorJson()`  | `return json(buildErrorJson(API_ERRORS.UNAUTHORIZED), { status: 401 })`    |
| Page loads (`+page.server.ts`) | `throwGroveError()` | `throwGroveError(404, SITE_ERRORS.POST_NOT_FOUND, 'Engine')`               |
| Auth redirects                 | `buildErrorUrl()`   | `redirect(302, buildErrorUrl(AUTH_ERRORS.SESSION_EXPIRED, '/login'))`      |
| Any server context             | `logGroveError()`   | `logGroveError('Engine', API_ERRORS.INTERNAL_ERROR, { path, cause: err })` |

**Error Catalogs:**

| Catalog        | Prefix            | Import                            |
| -------------- | ----------------- | --------------------------------- |
| `API_ERRORS`   | `GROVE-API-XXX`   | `@autumnsgrove/lattice/errors`    |
| `ARBOR_ERRORS` | `GROVE-ARBOR-XXX` | `@autumnsgrove/lattice/errors`    |
| `SITE_ERRORS`  | `GROVE-SITE-XXX`  | `@autumnsgrove/lattice/errors`    |
| `AUTH_ERRORS`  | `HW-AUTH-XXX`     | `@autumnsgrove/lattice/heartwood` |
| `PLANT_ERRORS` | `PLANT-XXX`       | `apps/plant/src/lib/errors.ts`    |

**Client-Side Feedback (Toast):**

```typescript
import { toast } from "@autumnsgrove/lattice/ui";

toast.success("Post published!");
toast.error(err instanceof Error ? err.message : "Something went wrong");
toast.promise(apiRequest("/api/export", { method: "POST" }), {
	loading: "Exporting...",
	success: "Export complete!",
	error: "Export failed.",
});
```

**When NOT to use toast:** form validation errors (use `fail()` + inline), page load failures (`+error.svelte`), persistent notices (use GroveMessages)

See `AgentUsage/error_handling.md` for the full reference.

### Type Safety at Boundaries (Rootwork)

**MANDATORY: No `as` casts at trust boundaries.** Use Rootwork utilities for form data, KV reads, caught exceptions, and webhook payloads.

```typescript
import {
	parseFormData,
	safeJsonParse,
	isRedirect,
	isHttpError,
} from "@autumnsgrove/lattice/server";
```

| Boundary               | Utility                                |
| ---------------------- | -------------------------------------- |
| `request.formData()`   | `parseFormData(formData, ZodSchema)`   |
| KV / JSON strings      | `safeJsonParse(raw, ZodSchema)`        |
| SvelteKit catch blocks | `isRedirect(err)` / `isHttpError(err)` |

See `AgentUsage/rootwork_type_safety.md` for patterns, decision guide, and checklist.

### File Organization

- Group related functionality into modules
- Import ordering: standard library → third-party → local imports
- Keep configuration separate from logic

### Database Query Patterns (Multi-DB)

**Choose the right binding** — see [D1 Database Architecture](#d1-database-architecture-3-databases) above.

```typescript
// Standard curio route — single binding
const db = platform?.env?.CURIO_DB;
if (!db) throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");

// Cross-DB route (e.g., timeline generate) — dual binding
const db = platform?.env?.DB; // Core: SecretsManager, tenants
const curioDb = platform?.env?.CURIO_DB; // Curios: timeline_*, gallery_*, etc.
if (!db || !curioDb) throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
```

**Isolate independent queries** — never put multiple in the same try/catch:

```typescript
// ❌ BAD - one failure blocks all
try {
	const settings = await db.prepare("SELECT * FROM settings").all();
	const pages = await db.prepare("SELECT * FROM pages").all();
} catch (error) {}

// ✅ GOOD - isolated with individual fallbacks
const [settings, pages] = await Promise.all([
	db
		.prepare("SELECT * FROM settings")
		.all()
		.catch(() => null),
	db
		.prepare("SELECT * FROM pages")
		.all()
		.catch(() => null),
]);
```

**Use typed query builders** from `libs/engine/src/lib/server/services/database.ts` instead of raw SQL.

### Multi-Tenant CSRF

SvelteKit's built-in CSRF fails behind `grove-router` proxy. Configure `csrf.trustedOrigins` in `svelte.config.js`:

```javascript
kit: {
  csrf: {
    checkOrigin: true,
    trustedOrigins: ["https://grove.place", "https://*.grove.place", "http://localhost:5173"],
  },
}
```

---

## Agent Ecosystem

Grove uses specialized subagents. **Prefer Grove agents** (`.claude/agents/`) over generic ones — they know gw/gf, Lattice conventions, and the monorepo.

| Task                 | Agent              |
| -------------------- | ------------------ |
| Run CI               | **grove-runner**   |
| Analyze git          | **grove-git**      |
| Code changes         | **grove-coder**    |
| Search code          | **grove-scout**    |
| Verify before commit | **grove-verifier** |

Full reference: `AgentUsage/house_agents.md`

---

## Additional Resources

- **Skills:** `.claude/skills/` — primary mechanism for specialized workflows
- **Extended docs:** `AgentUsage/README.md` — master index of detailed documentation
- **Design context:** `AgentUsage/design_context.md` — brand, aesthetic, principles

---

_Last updated: 2026-02-22_
_Model: Claude Opus 4.6_
