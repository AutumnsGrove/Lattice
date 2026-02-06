# Project Instructions - Agent Workflows

> **Note**: This is the main orchestrator file. For detailed guides, see `AgentUsage/README.md`

---

## Project Naming

| | |
|---|---|
| **Public name** | Lattice |
| **Internal codename** | GroveEngine |
| **npm package** | @autumnsgrove/groveengine |

Lattice is the core framework that powers the Grove ecosystem. The name evokes a framework that supports growth—vines climb it, gardens are built around it. Use "Lattice" in user-facing documentation and marketing; use "GroveEngine" for internal references, database names, and infrastructure.

---

## User Identity Terminology

Grove uses specific terms for community members. **Always use these in user-facing text.**

| Identity | Who | Usage |
|----------|-----|-------|
| **Wanderer** | Everyone who enters Grove | "Welcome, Wanderer" — default greeting for all users |
| **Rooted** | Subscribers (paid users) | "You've taken root" — when someone subscribes |
| **Pathfinder** | Trusted community guides | Appointed by Wayfinder — similar to "Trusted Admins" |
| **Wayfinder** | Autumn (singular) | The grove keeper — finds and shows the way |

**Key rules:**
- Never use "user" or "member" in user-facing text — use "Wanderer"
- Never use "subscriber" in user-facing text — use "Rooted" or "the Rooted"
- The symmetry: Wanderers *seek* the way, the Wayfinder *shows* the way
- Identity is separate from subscription tiers (Seedling/Sapling/Oak/Evergreen)

**Examples:**
- "Welcome, Wanderer." (not "Welcome, user")
- "Thanks for staying rooted with us." (not "Thanks for being a subscriber")
- "Ask a Pathfinder—they'll show you the way."

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

## Infrastructure & Deployment

### Local Development

**Hybrid pnpm + bun workflow:** Use pnpm for dependency management (keeps lockfile in sync with CI), use bun for fast local execution.

```bash
# DEPENDENCIES - Always use pnpm (syncs with CI)
pnpm install              # Install all deps
pnpm add <package>        # Add a package
pnpm remove <package>     # Remove a package

# LOCAL EXECUTION - Use bun for speed (10-50x faster)
bun run dev               # Start dev server
bun run build             # Build locally
bun x prettier --write .  # Run prettier
bun x tsc --noEmit        # Type check

# Start any app locally (auto-creates local D1/KV/R2)
cd landing && bun run dev
cd packages/engine && bun run dev
```

**Why this works:** Bun uses the `node_modules` that pnpm creates—no separate lockfile needed. The `bun.lock` file is gitignored since pnpm-lock.yaml is the source of truth for CI.

**⚠️ Avoid:** `bun install` or `bun add` — these would update bun.lock instead of pnpm-lock.yaml, causing drift between local and CI environments.

### Stripe Configuration
Payments are processed through Stripe. Products and prices are managed in the Stripe Dashboard.

**Setup:**
1. Products already exist in [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Price IDs are hardcoded in `packages/plant/src/lib/server/stripe.ts`
3. Set 2 secrets in Cloudflare Dashboard: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

**Full instructions:** `docs/setup/stripe-setup.md`

### Production Deployment
Apps auto-deploy via GitHub Actions on push to main. Resource IDs are hardcoded in each app's `wrangler.toml`.

## Design Standards

### Typography
- **Default Font:** Lexend — used across all Grove properties (landing, engine, blogs)
- **Font Fallback:** All font mappings should fall back to `lexend`, not other fonts
- **Available Fonts:** See `packages/engine/static/fonts/` for the full collection

### ⚠️ CRITICAL: Tailwind Preset Required
**All consumer apps MUST use the engine's Tailwind preset.**

The engine provides a shared Tailwind preset (`packages/engine/src/lib/ui/tailwind.preset.js`) that defines:
- Custom z-index scale (`z-grove-mobile-menu`, `z-grove-fab`, etc.)
- Grove color palette, typography, animations
- Shared design tokens and utilities

**Every app's `tailwind.config.js` must include:**

```javascript
import grovePreset from '../engine/src/lib/ui/tailwind.preset.js';

export default {
  presets: [grovePreset],
  content: [
    './src/**/*.{html,js,svelte,ts}',
    // REQUIRED: Scan engine components for Tailwind classes
    '../engine/src/lib/**/*.{html,js,svelte,ts}'
  ],
  // ... rest of config
};
```

**Why this matters:** Engine components use custom Tailwind utilities like `z-grove-mobile-menu`. Without the preset, Tailwind doesn't know what these classes mean and won't generate CSS for them—causing invisible styling bugs that are hard to debug (elements render but stack incorrectly, animations don't work, etc.).

This lesson learned the hard way: the mobile menu z-index fix (#367) only worked in the engine because other apps weren't importing the preset that defines `z-grove-mobile-menu`.

## Architecture Notes
- Multi-tenant architecture with subdomain routing
- Cloudflare-first infrastructure (Workers, D1, KV, R2)
- Phase-based development: Lattice → Multi-tenant → Website → Meadow → Polish
- First client: TBD (Mom's site completed with mock data)

### Key Architecture Documents

| Document | Purpose |
|----------|---------|
| `docs/patterns/loom-durable-objects-pattern.md` | Loom DO coordination layer for auth, tenant coordination, D1 batching |
| `docs/specs/rings-spec.md` | Rings analytics system with privacy-first design and DO integration |
| `docs/grove-ai-gateway-integration.md` | Cloudflare AI Gateway integration for per-tenant AI quotas and observability |

---

## Essential Instructions (Always Follow)

### 🌲 Grove Wrap (gw) — MANDATORY CLI

> **STOP. Before running ANY git, gh, wrangler, or dev command, use `gw` instead.**

Grove Wrap (`gw`) is the **required CLI** for all infrastructure operations. It wraps Wrangler, git, and GitHub CLI with agent-safe defaults, database protection, and audit logging.

#### Installation (REQUIRED for Remote Agents)

If you're running in a remote/cloud environment without gw installed:

```bash
# 1. Navigate to the gw tool directory
cd tools/gw

# 2. Install dependencies (requires uv)
uv sync

# 3. Verify installation
uv run gw --help

# 4. (Optional) See available commands
uv run gw doctor
```

**For local development**, gw should already be available. Just run:
```bash
cd tools/gw && uv run gw --help
```

> ⚠️ **DO NOT proceed with git/gh/wrangler commands until gw is installed and working.**

#### Why gw is Mandatory

| Raw Command | Problem | gw Equivalent |
|-------------|---------|---------------|
| `git push --force` | Can destroy remote history | `gw git push --write` (force blocked) |
| `git commit -m "x"` | No conventional commits enforcement | `gw git commit --write -m "feat: x"` |
| `wrangler d1 execute` | Requires UUIDs, no safety | `gw db query "SELECT..."` |
| `gh pr create` | No safety tier | `gw gh pr create --write` |
| `pnpm test` | Manual package detection | `gw test` (auto-detects package) |

#### Command Categories

```bash
# DATABASE (D1, KV, R2) — Read-only by default
gw db query "SELECT * FROM tenants"     # Safe read
gw db query --write "UPDATE..."         # Requires --write flag
gw db tables                            # List tables
gw db schema tenants                    # Show schema
gw tenant lookup autumn                 # Tenant info
gw cache list                           # Cache keys
gw cache purge --tenant autumn          # Purge (write op)

# GIT — Safety tiers enforced
gw git status                           # Always safe
gw git log                              # Always safe
gw git diff                             # Always safe
gw git commit --write -m "feat: ..."    # Requires --write
gw git push --write                     # Requires --write
gw git save --write                     # Quick add + WIP commit
gw git sync --write                     # Fetch + rebase + push

# GITHUB — Rate-limit aware
gw gh pr list                           # Always safe
gw gh pr view 123                       # Always safe
gw gh pr create --write                 # Requires --write
gw gh issue list                        # Always safe
gw gh run list                          # CI status

# DEV TOOLS — Auto-detects package from cwd
gw test                                 # Run tests
gw build                                # Build package
gw check                                # Type check
gw lint                                 # Lint
gw ci                                   # Full CI pipeline locally

# DIAGNOSTICS
gw status                               # Infrastructure overview
gw health                               # Service health
gw doctor                               # Diagnose issues
gw whoami                               # Current context
```

#### Blocked Operations (Agent Mode)

When running as an MCP server or with `GW_AGENT_MODE=1`, these are **completely blocked**:

```bash
# ❌ BLOCKED — Cannot run these in agent mode
gw git push --write --force             # Force push
gw git reset --write --force            # Hard reset
gw db query --write "DROP TABLE..."     # DDL operations
gw db query --write "DELETE FROM users" # Protected tables
```

#### MCP Server Integration

gw runs as an MCP server for Claude Code, exposing 26 tools directly:

```json
{
  "mcpServers": {
    "grove-wrap": {
      "command": "gw",
      "args": ["mcp", "serve"]
    }
  }
}
```

When using the MCP server, all safety restrictions apply automatically.

#### ⚠️ NEVER Use Raw Commands

```bash
# ❌ WRONG — Raw commands bypass safety
git commit -m "whatever"
git push origin main
wrangler d1 execute grove-engine-db --command "DELETE FROM posts"
gh pr create

# ✅ CORRECT — gw commands with safety
gw git commit --write -m "feat(auth): add session refresh"
gw git push --write
gw db query --write "DELETE FROM posts WHERE id = 'abc'"
gw gh pr create --write --title "feat: add feature"
```

#### Quick Reference

| Task | Command |
|------|---------|
| See all commands | `gw --help` |
| Database help | `gw db --help` |
| Git help | `gw git --help` |
| GitHub help | `gw gh --help` |
| MCP tools list | `gw mcp tools` |
| Check health | `gw doctor` |

---

### Core Behavior
- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary for achieving your goal
- ALWAYS prefer editing existing files to creating new ones
- NEVER proactively create documentation files (*.md) or README files unless explicitly requested

### Naming Conventions
- **Directories**: Use CamelCase (e.g., `VideoProcessor`, `AudioTools`, `DataAnalysis`)
- **Date-based paths**: Use skewer-case with YYYY-MM-DD (e.g., `logs-2025-01-15`, `backup-2025-12-31`)
- **No spaces or underscores** in directory names (except date-based paths)

### Task Tracking (GitHub Issues)
- **All tasks are tracked in [GitHub Issues](https://github.com/AutumnsGrove/GroveEngine/issues)** — not in local files
- **Check open issues** when starting a session to understand current priorities
- **Use labels** to filter by component (heartwood, lattice, amber, etc.) or type (bug, feature, enhancement)
- **Close issues** when work is complete — reference the issue number in commit messages (e.g., `fixes #123`)
- **Create new issues** for discovered work instead of adding TODO comments in code
- **Bulk issue creation** — When the user dumps a batch of TODOs, use skill: `grove-issues` to parse, deduplicate, and create properly structured issues
- **Check `COMPLETED.md`** for historical context on past decisions (frozen archive, pre-Jan 2026)

### Contributing
- **See `CONTRIBUTING.md`** for PR guidelines, commit conventions, and the AI agent section
- Keep Grove's warm, community-focused voice in documentation and user-facing text

### Git Workflow Essentials

> **⚠️ MANDATORY:** Use `gw git` commands, not raw git. See the gw section above.

**After completing major changes, you MUST commit your work using gw:**

```bash
# Stage and commit with conventional commits (enforced by gw)
gw git add --write src/lib/auth.ts
gw git commit --write -m "feat(auth): add session refresh"
gw git push --write
```

**Conventional Commits Format (enforced by gw):**
```bash
<type>(<scope>): <brief description>
```

**Common Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`

**Examples using gw:**
```bash
gw git commit --write -m "feat: add user authentication"
gw git commit --write -m "fix(ui): correct timezone bug"
gw git commit --write -m "docs: update README"
```

**Quick shortcuts:**
```bash
gw git save --write              # Stage all + WIP commit
gw git sync --write              # Fetch + rebase + push
gw git wip --write               # WIP commit (skips hooks)
```

**For complete details:** See `AgentUsage/git_guide.md` and `gw git --help`

#### Claude Code Hooks (Optional Enforcement)

To **block raw git/gh commands** and force gw usage, add to `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"$CLAUDE_TOOL_INPUT\" | grep -qE '^(git|gh|wrangler)\\s' && echo 'BLOCKED: Use gw commands instead (gw git, gw gh, gw db)' && exit 1 || exit 0"
          }
        ]
      }
    ]
  }
}
```

This hook intercepts Bash calls and blocks raw git/gh/wrangler commands, forcing use of gw.

### Pull Requests

Use conventional commits format for PR titles:
```
feat: Add dark mode toggle
fix: Correct timezone bug
```

Write a brief description of what the PR does and why. No specific format required.

---

## 🌲 Engine-First Pattern (CRITICAL)

> **The engine exists to prevent duplication. USE IT.**

### The Rule
**Before implementing ANY utility, component, or pattern in an app:**

```
1. CHECK: Does the engine already have this?
   └── YES → Import from @autumnsgrove/groveengine
   └── NO  → Continue to step 2

2. IMPLEMENT: Add it to the engine FIRST
   └── packages/engine/src/lib/...
   └── Export it properly in package.json

3. IMPORT: Then use it from the engine in your app
   └── import { thing } from '@autumnsgrove/groveengine/...'
```

### Why This Matters
We just deleted **11,925 lines** of duplicate code that accumulated because apps implemented their own versions instead of using or extending the engine. Never again.

### What the Engine Provides

| Category | Import Path | Examples |
|----------|-------------|----------|
| **UI Components** | `@autumnsgrove/groveengine/ui/chrome` | Header, Footer, Logo |
| **UI Utilities** | `@autumnsgrove/groveengine/ui/utils` | `cn()` (with tailwind-merge) |
| **Stores** | `@autumnsgrove/groveengine/ui/stores` | `seasonStore`, `themeStore` |
| **Nature Components** | `@autumnsgrove/groveengine/ui/nature` | Trees, creatures, palette |
| **Glass UI** | `@autumnsgrove/groveengine/ui` | GlassCard, GlassButton |
| **General Utils** | `@autumnsgrove/groveengine/utils` | csrf, sanitize, markdown |
| **Content** | `@autumnsgrove/groveengine/ui/content` | ContentWithGutter, TOC |
| **Forms** | `@autumnsgrove/groveengine/ui/forms` | Form components |
| **Gallery** | `@autumnsgrove/groveengine/ui/gallery` | Image galleries |
| **Charts** | `@autumnsgrove/groveengine/ui/charts` | Data visualization |
| **Icons** | `@autumnsgrove/groveengine/ui/icons` | Icon components |
| **Typography** | `@autumnsgrove/groveengine/ui/typography` | Text components |
| **Auth** | `@autumnsgrove/groveengine/auth` | Authentication utilities |

### Common Violations (Don't Do These)

```typescript
// ❌ BAD - Creating local utilities
// landing/src/lib/utils/cn.ts
export function cn(...classes) { return classes.filter(Boolean).join(' '); }

// ✅ GOOD - Import from engine
import { cn } from '@autumnsgrove/groveengine/ui/utils';
```

```typescript
// ❌ BAD - Local store implementations
// meadow/src/lib/stores/season.ts
export const season = createSeasonStore();

// ✅ GOOD - Import from engine
import { seasonStore } from '@autumnsgrove/groveengine/ui/stores';
```

```typescript
// ❌ BAD - Copying components locally
// landing/src/lib/components/nature/TreePine.svelte

// ✅ GOOD - Import from engine
import { TreePine } from '@autumnsgrove/groveengine/ui/nature';
```

### When You Need Something New

1. **Check the engine exports:** `grep -r "export" packages/engine/src/lib/`
2. **If it doesn't exist:** Add it to the engine, not the app
3. **Export it properly:** Update `packages/engine/package.json` exports
4. **Then import it:** Use in your app via `@autumnsgrove/groveengine/...`

### Quick Engine Export Check
```bash
# See all engine exports
cat packages/engine/package.json | grep -A2 '"\./'
```

---

## When to Use Skills

**This project uses Claude Code Skills for specialized workflows. Invoke skills using the Skill tool when you encounter these situations:**

### Authentication
- **When adding sign-in to a Grove app** → Use skill: `heartwood-auth`
- **When protecting admin routes** → Use skill: `heartwood-auth`
- **When validating user sessions** → Use skill: `heartwood-auth`
- **When integrating with Heartwood (GroveAuth)** → Use skill: `heartwood-auth`

### Secrets & API Keys
- **When managing API keys or secrets** → Use skill: `secrets-management`
- **Before implementing secrets loading** → Use skill: `secrets-management`
- **When integrating external APIs** → Use skill: `api-integration`

### Cloudflare Development
- **For D1 database queries** → Use `gw db` commands (see gw section above)
- **For KV operations** → Use `gw kv` commands
- **For R2 operations** → Use `gw r2` commands
- **For cache operations** → Use `gw cache` commands
- **When deploying to Cloudflare** → Use `gw deploy --write` or skill: `cloudflare-deployment`
- **When setting up Cloudflare MCP server** → Use skill: `cloudflare-deployment`

### Package Management
- **When using UV package manager** → Use skill: `uv-package-manager`
- **Before creating pyproject.toml** → Use skill: `uv-package-manager`
- **When managing Python dependencies** → Use skill: `uv-package-manager`

### Version Control
- **For all git operations** → Use `gw git` commands (see gw section above)
- **Before making a git commit** → `gw git commit --write -m "type: message"`
- **Before creating a pull request** → `gw gh pr create --write`
- **For git workflow and branching** → Use skill: `git-workflows` for guidance
- **When setting up git hooks** → Use skill: `git-hooks`

### Database Management
- **When working with databases** → Use skill: `database-management`
- **Before implementing data persistence** → Use skill: `database-management`
- **For database.py template** → Use skill: `database-management`

#### ⚠️ CRITICAL: Isolate Database Queries
**NEVER put multiple independent database queries in the same try/catch block.**
One failing query will block all subsequent queries, causing cascading failures.

```typescript
// ❌ BAD - cascading failure pattern
try {
  const settings = await db.prepare("SELECT * FROM settings").all();  // If table missing, this fails...
  const pages = await db.prepare("SELECT * FROM pages").all();        // ...and this NEVER runs!
} catch (error) {}

// ✅ GOOD - isolated query pattern
try {
  const settings = await db.prepare("SELECT * FROM settings").all();
} catch (error) { /* graceful fallback */ }

try {
  const pages = await db.prepare("SELECT * FROM pages").all();
} catch (error) { /* graceful fallback */ }
```

This lesson learned the hard way: a missing `site_settings` table silently blocked
the `pages` query for hours because they shared a try/catch block.

#### ⚠️ CRITICAL: Parallelize Independent Queries
**NEVER run independent database queries sequentially when they can run in parallel.**
Each D1 query has 100-300ms network latency. Sequential queries stack this latency.

```typescript
// ❌ BAD - sequential queries (900ms+ for 3 queries)
const settings = await db.prepare("SELECT * FROM settings").bind(tenantId).all();
const pages = await db.prepare("SELECT * FROM pages").bind(tenantId).all();
const config = await db.prepare("SELECT * FROM config").bind(tenantId).first();

// ✅ GOOD - parallel queries with individual error handling (~300ms total)
const [settings, pages, config] = await Promise.all([
  db.prepare("SELECT * FROM settings").bind(tenantId).all()
    .catch(err => { console.warn("Settings failed:", err); return null; }),
  db.prepare("SELECT * FROM pages").bind(tenantId).all()
    .catch(err => { console.warn("Pages failed:", err); return null; }),
  db.prepare("SELECT * FROM config").bind(tenantId).first()
    .catch(err => null),
]);
```

This lesson learned the hard way: sequential queries in layout files caused 4-6 second
page loads. Parallelizing reduced this to 1.5-2.5 seconds (~60% improvement).

**When to parallelize:** Queries that don't depend on each other's results.
**When NOT to:** Query B needs Query A's result (e.g., get user, then get user's posts).

#### Typed Query Builders (database.ts)
**Use the typed helpers in `packages/engine/src/lib/server/services/database.ts`** instead of raw SQL.

```typescript
import {
  queryOne, queryMany, execute,
  findById, findByIdOrThrow,
  insert, upsert, update,
  deleteWhere, deleteById,
  exists, count,
  getTenantDb
} from '$lib/server/services/database';

// ✅ GOOD - typed query helpers with validation
const user = await findById<User>(db, 'users', userId);
const posts = await queryMany<Post>(db, 'SELECT * FROM posts WHERE status = ?', ['published']);

// ✅ GOOD - insert with auto-generated ID and timestamps
const newId = await insert(db, 'posts', {
  title: 'Hello World',
  content: 'My first post'
});

// ✅ GOOD - upsert (insert or replace)
await upsert(db, 'settings', { id: 'theme', value: 'dark' });

// ✅ GOOD - multi-tenant operations (automatic tenant scoping)
const tenantDb = getTenantDb(db, { tenantId: locals.tenant.id });
const posts = await tenantDb.queryMany<Post>('posts', 'status = ?', ['published']);
// Automatically adds: WHERE tenant_id = ? AND status = ?
```

**Key Benefits:**
- **SQL injection prevention** - Table/column names validated against alphanumeric pattern
- **Type safety** - Generic types for query results
- **Auto timestamps** - `created_at`/`updated_at` handled automatically
- **Tenant isolation** - `TenantDb` enforces multi-tenant boundaries

#### ⚠️ CRITICAL: Multi-Tenant Proxy & CSRF Validation
**SvelteKit's built-in CSRF protection fails behind proxies like grove-router.**

Grove uses a multi-tenant architecture where `*.grove.place` subdomains are routed through
`grove-router` (a Cloudflare Worker proxy) to the main engine. This causes CSRF failures:

```
Browser → autumn.grove.place (Origin: https://autumn.grove.place)
                ↓
grove-router → sets X-Forwarded-Host: autumn.grove.place
                ↓
Engine Worker → sees Host: internal-worker.pages.dev
                ↓
SvelteKit CSRF → Origin ≠ Host → 403 Forbidden!
```

**The fix:** Configure `csrf.trustedOrigins` in `svelte.config.js`:

```javascript
// packages/engine/svelte.config.js
kit: {
  csrf: {
    checkOrigin: true,
    trustedOrigins: [
      "https://grove.place",
      "https://*.grove.place",  // Wildcards supported!
      "http://localhost:5173",  // Local dev
    ],
  },
}
```

This lesson learned the hard way: Timeline Curio config saves returned 403 for 3-4 days
because SvelteKit compared the browser's `Origin` header against the proxied `Host` header.
The `X-Forwarded-Host` header was correctly set by grove-router, but SvelteKit's CSRF
validation doesn't use it — you must explicitly whitelist trusted origins.

**Key insight:** When debugging 403s on form actions behind a proxy:
1. Check if `Origin` header matches what SvelteKit expects
2. Look at `X-Forwarded-Host` vs `Host` headers
3. Configure `csrf.trustedOrigins` for your proxy setup

### Research & Analysis
- **When researching technology decisions** → Use skill: `research-strategy`
- **When analyzing unfamiliar codebases** → Use skill: `research-strategy`
- **For systematic investigation** → Use skill: `research-strategy`

### Testing
- **To run tests** → Use `gw test` (auto-detects package from cwd)
- **To run full CI locally** → Use `gw ci`
- **When deciding what to test or reviewing test quality** → Use skill: `grove-testing`
- **Before writing JavaScript/TypeScript tests** → Use skill: `javascript-testing`
- **Before writing Python tests** → Use skill: `python-testing`
- **Before writing Go tests** → Use skill: `go-testing`
- **Before writing Rust tests** → Use skill: `rust-testing`

### Code Quality
- **When formatting or linting code** → Use skill: `code-quality`
- **Before major code changes** → Use skill: `code-quality`
- **For Black, Ruff, mypy usage** → Use skill: `code-quality`

### Project Setup & Infrastructure
- **When starting a new project** → Use skill: `project-scaffolding`
- **Setting up CI/CD pipelines** → Use skill: `cicd-automation`
- **When containerizing applications** → Use skill: `docker-workflows`

### Web Development
- **When building Svelte 5 applications** → Use skill: `svelte5-development`
- **For SvelteKit routing and forms** → Use skill: `svelte5-development`

### Grove UI Design
- **When creating or enhancing Grove pages** → Use skill: `grove-ui-design`
- **When adding decorative nature elements** → Use skill: `grove-ui-design`
- **When implementing glassmorphism effects** → Use skill: `grove-ui-design`
- **When working with seasonal themes** → Use skill: `grove-ui-design`
- **When building navigation patterns** → Use skill: `grove-ui-design`

### Grove Documentation
- **When writing help center articles** → Use skill: `grove-documentation`
- **When drafting specs or technical docs** → Use skill: `grove-documentation`
- **When writing user-facing text** → Use skill: `grove-documentation`
- **When writing onboarding, tooltips, or error messages** → Use skill: `grove-documentation`
- **When reviewing docs for voice consistency** → Use skill: `grove-documentation`

### Grove Specifications
- **When creating new technical specifications** → Use skill: `grove-spec-writing`
- **When reviewing specs for completeness** → Use skill: `grove-spec-writing`
- **When standardizing spec formatting** → Use skill: `grove-spec-writing`

### Museum Documentation
- **When writing documentation meant to be read by Wanderers** → Use skill: `museum-documentation`
- **When creating "how it works" content for knowledge base** → Use skill: `museum-documentation`
- **When documenting a codebase or system for curious visitors** → Use skill: `museum-documentation`
- **When writing elegant, narrative-driven technical explanations** → Use skill: `museum-documentation`

### Grove Naming
- **When naming a new service or feature** → Use skill: `walking-through-the-grove`
- **When finding a Grove-themed name** → Use skill: `walking-through-the-grove`

### Animal Skills (The Forest Ecosystem)
Grove's development workflow is organized as a forest ecosystem. Each animal has a specialty:

**Predators (Precision & Focus):**
- **When fixing a single specific issue** → Use skill: `panther-strike`

**Builders (Creation & Testing):**
- **When writing tests** → Use skill: `beaver-build`
- **When building multi-file features** → Use skill: `elephant-build`
- **When writing technical specifications** → Use skill: `swan-design`
- **When designing system architecture** → Use skill: `eagle-architect`
- **When integrating authentication** → Use skill: `spider-weave`

**Shapeshifters (UI & Design):**
- **When designing Grove UI with glassmorphism** → Use skill: `chameleon-adapt`

**Scouts (Exploration):**
- **When exploring unfamiliar codebases** → Use skill: `bloodhound-scout`

**Gatherers (Organization & Knowledge):**
- **When writing documentation** → Use skill: `owl-archive`
- **When creating GitHub issues from TODOs** → Use skill: `bee-collect`
- **When security auditing** → Use skill: `raccoon-audit`

**Speedsters (Performance):**
- **When optimizing performance** → Use skill: `fox-optimize`

**Heavy Lifters (Data):**
- **When migrating data** → Use skill: `bear-migrate`

**Watchers (Quality):**
- **When auditing accessibility** → Use skill: `deer-sense`
- **When hardening code for security by design** → Use skill: `turtle-harden`
- **When auditing for deep/subtle vulnerabilities** → Use skill: `turtle-harden`

**Guides (Navigation):**
- **When unsure which skill to use** → Use skill: `robin-guide`

**Gathering Chains (Multi-Animal Workflows):**
- **For complete feature lifecycle** → Use skill: `gathering-feature`
- **For system architecture** → Use skill: `gathering-architecture`
- **For UI + accessibility** → Use skill: `gathering-ui`
- **For auth + security** → Use skill: `gathering-security`
- **For data migration** → Use skill: `gathering-migration`

### Package Publishing
- **When publishing to npm** → Use skill: `npm-publish`
- **Before npm package releases** → Use skill: `npm-publish`

### CLI Development
- **When building terminal interfaces** → Use skill: `rich-terminal-output`
- **For Rich library patterns** → Use skill: `rich-terminal-output`

---

## Quick Reference

### How to Use Skills
Skills are invoked using the Skill tool. When a situation matches a skill trigger:
1. Invoke the skill by name (e.g., `skill: "secrets-management"`)
2. The skill will expand with detailed instructions
3. Follow the skill's guidance for the specific task

### Security Basics
- Store API keys in `secrets.json` (NEVER commit)
- Add `secrets.json` to `.gitignore` immediately
- Provide `secrets_template.json` for setup
- Use environment variables as fallbacks

### Available Skills Reference
| Skill | Purpose |
|-------|---------|
| `heartwood-auth` | Heartwood (GroveAuth) integration, sign-in, sessions |
| `secrets-management` | API keys, credentials, secrets.json |
| `api-integration` | External REST API integration |
| `database-management` | SQLite, database.py patterns |
| `git-workflows` | Commits, branching, conventional commits |
| `git-hooks` | Pre-commit hooks setup |
| `uv-package-manager` | Python dependencies with UV |
| `grove-testing` | Testing philosophy, what/when to test |
| `python-testing` | pytest, fixtures, mocking |
| `javascript-testing` | Vitest/Jest testing |
| `go-testing` | Go testing patterns |
| `rust-testing` | Cargo test patterns |
| `code-quality` | Black, Ruff, mypy |
| `project-scaffolding` | New project setup |
| `cicd-automation` | GitHub Actions workflows |
| `docker-workflows` | Containerization |
| `cloudflare-deployment` | Workers, KV, R2, D1 |
| `svelte5-development` | Svelte 5 with runes |
| `rich-terminal-output` | Terminal UI with Rich |
| `grove-ui-design` | Glassmorphism, seasons, forests, warm UI |
| `grove-documentation` | Grove voice, help articles, user-facing text |
| `grove-spec-writing` | Technical specifications with Grove formatting |
| `museum-documentation` | Elegant, narrative documentation for Wanderers |
| `walking-through-the-grove` | Finding Grove-themed names for new services |
| `grove-issues` | Parse brain dumps into structured GitHub issues |
| `npm-publish` | npm package publishing workflow |
| `turtle-harden` | Security hardening, defense in depth, secure by design |
| `research-strategy` | Systematic research |

---

## Code Style Guidelines

### Function & Variable Naming
- Use meaningful, descriptive names
- Keep functions small and focused on single responsibilities
- Add docstrings to functions and classes

### Error Handling
- Use try/except blocks gracefully
- Provide helpful error messages
- Never let errors fail silently

### File Organization
- Group related functionality into modules
- Use consistent import ordering:
  1. Standard library
  2. Third-party packages
  3. Local imports
- Keep configuration separate from logic

---

## Communication Style
- Be concise but thorough
- Explain reasoning for significant decisions
- Ask for clarification when requirements are ambiguous
- Proactively suggest improvements when appropriate

---

## Additional Resources

### Skills Documentation
Skills are the primary way to access specialized knowledge. Use the Skill tool to invoke them.
Skills are located in `.claude/skills/` and provide concise, actionable guidance.

### Extended Documentation
For in-depth reference beyond what skills provide, see:
**`AgentUsage/README.md`** - Master index of detailed documentation

---

*Last updated: 2026-02-01*
*Model: Claude Opus 4.5*
