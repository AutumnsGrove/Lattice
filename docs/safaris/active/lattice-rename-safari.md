---
title: "Lattice Rename Safari — From Lattice to @autumnsgrove/lattice"
status: active
category: safari
---

# Lattice Rename Safari — From Lattice to @autumnsgrove/lattice

> The structural framework deserves its proper name. Lattice is what holds Grove together — time to make the code match the vision.
> **Aesthetic principle**: Surgical precision. Every reference changed, nothing broken, zero downtime.
> **Scope**: All code, config, tooling, docs, CI/CD, npm, and GitHub references to "Lattice" or "@autumnsgrove/lattice"

**GitHub Issue**: #451 — "Rename repository and packages to Lattice"

---

## Ecosystem Overview

**900 total occurrences** of "Lattice" or "@autumnsgrove/lattice" across **378 files**.

But the real terrain breaks down into clear zones:

| Zone                                      | Files | Occurrences | Difficulty                           |
| ----------------------------------------- | ----- | ----------- | ------------------------------------ |
| Package Identity (package.json `name`)    | 1     | 1           | Easy — but cascades everywhere       |
| Consumer Dependencies (package.json deps) | 10    | 10          | Mechanical                           |
| Import Statements (`.ts`/`.svelte`)       | ~251  | ~600+       | Large — but 100% find-and-replace    |
| String Literals in Code                   | ~27   | ~40         | Needs case-by-case review            |
| Config Files (wrangler, CI, vitest)       | ~15   | ~20         | Mixed — some are just comments       |
| Tools (`gf` Go code, `gw` Python)         | ~15   | ~40         | Go module path is fiddly             |
| Agent Skills (`.claude/skills/`)          | 22    | ~30         | Mechanical find-and-replace          |
| AGENT.md + CLAUDE.md                      | 2     | ~50         | Important — agents read these first  |
| Documentation (specs, plans, guides)      | ~80+  | ~200+       | Low priority — update over time      |
| Snapshots/Archives                        | ~40+  | ~60+        | **DO NOT TOUCH** — historical record |
| pnpm-lock.yaml                            | 1     | 8           | Auto-regenerated, don't edit         |
| npm Registry                              | 1     | —           | Publish new, deprecate old           |
| GitHub Repo Name                          | 1     | —           | Cascades to Go module path           |

---

## Route Map — The Safari Stops

### Zone 1: THE SOURCE OF TRUTH 🔴

_The headwaters. Everything flows from here._

| #   | Stop             | File                           | What Changes                                      |
| --- | ---------------- | ------------------------------ | ------------------------------------------------- |
| 1   | Package Identity | `packages/engine/package.json` | `name: "@autumnsgrove/lattice"`, `repository.url` |
| 2   | Root Monorepo    | `package.json` (root)          | `test:engine` script filter name                  |
| 3   | pnpm-lock.yaml   | `pnpm-lock.yaml`               | Auto-regenerated after `pnpm install`             |

### Zone 2: CONSUMER DEPENDENCIES 🟠

_Every package that drinks from the engine._

| #   | Stop               | File                                                          |
| --- | ------------------ | ------------------------------------------------------------- |
| 4   | Landing            | `packages/landing/package.json`                               |
| 5   | Plant              | `packages/plant/package.json`                                 |
| 6   | Meadow             | `packages/meadow/package.json`                                |
| 7   | Clearing           | `packages/clearing/package.json`                              |
| 8   | Terrarium          | `packages/terrarium/package.json`                             |
| 9   | Domains            | `packages/domains/package.json`                               |
| 10  | Login              | `packages/login/package.json`                                 |
| 11  | Durable Objects    | `packages/durable-objects/package.json`                       |
| 12  | Deprecated Example | `_deprecated/example-site-deprecated-2025-12-31/package.json` |

All change: `"@autumnsgrove/lattice": "workspace:*"` → `"@autumnsgrove/lattice": "workspace:*"`

### Zone 3: IMPORT PATHS — THE BIG ONE 🟠

_251 source files. ~600+ import statements. The bulk of the work._

| #   | Package            | Files | Sample Import                               |
| --- | ------------------ | ----- | ------------------------------------------- |
| 13  | engine (self-refs) | ~60   | `from '@autumnsgrove/lattice/ui'`           |
| 14  | landing            | ~80   | `from '@autumnsgrove/lattice/ui/chrome'`    |
| 15  | plant              | ~25   | `from '@autumnsgrove/lattice/grafts/login'` |
| 16  | meadow             | ~20   | `from '@autumnsgrove/lattice/ui'`           |
| 17  | clearing           | ~10   | `from '@autumnsgrove/lattice/ui'`           |
| 18  | terrarium          | ~3    | `from '@autumnsgrove/lattice/ui'`           |
| 19  | domains            | ~10   | `from '@autumnsgrove/lattice/ui'`           |
| 20  | login              | ~3    | `from '@autumnsgrove/lattice/ui'`           |
| 21  | durable-objects    | ~10   | `from '@autumnsgrove/lattice/threshold'`    |
| 22  | vineyard           | ~3    | `from '@autumnsgrove/lattice/vineyard'`     |
| 23  | workers            | ~2    | `from '@autumnsgrove/lattice/...'`          |
| 24  | deprecated example | ~5    | Can skip or update                          |

**Strategy**: Global find-and-replace `@autumnsgrove/lattice` → `@autumnsgrove/lattice` across all `.ts`, `.svelte`, `.js` files. This is safe because the subpath structure (`/ui`, `/grafts`, `/threshold`, etc.) stays identical.

### Zone 4: STRING LITERALS IN CODE 🟡

_"Lattice" as a display name, comment, or identifier — NOT an import._

| #   | Stop              | File                                                                         | Context                 |
| --- | ----------------- | ---------------------------------------------------------------------------- | ----------------------- |
| 25  | Chrome defaults   | `engine/src/lib/ui/components/chrome/defaults.ts`                            | Likely a display name   |
| 26  | Config links      | `engine/src/lib/config/links.ts`                                             | URL or GitHub link      |
| 27  | Heartwood errors  | `engine/src/lib/heartwood/errors.ts`                                         | Error message strings   |
| 28  | Heartwood limits  | `engine/src/lib/heartwood/limits.ts`                                         | Comment                 |
| 29  | Heartwood auth    | `heartwood/src/auth/index.ts`                                                | Comment or service name |
| 30  | Heartwood types   | `heartwood/src/types.ts`                                                     | Type or comment         |
| 31  | Heartwood queries | `heartwood/src/db/queries.ts`                                                | Comment                 |
| 32  | UI index          | `engine/src/lib/ui/index.ts`                                                 | Package banner comment  |
| 33  | UI tokens         | `engine/src/lib/ui/tokens/index.ts`                                          | Comment                 |
| 34  | Git index         | `engine/src/lib/git/index.ts`                                                | Repo reference          |
| 35  | Markdown utils    | `engine/src/lib/utils/markdown.ts`                                           | Comment                 |
| 36  | Vitest config     | `engine/vitest.config.ts`                                                    | Alias or comment        |
| 37  | Test setup        | `engine/tests/utils/setup.ts`                                                | Comment                 |
| 38  | DO index          | `durable-objects/src/index.ts`                                               | Service name or comment |
| 39  | Timeline voices   | `workers/timeline-sync/src/voices.ts`                                        | Comment                 |
| 40  | Timeline config   | `workers/timeline-sync/src/config.ts`                                        | Comment                 |
| 41  | Journey test      | `engine/src/lib/curios/journey/index.test.ts`                                | Test description        |
| 42  | Timeline presets  | `engine/src/lib/curios/timeline/voices/presets/minimal.ts`                   | Comment                 |
| 43  | Billing API       | `engine/src/routes/api/billing/+server.ts`                                   | Comment                 |
| 44  | Timeline APIs     | `engine/src/routes/api/curios/timeline/*.ts`                                 | Comments                |
| 45  | Landing pages     | `landing/src/routes/credits/+page.svelte`, `workshop`, `contribute`, `arbor` | Display text            |

**Strategy**: Each needs individual review. Some become "Lattice", some stay as historical references, some are comments that should update.

### Zone 5: CONFIGURATION FILES 🟡

_Infrastructure that references the old name._

| #   | Stop                   | File                                           | What Changes                              |
| --- | ---------------------- | ---------------------------------------------- | ----------------------------------------- |
| 46  | Engine wrangler        | `packages/engine/wrangler.toml`                | Comment: `# Lattice -` → `# Lattice -`    |
| 47  | DO wrangler            | `packages/durable-objects/wrangler.toml`       | Comment about service binding             |
| 48  | Heartwood wrangler     | `packages/heartwood/wrangler.toml`             | Comment about D1 binding                  |
| 49  | Post-migrator wrangler | `packages/post-migrator/wrangler.toml`         | Comment                                   |
| 50  | Grove-router wrangler  | `packages/grove-router/wrangler.toml`          | Comment about proxying                    |
| 51  | Deploy workflow        | `.github/workflows/deploy-engine.yml`          | Name: `Deploy Lattice` → `Deploy Lattice` |
| 52  | Auto-label workflow    | `.github/workflows/auto-label-issues.yml`      | Regex pattern match                       |
| 53  | Diagram mappings       | `diagrams/diagram_mappings.json`               | Likely display name                       |
| 54  | Site config            | `packages/engine/UserContent/site-config.json` | Display name                              |
| 55  | Engine vitest          | `packages/engine/vitest.config.ts`             | Alias path                                |

### Zone 6: TOOLING (gf + gw) 🟠

_The tools that search and manage the repo._

| #   | Stop                  | Files                                                               | What Changes                                          |
| --- | --------------------- | ------------------------------------------------------------------- | ----------------------------------------------------- |
| 56  | gf Go module path     | `tools/grove-find-go/go.mod`                                        | `github.com/AutumnsGrove/Lattice/...` → new repo path |
| 57  | gf Go imports         | All `tools/grove-find-go/cmd/*.go` + `internal/**/*.go` (~12 files) | Go import paths                                       |
| 58  | gf Go search patterns | `tools/grove-find-go/cmd/quality.go`                                | `@autumnsgrove/lattice` search strings                |
| 59  | gf Python search      | `tools/grove-find/src/grove_find/commands/quality.py`               | `@autumnsgrove/lattice` patterns                      |
| 60  | gf Python CLI         | `tools/grove-find/src/grove_find/cli.py`                            | Help text                                             |
| 61  | gw packages           | `tools/gw/src/gw/packages.py`                                       | Docstring                                             |
| 62  | gw config             | `tools/gw/src/gw/config.py`                                         | Repo name reference                                   |
| 63  | gw CI command         | `tools/gw/src/gw/commands/queen/ci.py`                              | `--repo` default                                      |
| 64  | gw publish            | `tools/gw/src/gw/commands/publish.py`                               | Package name                                          |
| 65  | gw tests              | `tools/gw/tests/test_gh.py`                                         | Test assertions                                       |
| 66  | gf Makefile           | `tools/grove-find-go/Makefile`                                      | Build paths                                           |

**Critical note**: The Go module path (`github.com/AutumnsGrove/Lattice/...`) depends on the GitHub repo rename. If the repo becomes `AutumnsGrove/Lattice`, every Go import changes. If the repo stays `AutumnsGrove/Lattice`, only the `@autumnsgrove/lattice` npm strings change. **This is a key decision point.**

### Zone 7: AGENT SKILLS & CONFIGS 🟡

_22 skill files reference the old import paths._

| #   | Stop                          | Count                                      |
| --- | ----------------------------- | ------------------------------------------ |
| 67  | `.claude/skills/**/*.md`      | 22 files, ~30 refs                         |
| 68  | AGENT.md                      | ~50 refs — the main agent instruction file |
| 69  | CLAUDE.md (project root)      | Minimal refs (points to AGENT.md)          |
| 70  | `.claude/settings.local.json` | 1 ref                                      |

**Strategy**: Mechanical find-and-replace after all code changes are verified.

### Zone 8: DOCUMENTATION 🟢

_Specs, plans, guides — important but low urgency._

| #   | Stop                                 | Count             | Priority                     |
| --- | ------------------------------------ | ----------------- | ---------------------------- |
| 71  | `docs/specs/*.md`                    | ~20 files         | Medium — active reference    |
| 72  | `docs/plans/**/*.md`                 | ~30 files         | Low — historical context     |
| 73  | `docs/guides/*.md`                   | ~5 files          | Medium                       |
| 74  | `docs/security/*.md`                 | ~5 files          | Low                          |
| 75  | `docs/design-system/*.md`            | ~4 files          | Medium — component reference |
| 76  | `docs/philosophy/*.md`               | ~5 files          | Low — historical             |
| 77  | `README.md` (root)                   | 1 file            | High                         |
| 78  | `SETUP.md`                           | 1 file            | High                         |
| 79  | `CONTRIBUTING.md`                    | 1 file            | High                         |
| 80  | `COMPLETED.md` / `TODOS.md`          | 2 files           | Low                          |
| 81  | `packages/engine/README.md`          | 1 file            | High                         |
| 82  | `packages/engine/CLIENT_TEMPLATE.md` | 1 file (33 refs!) | High                         |
| 83  | Various package READMEs              | ~5 files          | Medium                       |

### Zone 9: EXTERNAL / REGISTRY 🔴

_The public-facing identity._

| #   | Stop               | What                                                             |
| --- | ------------------ | ---------------------------------------------------------------- |
| 84  | GitHub Repo Rename | `AutumnsGrove/Lattice` → `AutumnsGrove/Lattice` (or keep?)       |
| 85  | npm Publish        | Publish `@autumnsgrove/lattice` to GitHub Packages               |
| 86  | npm Deprecate      | Mark `@autumnsgrove/lattice` as deprecated with redirect message |
| 87  | Cloudflare Pages   | Project name already `grove-lattice` — no change needed!         |

### Zone 10: DO NOT TOUCH 🚫

_Historical records. Leave them as-is._

| Category         | Files     | Reason                            |
| ---------------- | --------- | --------------------------------- |
| `snapshots/`     | ~40 files | Point-in-time records of the repo |
| `archives/`      | ~5 files  | Deprecated prompts and plans      |
| `_deprecated/`   | ~8 files  | Already marked deprecated         |
| `pnpm-lock.yaml` | 1 file    | Auto-regenerated, never hand-edit |

---

## Observation Notes — Key Findings

### 1. The Happy Surprise: Cloudflare Pages

The deploy command already uses `--project-name=grove-lattice`. The Cloudflare project was named correctly from the start! No infrastructure migration needed.

### 2. The Go Module Problem

`tools/grove-find-go/go.mod` uses `github.com/AutumnsGrove/Lattice/tools/grove-find-go` as the module path. This cascades to **every single Go import** across ~12 files. If the GitHub repo renames to `Lattice`, all Go imports change. If the repo name stays, only the npm package name changes.

**Recommendation**: Rename the GitHub repo too. GitHub auto-redirects the old URL, and Go modules support `go.mod` `replace` directives for transition. Since you're bringing sister projects internal, the repo rename is the right time.

### 3. Import Path Rename is 100% Safe

All `@autumnsgrove/lattice/...` imports use subpaths (`/ui`, `/grafts`, `/threshold`, etc.) that remain identical. The only thing changing is the root package name. A global find-and-replace is completely safe here — no ambiguity, no partial matches, no risk of over-replacing.

### 4. The CLIENT_TEMPLATE.md Hotspot

`packages/engine/CLIENT_TEMPLATE.md` has **33 occurrences** — it's a template for setting up new consumer sites. This needs careful updating because it's documentation people actually copy-paste from.

### 5. Skills Are Agent-Facing, Not User-Facing

The 22 skill files reference `@autumnsgrove/lattice` in example code and instructions. These are read by AI agents, not users. Still important to update (agents will try the old imports), but lower risk than production code.

### 6. AGENT.md is the Keystone

AGENT.md has ~50 references and is the first thing every agent session reads. It currently says: _"Use 'Lattice' in user-facing documentation and marketing; use 'Lattice' for internal references."_ After the rename, this guidance inverts — "Lattice" becomes the internal name too.

---

## Design Spec — The Rename Plan

### Phase 0: Preparation (before any code changes)

- [ ] **Decision**: Rename GitHub repo? `AutumnsGrove/Lattice` → `AutumnsGrove/Lattice`
  - Pro: Clean break, Go module path matches, URLs are cleaner
  - Con: Breaks existing bookmarks (GitHub redirects mitigate), Go module transition
  - **Recommendation**: YES — do it. GitHub redirects old URLs automatically.
- [ ] **Decision**: Keep the directory name `packages/engine/` or rename to `packages/lattice/`?
  - Pro of keeping: Less churn, `engine/` is still descriptive
  - Pro of renaming: Full consistency
  - **Recommendation**: Keep `packages/engine/`. The directory name is a local convenience, not a public identity. Renaming it changes every wrangler.toml path, every CI workflow path, and adds zero user value.
- [ ] Create a new branch: `rename/lattice`
- [ ] Snapshot current state: `gw snapshot` (so we can verify nothing breaks)

### Phase 1: Package Identity (Stops 1-3)

_Change the source of truth first._

- [ ] Update `packages/engine/package.json`: name → `@autumnsgrove/lattice`
- [ ] Update `packages/engine/package.json`: repository URL
- [ ] Update root `package.json`: test filter name
- [ ] Run `pnpm install` to regenerate `pnpm-lock.yaml`

### Phase 2: Consumer Dependencies (Stops 4-12)

_Update all packages that import from the engine._

- [ ] Global find-replace in all `package.json` files: `"@autumnsgrove/lattice"` → `"@autumnsgrove/lattice"`
- [ ] Run `pnpm install` again to verify lockfile resolves

### Phase 3: Import Paths — The Big Replace (Stops 13-24)

_This is the bulk of the work — 251 files._

- [ ] Global find-replace across all `.ts`, `.svelte`, `.js` files:
      `@autumnsgrove/lattice` → `@autumnsgrove/lattice`
- [ ] Verify with: `gf --agent engine` (should find all new imports)
- [ ] Verify zero remaining: `grep -r "@autumnsgrove/lattice" packages/` (should be empty)

### Phase 4: String Literals (Stops 25-45)

_Case-by-case review of "Lattice" as a display name._

- [ ] Review each of the ~27 source files with string "Lattice"
- [ ] Change to "Lattice" where it's a product/package name
- [ ] Leave as "Lattice" where it's clearly historical context
- [ ] Update error messages, comments, and display strings

### Phase 5: Configuration (Stops 46-55)

- [ ] Update wrangler.toml comments across 5 packages
- [ ] Update `.github/workflows/deploy-engine.yml` name
- [ ] Update `.github/workflows/auto-label-issues.yml` regex
- [ ] Update `diagrams/diagram_mappings.json`
- [ ] Update `packages/engine/UserContent/site-config.json`

### Phase 6: Tooling (Stops 56-66)

- [ ] Update `gf` Go module path in `go.mod` (depends on repo rename)
- [ ] Update all Go import paths (~12 files)
- [ ] Update `gf` search patterns in `quality.go` and `quality.py`
- [ ] Update `gw` defaults: repo name, package name, docstrings
- [ ] Rebuild `gf` binary: `cd tools/grove-find-go && make build`
- [ ] Reinstall: `bash tools/grove-find-go/install.sh`
- [ ] Reinstall gw: `uv tool install --editable tools/gw --force`

### Phase 7: Agent Instructions (Stops 67-70)

- [ ] Update all 22 `.claude/skills/**/*.md` files
- [ ] Update `AGENT.md` — remove the "Lattice for internal" guidance, make Lattice the universal name
- [ ] Update `.claude/settings.local.json`

### Phase 8: Documentation (Stops 71-83)

- [ ] Update high-priority docs: README.md, SETUP.md, CONTRIBUTING.md, engine README, CLIENT_TEMPLATE.md
- [ ] Update active specs and guides
- [ ] Leave historical docs (completed plans, old snapshots) as-is

### Phase 9: External (Stops 84-87)

- [ ] Rename GitHub repo (if decided in Phase 0)
- [ ] Publish `@autumnsgrove/lattice` to npm/GitHub Packages
- [ ] Deprecate `@autumnsgrove/lattice` with message pointing to lattice
- [ ] Update any external links (Cloudflare dashboard is already `grove-lattice`)

### Phase 10: Verification

- [ ] `pnpm install` — lockfile resolves cleanly
- [ ] `pnpm run package` in `packages/engine/` — builds without errors
- [ ] `pnpm run build` in each consumer package — no import errors
- [ ] `gf --agent engine` — finds all new `@autumnsgrove/lattice` imports
- [ ] `grep -r "lattice" packages/ --include="*.ts" --include="*.svelte"` — zero results
- [ ] Run full test suite
- [ ] Type-check all 6 packages

---

## Expedition Summary

### By the numbers

| Metric                                           | Count |
| ------------------------------------------------ | ----- |
| Total files containing "Lattice"/"lattice"       | 378   |
| Total occurrences                                | ~900  |
| Files needing code changes (import paths)        | ~261  |
| Files needing config/tool changes                | ~35   |
| Files needing doc updates                        | ~85   |
| Files to leave untouched (snapshots/archives)    | ~50   |
| Estimated mechanical changes (find-replace safe) | ~850  |
| Estimated manual review needed                   | ~50   |

### Health assessment

| Zone              | Status               | Notes                                          |
| ----------------- | -------------------- | ---------------------------------------------- |
| Package Identity  | 🟢 Straightforward   | One file, cascades to lockfile                 |
| Consumer Deps     | 🟢 Mechanical        | 10 package.json files                          |
| Import Paths      | 🟢 Safe find-replace | Biggest zone but simplest — no ambiguity       |
| String Literals   | 🟡 Needs judgment    | ~27 files, each needs a human eye              |
| Config Files      | 🟢 Mostly comments   | Low risk                                       |
| Tooling (Go)      | 🟠 Tricky            | Go module path depends on repo rename decision |
| Agent Skills      | 🟢 Mechanical        | 22 files, find-replace                         |
| Documentation     | 🟡 Large surface     | Prioritize active docs, ignore historical      |
| External/Registry | 🟠 Irreversible      | Repo rename + npm publish are one-way          |

### Recommended trek order

1. **Phase 0** — Make the decisions (repo rename yes/no, directory rename no)
2. **Phase 1-2** — Package identity + dependencies (foundation)
3. **Phase 3** — Import paths (the big one — do it all at once)
4. **Phase 10 (partial)** — Verify builds and tests before continuing
5. **Phase 4-5** — String literals + config (cleanup)
6. **Phase 6** — Tooling (Go rebuild needed)
7. **Phase 7-8** — Agent instructions + docs
8. **Phase 9** — External (repo rename, npm publish)
9. **Phase 10 (full)** — Final verification

### Cross-cutting themes

1. **The rename is essentially two operations**: npm package name change (mechanical) + display name change (judgment-based). Don't conflate them.
2. **Go module path is the only genuinely tricky part** — it's coupled to the GitHub repo URL. If you don't rename the repo, Go stays unchanged.
3. **pnpm workspace protocol (`workspace:*`)** means consumer packages automatically resolve to the local engine. Once the `name` field changes, all deps update via `pnpm install`.
4. **Cloudflare was already ahead** — the Pages project is `grove-lattice`. The deploy command is already correct.
5. **No database changes needed** — table names, column names, and D1 bindings don't reference "Lattice" at the schema level.
6. **The `packages/engine/` directory stays** — renaming it would add massive churn for zero user benefit. "Engine" is still what it is; "Lattice" is what it's called.

---

> _The fire dies to embers. The journal is full — 87 stops mapped, 10 phases designed, the whole landscape charted. The rename from Lattice to Lattice is vast but almost entirely mechanical. The hard decisions are few: rename the repo (yes), keep the directory name (yes). Everything else is find-and-replace with a steady hand._
>
> _Tomorrow, the animals go to work. But tonight? Tonight was the drive. And it was glorious._ 🚙
