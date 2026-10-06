# Project Instructions - Agent Workflows

> **Note**: This is the main orchestrator file. For detailed guides, see `AgentUsage/README.md`

---

## Behavioral Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Primary Design Principles

These two principles govern how code is structured across the entire Grove ecosystem. They sit above any individual SDK rule or pattern — every other convention in this project derives from them.

### Data Primacy

> **Code translates data. It never defines it.**

If a value could live in a config module, a named constant, a data file, or a design token — it must. No hardcoded strings scattered across logic. No parallel data structures that duplicate what a config already defines. One source of truth, imported everywhere.

TypeScript-as-config is valid — compile-time validation is an advantage over raw YAML. But the value still needs ONE home. If the same string, number, or structure appears in two files, one instance is a bug.

**Concrete rules:**

- Tier names, limits, and pricing only in `platform/config/tiers.ts` — never bare tier strings or magic limits in route handlers
- Model names and metadata only in `lumen-models.json` + `lumen/config.ts` — never a bare model string in application code
- Error codes and messages only in Signpost catalogs (`errors/*.ts`) — never ad-hoc error strings duplicated across endpoints
- Design tokens only in Prism (`libs/prism/`) — never hardcoded hex colors, and never the same color value in two files
- Rate limit definitions only in Threshold/Thorn config — never hand-rolled limit constants in route handlers
- Feature flag names defined once as constants — not re-typed as string literals in multiple checks
- If the same string appears twice, one instance is a bug

**The test:** "Is this value defined in exactly one place, and do all consumers read from that place?"

### SDK Boundaries

> **Every capability is accessed through its owning SDK. If no SDK exists, build the shared function so the next consumer doesn't reinvent it.**

This is the behavioral sibling of Data Primacy. Where Data Primacy says *values live in config, not code*, this principle says *behavior lives in owning packages, not consumers*. Together: **code translates data through SDK boundaries. It never defines data, and it never reimplements behavior.**

**The resolution order — always try from the top:**

```
1. SDK exists?        → Use it. (Infra, Amber, Lumen, Threshold, Signpost, Prism, etc.)
2. Engine has it?     → Import from @autumnsgrove/lattice/...
3. Neither exists?    → Build it in the engine first, THEN import it in your app.
4. Truly app-specific → Local code is fine, but be honest about whether it's really unique.
```

**The test:** *"If I needed to change how this works, how many files would I touch?"* 1 package = correct. >1 = the capability has leaked.

**Capability ownership map:**

| Capability | Owner | Consumers call | They do NOT |
|---|---|---|---|
| Database queries | `@autumnsgrove/infra` | `GroveDatabase`, `createDb()`, `scopedDb()` | Use raw `env.DB.prepare()` or `platform.env.DB` directly |
| File storage | `@autumnsgrove/lattice/amber` | `FileManager`, `ExportManager`, `QuotaManager` | Use raw `env.BUCKET.put()` or `R2Bucket` operations |
| KV storage | `@autumnsgrove/infra` | `GroveKV` via `GroveContext` | Use raw `env.KV.get()` / `env.KV.put()` |
| AI inference | `@autumnsgrove/lattice/ai/lumen` | `createLumenClient()`, `RemoteLumenClient` | Construct `new OpenAI()` or raw fetch to model APIs |
| Rate limiting | `@autumnsgrove/lattice/platform/threshold` | `createThreshold()`, `thresholdMiddleware()` | Write ad-hoc KV read-modify-write rate limiters |
| Content moderation | `@autumnsgrove/lattice/thorn` | `moderatePublishedContent()` | Build custom profanity/spam filters |
| Error handling | `@autumnsgrove/lattice/errors` | `throwGroveError()`, `logGroveError()`, `buildErrorJson()` | Use bare `throw new Error()` or `console.error()` |
| Email | `@autumnsgrove/lattice/zephyr` | `createZephyrClient()`, `zephyr.send()` | Use raw `new Resend()` or direct email API calls |
| Credentials | Warden (service binding) | `createWardenClient()` | Store raw API keys in worker env or code |
| Icons | `@autumnsgrove/prism/icons` | Semantic groups (`stateIcons`, `navIcons`, etc.) | Import from `@lucide/svelte` directly |
| Design tokens | `@autumnsgrove/prism` | CSS vars (`var(--grove-*)`) + Tailwind preset | Hardcode hex values or duplicate token definitions |
| Type-safe boundaries | `@autumnsgrove/lattice/server` | `parseFormData()`, `safeJsonParse()`, `isRedirect()` | Cast with `as any` or `as SomeType` on external data |
| Client-side fetch | `$lib/utils/api` | `apiRequest()` (auto-injects CSRF) | Use raw `fetch()` for internal API calls |

**Acceptable escape hatches:**

- SDK library code itself (`libs/infra/`, `libs/engine/src/lib/threshold/`) wraps raw bindings by design
- Durable Objects with dual-binding strategy (e.g., Warden's `TENANT_DB`) may access secondary bindings directly
- Migration scripts and CLI tools may use lower-level access when the SDK doesn't cover the operation
- Test mocks may reference raw types for typing

**These principles are working if:** changing how a capability works requires editing one package, new features reuse existing SDKs instead of reimplementing, and the same value never appears in two files.

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
- **Auth:** Heartwood (Google OAuth 2.0 + PKCE, passwordless email codes)
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

### Full Dev Stack (real workers, real DOs, real D1/KV/R2)

`./scripts/dev-stack.sh` runs the real Grove stack locally via a single miniflare instance (wrangler multi-config) — no mocks. This is the fastest way to click through a real change in Arbor/Aspen or any worker, not just typecheck it.

```bash
pnpm install                 # workspace deps, once

./scripts/dev-stack.sh        # full stack: workers + Aspen
./scripts/dev-stack.sh fast    # fast: Aspen/Plant/Landing under `vite dev` (HMR), no production builds
./scripts/dev-stack.sh workers # workers only, no SvelteKit apps
./scripts/dev-stack.sh seed    # apply migrations + seed data only
./scripts/dev-stack.sh reset   # nuke local DBs and re-seed
```

`dev-stack.sh` builds `libs/engine`'s dist if it's missing, and rebuilds `apps/aspen`'s `.svelte-kit/output` on every full-mode run before starting `wrangler dev` — both are consumed as built output, not live source, so a stale build silently serves old component code with no error. After editing engine source, run `cd libs/engine && pnpm run package` (or use `fast` mode, which rebuilds a stale engine dist itself) before relaunching.

**Fast mode (`fast`):** skips the Aspen/Plant/Landing production builds and serves Aspen (5173), Landing (5174) and Plant (5175) from `vite dev` with hot reload — about 1 min to start versus ~3 min. Heartwood, the durable-objects worker and Zephyr still run under `wrangler dev`; Aspen reaches them through wrangler's dev registry. It skips the engine rebuild when no `libs/engine` source is newer than the last build.

**How `vite dev` gets bindings:** each app's `platform.env` comes from adapter-cloudflare's `platformProxy` (wrangler's `getPlatformProxy`), configured in that app's `svelte.config.js` (aspen, plant, landing) — **not** from `@cloudflare/vite-plugin` (SvelteKit isn't compatible with it, and it isn't needed). Two settings there must stay in sync with the rest of the stack, and neither fails loudly when wrong:

- `persist.path` must resolve to `apps/aspen/.wrangler/state/v3` (plant and landing use `../aspen/.wrangler/state/v3`), the same dir `dev-stack.sh` migrates and seeds. Any other dir silently gets its own stale copy of the D1 file, which looks like a "stale schema" bug (`no such table` for migrated tables).
- Aspen's `envFiles` points at `apps/aspen/.dev.vars` (plant and landing keep their `.dev.vars` next to their own wrangler config, so they need none). The proxy otherwise looks for `.dev.vars` next to `configPath` (`libs/engine`), so `DEMO_MODE_SECRET` never arrives and demo login falls through to production login.

**Local durable objects:** `services/durable-objects/wrangler.toml` deliberately has no `[[migrations]]` (history was reset 2026-06-27; the classes already exist in Cloudflare — don't re-add them, re-applying `v1` breaks deploys). Miniflare only enables SQLite for classes a migration declares, so `dev-stack.sh` generates a gitignored `wrangler.local.toml` with a `new_sqlite_classes` migration appended and runs that instead. Without it every Loom DO fails locally with `SQL is not enabled for this Durable Object class`.

`dev-stack.sh stop` only kills wrangler processes — a leftover `vite dev` (login hub on 5176, or Aspen in fast mode) can survive it and block the next start.

**Logging in locally:** use Demo Mode, not Google OAuth — `dev-stack.sh` reads `DEMO_MODE_SECRET` from `apps/aspen/.dev.vars` and prints the exact `?demo=<secret>` URL to visit once the stack is up. If you don't see it, the secret or `.dev.vars` file is missing (script warns instead of failing). Full details: `docs/LOCAL_DEV.md`.

### Stripe Configuration

Products and prices are managed in Stripe Dashboard. Price IDs are hardcoded in `services/billing-api/src/types.ts`. Billing flows through the BillingHub (`billing.grove.place`) — a two-worker hub pattern mirroring the login hub. Set secrets via `gw secret apply` on `grove-billing-api` and `grove-billing`. Full instructions: `docs/setup/stripe-setup.md`

### Production Deployment

Apps auto-deploy via GitHub Actions on push to main. Resource IDs are hardcoded in each app's `wrangler.toml`.

### Beta Deployment (Aspen only)

Aspen has a second live deployment for testing real changes against real Cloudflare infrastructure before every Wanderer sees them — **not** an isolated staging environment. It's where new features get tried first, so it's normal and intended for `beta` to run ahead of `main`. `grove-aspen-beta` shares the exact same `grove-engine-db` D1, KV, and R2 as production `grove-aspen`. A post written in beta is a row in the same table the public site reads. Full design: `docs/plans/planned/beta-environment-architecture.md`.

**URL shape:** `<tenant>-beta.grove.place` (e.g. `autumn-beta.grove.place`) — single-label, **not** `beta.<tenant>.grove.place`. This zone's Cloudflare edge cert only covers `*.grove.place` (one level); a two-level host fails the TLS handshake before any request reaches grove-router. Don't "fix" this back to the dot form without provisioning Cloudflare Advanced Certificate Manager (paid) first.

**How a change reaches beta:**

1. Land the change on `main` as normal.
2. `git checkout beta && git merge main && git push origin beta` — beta is a trial ground, so it's expected to carry commits that aren't on `main` yet (features being tried out on purpose). Merge `main` into it and keep those commits; never reset or force beta to match `main`. Try `--ff-only` first if you like, but a refusal just means beta has its own work — merge instead.
3. `.github/workflows/deploy-aspen-beta.yml` (triggers on push to `beta`, same path filters as `deploy-aspen.yml`) redeploys `grove-aspen-beta` via `_deploy-worker.yml` with `deploy-env: beta` (→ `wrangler deploy --env beta`) and `service-name-override: aspen-beta` (keeps its failure-tracking issue separate from prod's).
4. A same-SHA branch push (nothing new to diff against path filters) won't auto-trigger — use `gh workflow run deploy-aspen-beta.yml --ref beta` to force it.

**Routing:** `services/grove-router` holds an `ASPEN_BETA` service binding alongside `ASPEN`. It checks the subdomain (`parts[0]`) for a trailing `-beta` suffix and dispatches there instead of the default `ASPEN` target, forwarding `X-Forwarded-Host` unchanged. Aspen's own `hooks.server.ts` strips the `-beta` suffix to recover the real tenant and sets `locals.isBeta`, which `+layout.svelte` uses to show a `BetaBadge` next to the site title in the header.

**Bindings:** `apps/aspen/wrangler.toml`'s `[env.beta]` block must redeclare every top-level binding (`vars`, `kv_namespaces`, `r2_buckets`, `d1_databases`, `services`, `ai`, `durable_objects`) — wrangler environments do **not** inherit them. `wrangler deploy --env beta --dry-run` will show only `ASSETS` bound if this drifts; always dry-run after touching this block.

**Secrets:** kept in parity with prod manually — `gw secret apply <name...> -w grove-aspen-beta --write`, mirroring whatever `wrangler secret list` shows on `grove-aspen`. No automatic sync.

**Reserved:** the `-beta` suffix is blocked at signup via `RESERVED_INFRA_SUFFIXES` in `libs/engine/src/lib/platform/config/domain-blocklist.ts` (Loam) — no tenant can register a subdomain ending in `-beta`.

**Scope:** Aspen only for now (covers Arbor's admin routes too, since those live under `apps/aspen/src/routes/arbor/`). No other app has this yet — prove the pattern once before repeating it.

---

## Design Standards

**See `DESIGN.md`** for the complete design reference: typography, color tokens, dual CSS variable system, Prism SSOT, and the Grove accent scale.

---

## Architecture Notes

**See `ARCHITECTURE.md`** for the complete architecture reference: D1 database layout (3 databases), Warden credential gateway, and key architecture documents.

---

## Essential Instructions (Always Follow)

### Grove Wrap (gw) — Infrastructure CLI

`gw` handles operations that raw CLIs can't: encrypted vaults, issue-driven worktrees, npm publishing, Warden management, and Todoist integration. **For git, gh, and wrangler — use them directly.**

```bash
gw --help                               # See available commands
gw secret list                          # Encrypted vault
gw gh issue list                        # Issue management
gw git worktree create <issue-num>      # Create worktree for an issue
gw git worktree finish --write          # Commit, push, merge, cleanup
```

**For git/GitHub/Cloudflare — use raw CLIs:**
```bash
git status && git diff                  # Check changes
git add . && git commit -m "feat: msg"  # Commit
git push                                # Push
gh pr create                            # Create PR
wrangler d1 execute ...                 # Database operations
```

Run `gw --help` for the full (small) command list. Write operations require `--write`.

### Core Behavior

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary for achieving your goal
- ALWAYS prefer editing existing files to creating new ones
- NEVER proactively create documentation files (\*.md) or README files unless explicitly requested

### Verification

**See `VERIFICATION.md`** for the complete verification reference: self-verification protocol, Glimpse visual testing, Showroom component auditing, and data profiles.

**Quick reference:**

```bash
# Verify code changes before committing
pnpm install && pnpm -r run build && pnpm -r run check

# Verify UI changes visually
uv run --project tools/glimpse glimpse capture http://localhost:5173/?subdomain=midnight-bloom \
  --season autumn --theme dark --logs --auto
```

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

Use raw `git` and `gh` directly. Use `gw git worktree` for issue-driven worktree lifecycle.

**Conventional Commits Format:**

```bash
<type>(<scope>): <brief description>
# Types: feat, fix, docs, refactor, test, chore, perf
```

**Daily workflow:**

```bash
git status && git diff                        # Check changes
git add . && git commit -m "feat(auth): msg"  # Commit
git push                                      # Push
gh pr create --title "feat: ..." --body "..." # Create PR
```

See `AgentUsage/git_guide.md` for complete reference.

### Git Hooks

Local git enforcement lives in `.githooks/` (pre-commit, pre-push, commit-msg). Install with `git config core.hooksPath .githooks`.

### Pull Requests

Use conventional commits format for PR titles. Write a brief description of what the PR does and why.

---

## Code Standards

**See `CODE-STANDARDS.md`** for the complete code standards reference: engine-first pattern, Prism icon gateway, Signpost error handling, Rootwork type safety, database query patterns, and CSRF configuration.

---

## Skills

Skills are invoked via the Skill tool. Each skill's description explains when to use it. For help choosing a skill, invoke skill: `robin-guide`.

Skills live in `.claude/skills/` — lean instruction files with deep references loaded on demand.

### Security Skills

Grove has layered security animals — use the right one for the scope of work:

| Skill                | Focus                      | Use When                                             |
| -------------------- | -------------------------- | ---------------------------------------------------- |
| `spider-weave`       | Auth integration           | Implementing OAuth, sessions, RBAC, route protection |
| `raccoon-audit`      | Secrets & vulnerability    | Finding exposed secrets, dead code, dependency vulns |
| `turtle-harden`      | Defense-in-depth           | Layered hardening: validation, sanitization, CSP     |
| `raven-investigate`  | Quick posture assessment   | Rapid audit of any codebase (parallel sub-agents)    |
| `hawk-survey`        | Formal audit + remediation | Full STRIDE threat model across 14 domains           |
| `gathering-security` | End-to-end pipeline        | Spider → Raccoon → Turtle in coordinated sequence    |

**Credential security:** All API keys route through Warden (see `ARCHITECTURE.md`). Use `gw warden agent enroll` to register workers, `gw secret` to manage the vault.

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

- **Design standards:** `DESIGN.md` — colors, tokens, Prism, accent scale
- **Architecture:** `ARCHITECTURE.md` — D1 databases, Warden, infrastructure
- **Verification:** `VERIFICATION.md` — CI checks, Glimpse, Showroom
- **Code standards:** `CODE-STANDARDS.md` — engine-first, errors, types, queries
- **Skills:** `.claude/skills/` — primary mechanism for specialized workflows
- **Extended docs:** `AgentUsage/README.md` — master index of detailed documentation
- **Design context:** `AgentUsage/design_context.md` — brand, aesthetic, principles

---

_Last updated: 2026-04-10_
_Model: Claude Opus 4.6_
