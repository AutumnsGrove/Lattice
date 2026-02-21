# Documentation Accuracy Audit — 2026-02-21

> **Purpose:** Comprehensive cross-reference of all non-spec `.md` files against the actual codebase to identify stale, incorrect, or misleading documentation ahead of the 1.0 release.
>
> **Method:** 6 parallel codebase scouts read every doc and verified claims against actual code, configs, exports, directory structures, and feature implementations.
>
> **Scope:** 150+ files audited across AgentUsage, developer docs, help center articles, engine/libs/services docs, design system, museum, infrastructure, security, and core config files. Specs excluded per request.

---

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 6 | Entire documents describe wrong tech stack (Python instead of TypeScript) |
| **HIGH** | 10 | Incorrect feature descriptions, wrong tier data, broken import paths |
| **MEDIUM** | 14 | Partially outdated, incomplete listings, aspirational content without disclaimers |
| **LOW** | 8 | Minor inaccuracies, codename confusion, incomplete tables |
| **Total** | **38** | Across **~35 unique files** |

---

## Tier 1: CRITICAL — Wrong Tech Stack (BaseProject Leftovers)

These AgentUsage files were inherited from BaseProject and describe **Python workflows** for a **TypeScript/Cloudflare** project. They are entirely inapplicable.

| # | File | Problem |
|---|------|---------|
| 1 | `AgentUsage/project_setup.md` | References `NEW_PROJECT_SETUP.md` and `setup_new_project.sh` — neither exists. Describes single-project Python setup, not monorepo. |
| 2 | `AgentUsage/project_structure.md` | 462 lines describing single-project Python structure (VideoProcessor, SimpleBot examples). Lattice is a TypeScript monorepo with pnpm workspaces. |
| 3 | `AgentUsage/docker_guide.md` | All examples use Python 3.11 + uv. Lattice deploys to Cloudflare Workers, not Docker. |
| 4 | `AgentUsage/uv_usage.md` | 276-line guide to UV (Python package manager). Lattice uses pnpm. |
| 5 | `AgentUsage/database_setup.md` | Guide for local SQLite with Python `sqlite3` module. Lattice uses Cloudflare D1. |
| 6 | `AgentUsage/db_usage.md` | Marked "MANDATORY" but shows Python sqlite3 CRUD patterns. Lattice uses D1 via Workers bindings in TypeScript. |

**Recommended action:** Replace with Lattice-specific versions or delete and add redirects to the correct docs (AGENT.md, existing Cloudflare/D1 docs).

---

## Tier 2: HIGH — Incorrect Information

### Wrong Feature Descriptions / Broken Paths

| # | File | Problem |
|---|------|---------|
| 7 | `SETUP.md` (line 193) | Describes Ivy as "Link in bio" — actually a zero-knowledge mail client for @grove.place addresses. |
| 8 | `docs/design-system/DARK-MODE-GUIDE.md` (line 204) | Import path `@autumnsgrove/lattice/ui/components/chrome` — should be `@autumnsgrove/lattice/ui/chrome` (the `/components/` segment will cause import failures). |
| 9 | `docs/developer/integration/groveauth-handoff.md` | Tier names are `starter`/`professional`/`business` with 250/2000/unlimited posts. Actual tiers: `free`/`seedling`/`sapling`/`oak`/`evergreen` with 25/100/unlimited/unlimited/unlimited. Completely superseded. |
| 10 | `docs/developer/architecture/visual-overview.md` (section 3) | Seedling listed as 50 posts (actual: 100). Sapling listed as 250 posts (actual: unlimited). |

### Help Center — User-Facing Inaccuracies

| # | File | Problem |
|---|------|---------|
| 11 | `docs/help-center/articles/creating-your-account.md` | Claims Grove uses only Google OAuth. Reality: Heartwood supports Google, GitHub, magic links, AND passkeys. Users won't discover other sign-in methods. |
| 12 | `docs/help-center/articles/choosing-your-plan.md` | Claims Wanderer and Seedling get "All 10 fonts" — Wanderer (free) has `customFonts: false`. Font access is paid-tier only. Themes listed as "(coming soon)" for Seedling but config shows 3 themes available now. |
| 13 | `docs/help-center/articles/understanding-your-plan.md` | Same font availability error as choosing-your-plan.md — claims free tier gets fonts when it doesn't. |
| 14 | `docs/help-center/articles/what-are-curios.md` | Describes extensive curio features (guestbooks, hit counters, polls, shrines) as if implemented. No "coming soon" disclaimer unlike Meadow and Trails articles. |
| 15 | `AgentUsage/code_quality.md` | Entire guide focused on Python tools (Black, Ruff, mypy). Lattice uses ESLint + Prettier for TypeScript. |
| 16 | `libs/foliage/README.md` | Package name throughout is `@groveengine/foliage` — actual package.json declares `@autumnsgrove/foliage`. Install commands and imports will fail. |

---

## Tier 3: MEDIUM — Partially Outdated or Incomplete

### Stale Tier/Feature Data

| # | File | Problem |
|---|------|---------|
| 17 | `docs/developer/implementing-post-limits.md` | Example code uses `starter`/`oak`/`evergreen`/`centennial` tier names. Actual tiers use `free`/`seedling`/`sapling`/`oak`/`evergreen`. |
| 18 | `docs/help-center/articles/what-is-ivy.md` | Claims email is "Oak tier and above" — actually email forwarding starts at Sapling ($12/mo), full mailbox at Oak. Also says "currently being built" which contradicts other docs. |
| 19 | `docs/help-center/articles/understanding-the-admin-panel.md` | Doesn't explain tier-gating of analytics (Oak+) or Trails (Sapling+). Lists sections without noting which are hidden on lower tiers. |

### Incomplete Listings

| # | File | Problem |
|---|------|---------|
| 20 | `README.md` | Apps table shows 7 entries — actual count is 9 (missing Amber and Ivy). Services table shows 5 — actual count is 9 (missing Forage, Amber worker, Pulse, email-render). |
| 21 | `README.md` | Lists service "Passage" at `services/grove-router` — codebase uses "grove-router" everywhere, "Passage" codename not used. |
| 22 | `docs/developer/architecture/multi-tenant-architecture.md` | Status says "Planning (2025-12-10)" with incomplete checkboxes, but multi-tenant features are already implemented (TenantDO, tenant routing, D1 tenant queries). |

### AgentUsage Guides Missing Lattice Context

| # | File | Problem |
|---|------|---------|
| 23 | `AgentUsage/git_guide.md` | Shows generic git commands. AGENT.md mandates `gw` (Grove Wrap) for all git operations. No mention of `gw git ship`, `gw ci`, or `gw git pr-prep`. |
| 24 | `AgentUsage/svelte5_guide.md` | Generic SvelteKit guide. Missing critical Lattice requirements: engine Tailwind preset, engine-first imports, monorepo component sharing. |
| 25 | `AgentUsage/cloudflare_guide.md` | Generic wrangler guide. Missing Loom DO pattern, Rings analytics, AI Gateway integration, multi-tenant D1 patterns. |
| 26 | `AgentUsage/testing_javascript.md` | Assumes single SvelteKit project, not monorepo with 9 apps. Missing guidance on workspace testing and cross-package test execution. |
| 27 | `AgentUsage/api_usage.md` | All examples reference external APIs (GitHub, OpenWeather). Missing guidance on internal Lattice APIs, service bindings, D1 access patterns. |

### Import Path / Package Issues

| # | File | Problem |
|---|------|---------|
| 28 | `docs/design-system/COMPONENT-REFERENCE.md` (line 689) | Imports stores from `@autumnsgrove/lattice/ui/chrome` — works (re-export) but canonical path is `@autumnsgrove/lattice/ui/stores`. Same doc uses correct path on line 724. |
| 29 | `libs/vineyard/README.md` | Import examples use `@autumnsgrove/vineyard/vineyard` — likely should be `@autumnsgrove/vineyard`. |

### Process / Governance

| # | File | Problem |
|---|------|---------|
| 30 | `docs/help-center/DOCS-MAINTENANCE.md` | Prescribes `last_verified` and `verified_by` frontmatter fields, but articles use `lastUpdated` instead. Automated freshness workflow won't trigger correctly. |

---

## Tier 4: LOW — Minor Inaccuracies

| # | File | Problem |
|---|------|---------|
| 31 | `libs/engine/FONT_CDN_MIGRATION.md` | Marked "COMPLETED" but 20 font files still exist locally at `libs/engine/static/fonts/`. Migration step 4 (remove local fonts) appears incomplete. |
| 32 | `docs/museum/MUSEUM.md` (line 78) | States "64 mathematically-driven SVG components" — actual count is 65. |
| 33 | `AgentUsage/house_agents.md` | Only documents user-level agents in `~/.claude/agents/`, doesn't mention project-level agents in `.claude/agents/` (grove-runner, grove-coder, grove-scout, grove-verifier). |
| 34 | `AgentUsage/pre_commit_hooks/setup_guide.md` | Suggests installing hooks for Python/Go/Rust — Lattice is TypeScript-only. |
| 35 | `libs/engine/src/lib/ui/components/typography/README.md` | FontProvider referenced in examples but not in component table. |
| 36 | `services/forage/DOMAIN_SETUP.md` | Setup instructions may be aspirational — unclear if `forage-api.grove.place` is actually configured. |
| 37 | `libs/engine/src/lib/zephyr/README.md` | Hardcoded worker URL in env example may be stale post-redeployment. |
| 38 | `docs/developer/cloudflare-infrastructure.md` | D1 pricing dated "as of 2025" — should be verified against current Cloudflare pricing. |

---

## Systemic Patterns

### Pattern 1: BaseProject Inheritance
The `AgentUsage/` directory contains generic guides from the BaseProject template that were never customized for Lattice. **6 files are entirely Python-centric** and another **5 files lack Lattice-specific context** (gw commands, engine-first imports, monorepo structure).

### Pattern 2: Stale Tier Nomenclature
At least **4 documents** still reference the old tier system (`starter`/`professional`/`business`) or have incorrect post limits. The source of truth is `libs/engine/src/lib/config/tiers.ts`.

### Pattern 3: Help Center Aspirational Content
Several help center articles describe features as available that are **planned but not implemented**, without the "coming soon" disclaimers used in other articles (Meadow, Trails).

### Pattern 4: Incomplete Service/App Listings
Root-level docs (README.md, SETUP.md) haven't kept pace with new apps and services being added.

---

## Recommended Priority Order

1. **Fix user-facing help center errors** (auth methods, tier features) — these directly confuse real users
2. **Replace or delete Python-centric AgentUsage files** — these actively mislead agent workflows
3. **Update tier nomenclature** across developer docs — stale data causes architectural confusion
4. **Update README.md/SETUP.md** app and service listings — first-impression docs for contributors
5. **Fix broken import paths** in design system docs — causes compilation errors
6. **Add "coming soon" disclaimers** to aspirational help center articles
7. **Address minor LOW-tier items** as time permits

---

_Audit conducted: 2026-02-21_
_Method: 6 parallel grove-scout agents cross-referencing docs against codebase_
_Files scanned: 150+ documentation files, 50+ source files for verification_
