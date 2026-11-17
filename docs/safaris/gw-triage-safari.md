# GW Triage Safari — The Reckoning

> "We built a wrapper for every CLI in the forest. Now every CLI is harder to use."
> **Goal**: Triage 76 Go files / 27,738 lines into KEEP, SIMPLIFY, or KILL.

---

## Ecosystem Overview

**76 files** in `tools/grove-wrap-go/cmd/`
**27,738 lines** of Go wrapping git, gh, wrangler, pnpm, Todoist, Zephyr, Warden, and more.

The core problem: gw was meant to make CLIs _easier_, but every subcommand is implemented a la carte. Missing flags = harder than raw CLI. Agents frequently get redirected to raw commands because gw versions are slower and less reliable.

### The Root Cause

Every `gw git log`, `gw git diff`, `gw d1 execute` is a hand-rolled Go reimplementation of flags that the underlying CLI already handles perfectly. Each one:
- Supports a subset of flags (missing the ones you need _this time_)
- Adds JSON mode nobody uses interactively
- Adds safety tier checks for operations that don't need guarding
- Adds pretty UI output that agents ignore

The safety tier system (READ/WRITE/DANGER) is the one genuinely good idea — but it's buried under 27K lines of passthrough.

---

## Verdicts

### KEEP — Genuine Value-Add (can't do this with raw CLIs)

| Command | Lines | Why it earns its place |
|---------|-------|----------------------|
| `gw secret` | 813 | Encrypted local vault with 3-tier resolution. No raw CLI equivalent. |
| `gw publish` | 1,167 | npm registry swap workflow (GitHub Packages ↔ npm). Multi-step orchestration. |
| `gw warden` | 754 | Warden API client. No other way to manage agents/credentials. |
| `gw social` | 384 | Zephyr broadcasting. Unique integration. |
| `gw git worktree finish` | ~100 | The ONE git shortcut actually used. Cleans up worktree after ship. |
| `gw gh issue` | ~782 | `list` is used daily by the human. `create`/`view` used by `bee-collect` skill. The browse TUI is nice here. Keep the full issue subcommand. |
| `gw update` | 464 | Self-update from local source. No other way to do this cleanly. |
| `gw todo` | 778 | Todoist API client. Used by goose-migrate. |
| `gw dev` (skeleton) | 66 | Will be built out in Phase 3 local dev. Keep the parent command. |

**Total KEEP: ~5,608 lines (~20% of codebase)**

### KILL — Thin Passthrough, Harder Than Raw CLI

| Command Group | Files | Lines | Why it dies |
|---------------|-------|-------|-------------|
| `gw git` (read ops) | git_read.go | 666 | `git status/log/diff/show/blame/fetch/reflog/shortlog` — literally just git with fewer flags. Missing `-N` shorthand, `--pretty`, countless others. |
| `gw git` (write ops) | git_write.go | 1,118 | `git add/commit/push/pull/branch/switch/checkout/stash/unstage/restore/cherry-pick/merge` — every one is worse than raw git. The safety tiers add friction for zero protection. |
| `gw git` (shortcuts) | git_shortcuts.go | 484 | `save/wip/undo/amend/fast/sync` — nobody uses these. |
| `gw git` (workflows) | git_workflows.go | 687 | `ship/prep/pr-prep` — overbuilt. `ship` runs prettier + tsc + commit + push but is slower and less reliable than doing each step. |
| `gw git` (bisect) | git_bisect.go | 641 | Just use `git bisect`. |
| `gw git` (parent) | git.go | 140 | Help categories for commands being killed. |
| `gw git pr` | git_pr.go | ~200 | Alias for `gw gh pr`. Indirection. |
| `gw gh pr` | gh_pr.go | 917 | `gh pr` is already great. gw adds pretty tables but misses flags. |
| `gw gh run` | gh_run.go | 521 | `gh run` is easier. |
| `gw gh project` | gh_project.go | 954 | `gh project` works fine raw. |
| `gw gh api` | gh_api.go | ~200 | `gh api` is literally the escape hatch. Wrapping the escape hatch. |
| `gw gh` (parent + browse) | gh.go, gh_*_browse.go | ~400 | Help + TUI for killed commands. |
| `gw d1` | d1.go | 736 | `wrangler d1` is easier. Every time. |
| `gw kv` | kv.go | 403 | `wrangler kv` is easier. |
| `gw r2` | r2.go | 417 | `wrangler r2` is easier. |
| `gw deploy` | deploy.go | 107 | `wrangler deploy` with 4 fewer flags. |
| `gw flag` | flag.go | 390 | Feature flag management — use wrangler/D1 directly. |
| `gw backup` | backup.go | 276 | D1 backup — `wrangler d1 export` is fine. |
| `gw tui settings` | tui_settings.go | ~518 | Settings TUI. Not useful. (Note: `tui_browse.go` stays — used by `gw gh issue browse`.) |
| `gw loft` | loft.go | 718 | Ephemeral dev environments on Fly.io. Never deployed, never used. |
| `gw lattice` | lattice.go | 421 | Blog post CRUD. Not useful. |
| `gw status` | status.go | 157 | CF status dashboard. `wrangler whoami` + eyes. |
| `gw doctor` | doctor.go | 87 | Checks if git/gh/wrangler exist. You know they exist. |
| `gw context` | context.go | 327 | Session context display. |
| `gw packages` | packages.go | 492 | Monorepo package detection. `ls apps/ libs/` works. |
| `gw monorepo-size` | monorepo_size.go | 167 | Filesystem stats. `du -sh`. |
| `gw env-audit` | env_audit.go | 121 | Checks env vars. |
| `gw config-validate` | config_validate.go | 110 | Validates gw.toml. Meta. |
| `gw cache` | cache.go | 406 | Cache management for what? |
| `gw history` | history.go | 317 | Command history tracking. |
| `gw metrics` | metrics.go | 89 | Performance diagnostics for gw itself. |
| `gw health` | health.go | 93 | Health checks. |
| `gw onboarding` | onboarding.go | 284 | First-run wizard. |
| `gw email` | email.go | 170 | Email via Zephyr. Overlap with social. |
| `gw release` | release.go | 159 | GitHub releases. `gh release create` works. |
| `gw export` | export.go | 576 | GDPR exports. Niche enough to call raw. |
| `gw bindings` | bindings.go | 287 | Wrangler binding inspector. |
| `gw glimpse` | glimpse.go | 146 | Screenshot wrapper. Just call glimpse directly. |
| `gw logs` | logs.go | 92 | `wrangler tail`. |
| `gw tenant` | tenant.go | 608 | **Reversed (#1680).** Kept, and it is now the documented first move in abuse response. Raw D1 sets `active = 0` but leaves the TenantDO warm, which is #1677's bug; `gw tenant suspend` writes `audit_log` and probes the site afterwards. |
| `gw auth` | auth.go | 360 | OAuth client management. Niche. |
| `gw login/logout` | login.go | 336 | Grove login. Could stay but questionable. |
| `gw process` | process_unix/windows.go | 52 | OS process helpers for killed commands. |

**Total KILL: ~16,000+ lines (~58% of codebase)**

### SIMPLIFY — Good Concept, Overbuilt

| Command | Current | Proposed |
|---------|---------|----------|
| `gw git worktree` | 835 lines, full worktree management | Keep only `finish` subcommand (~100 lines) |
| `gw dev` | 1,560 lines across 3 files | Gut `dev_quality.go` (1,163 lines of reimplemented test/lint/check). Rebuild around Phase 3 local dev stack. |
| Safety tiers | Checked per-operation across all git/CF commands | Move to a thin middleware on the ~5 commands that actually benefit |

**Total SIMPLIFY: ~3,800 lines → ~600 lines**

---

## Expedition Summary

### By the numbers

| Metric | Count |
|--------|-------|
| Total files | 76 |
| Total lines | 27,738 |
| KEEP (as-is) | ~4,362 (16%) |
| SIMPLIFY | ~3,800 → ~600 |
| KILL | ~16,000+ (58%) |
| Infra/helpers/tests | ~3,500 (shared, scales down with kills) |
| **Post-triage estimate** | **~5,000 lines** |

### What gw becomes after triage

```
gw
├── secret          — Encrypted vault (init, list, set, apply, generate, reveal)
├── publish         — npm/GitHub release workflow
├── warden          — Warden agent/credential management
├── social          — Zephyr broadcasting
├── todo            — Todoist integration (goose-migrate)
├── dev             — Local dev stack (Phase 3, to be built)
├── git worktree    — Just `finish` subcommand
├── gh issue        — Full issue subcommand (list, create, view, browse)
├── update          — Self-update from local source
└── help/version    — Basics
```

That's ~10 command groups instead of ~40. Each one does something you _can't_ do with a raw CLI.

### Cross-cutting themes

1. **The passthrough trap**: Every git/gh/wrangler subcommand started as "just add a few flags" and grew into a reimplementation that's always behind the real CLI.

2. **Agent mode tax**: Every command has JSON mode, agent mode checks, and structured output — tripling the code for a use case that works better with raw CLI output anyway.

3. **Safety tiers are backwards**: The tier system protects against `git push` but not against the actually dangerous things (D1 writes, secret exposure). The commands that _need_ safety (secret, deploy) already have it. The ones that _have_ it (git status, git log) don't need it.

4. **The TUI bubble**: 1,152 lines of Bubble Tea browser framework used by 3 commands, all of which are being killed or simplified.

### Recommended approach

Don't delete files one by one. That's 60+ files of surgical removal. Instead:

1. **Fork the cmd/ directory** — copy only the KEEP files into a new `cmd/` 
2. **Remove registrations** — update `root.go` and `init()` calls
3. **Clean internal/**: Remove `safety/` checks for killed commands, remove unused `ui/` renderers
4. **Rebuild `gw --help`** — the help system should list ~10 things, not ~40
5. **Update AGENT.md** — stop telling agents to use `gw git`, tell them to use `git`
6. **Update `.claude/settings.json`** — remove the `Bash(gw git:*)` permissions, they won't be needed

### What agents should use instead

| Before | After |
|--------|-------|
| `gw git status` | `git status` |
| `gw git log --oneline` | `git log --oneline` |
| `gw git commit --write -m "..."` | `git commit -m "..."` |
| `gw git push --write` | `git push` |
| `gw gh pr list` | `gh pr list` |
| `gw d1 execute ...` | `wrangler d1 execute ...` |
| `gw deploy` | `wrangler deploy` |

---

_The fire dies to embers. The journal is full — 15 stops, 76 files observed, 58% marked for removal. The wheel was overengineered, but the axle is sound. Tomorrow, we strip it back to what works. Tonight was the drive. And it was honest._ 🚙
