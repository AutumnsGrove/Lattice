---
title: "Grove Wrap Safari — Mapping the Wilderness Before the Rewrite"
status: active
category: safari
---

# Grove Wrap Safari — Mapping the Wilderness Before the Rewrite

> _One CLI to tend them all — and it grew far beyond the trellis._
> **Aesthetic principle**: Document what IS, not what was planned.
> **Scope**: Every top-level command, every subcommand, every feature — compared to the existing spec.

---

## Ecosystem Overview

**~28,000 lines** of Python across **~70 source files** in `tools/gw/src/gw/`
**Current spec**: 2,334 lines at `docs/specs/gw-cli-spec.md` (dated Feb 2, 2026)
**Spec structure**: Implementation phases 1–18 (planning document, not reference)

### Commands by Category

**Cloudflare (11)**: d1, kv, r2, logs, deploy, do, cache, backup, export, email, social
**Developer Tools (8)**: dev (start/stop/restart/logs/fmt/reinstall), test, build, check, lint, ci, packages, publish
**Version Control (1)**: git (32 subcommands across read/write/danger/shortcuts/worktree/remote/tag)
**GitHub (5)**: gh → pr (12 subcommands), issue (8), project (7), run (5), api
**Auth & Secrets (2)**: auth (check/login/client→5), secret (8 subcommands)
**Agent Tools (1)**: context
**System & Info (9)**: status, health, bindings, doctor, whoami, history (5), completion (5), mcp (3), metrics (5)
**Domain (2)**: tenant (5), flag (5)
**Future/Planned (1)**: queen (not live, spec'd in queen-firefly-coordinator-spec.md)

**Total top-level commands: ~40**
**Total leaf commands (including subcommands): ~150+**

---

## Stop-by-Stop Observations

### 1. The Naming Gap: `gw db` → `gw d1`

**Spec says:** `gw db query`, `gw db tables`, `gw db schema`, `gw db tenant`, `gw db migrate`
**Reality:** `gw d1 query`, `gw d1 tables`, `gw d1 schema`, `gw d1 list`, `gw d1 migrate`

The spec's `gw db tenant` was broken out into `gw tenant` (its own top-level command). The rename from `db` to `d1` makes sense — it's Cloudflare D1 specifically, not a generic DB abstraction. But the spec still references the old name everywhere.

**Status:** 🟠 Spec is wrong on the command name.

---

### 2. Git: The Spec Covered 60%, Reality Has 100%+

**In spec:** status, log, diff, blame, show, add, commit, push, branch, stash, switch, force-push, reset, rebase, merge, save, sync, wip, undo, amend
**Actually exists but NOT in spec:**

- `gw git ship` — Format + check + commit + push in one step (the canonical workflow)
- `gw git fast` — Commit + push skipping all hooks (speed shortcut)
- `gw git prep` — Pre-commit preflight dry run
- `gw git pr-prep` — Full PR readiness report
- `gw git worktree` — 10 subcommands (create/list/remove/finish/cd/open/clean/prune/status)
- `gw git remote` — Remote management
- `gw git tag` — Tag management
- `gw git config` — Git config viewing/setting
- `gw git cherry-pick` — Cherry-pick commits
- `gw git clean` — Remove untracked files
- `gw git fetch` — Fetch without merging
- `gw git reflog` — Reference log
- `gw git shortlog` — Summarize by author
- `gw git restore` — Restore files / unstage
- `gw git unstage` — Unstage files

That's **15 commands/features** the spec doesn't know about. The worktree system alone is a major feature with its own managed directory (`.gw-worktrees/`).

**Status:** 🔴 Spec is severely incomplete for git. Missing the most-used workflow commands (ship, fast, prep).

---

### 3. GitHub: Richer Than the Spec

**In spec:** pr list/view/create/comment/review/edit/merge/close, issue list/view/create/comment/edit/close/reopen, run list/view/rerun/cancel, project list/view/move/field/bulk/add/remove, api, rate-limit
**Actually exists but NOT in spec:**

- `gw gh pr checks` — CI status for a PR
- `gw gh pr comments` — List all comments
- `gw gh pr diff` — View code changes
- `gw gh pr re-review` — Request re-review
- `gw gh pr resolve` — Resolve review threads
- `gw gh issue batch` — Batch create from JSON (key for bee-collect)
- `gw gh issue milestones` — List milestones

**Status:** 🟡 Spec covers the foundation but misses several workflow-critical subcommands.

---

### 4. Dev Tools: Grew Two New Subcommands

**In spec:** dev (start/stop/restart/logs/status), test, build, check, lint, ci
**Actually exists but NOT in spec:**

- `gw dev fmt` — Format code with prettier + black
- `gw dev reinstall` — Reinstall gw itself after source changes
- `gw packages` now has `current`, `deps`, `info`, `list` (spec only mentions `list`)
- `gw ci` gained `--affected`, `--fail-fast`, `--diagnose` flags (critical for fast feedback)

**Status:** 🟡 Mostly covered, but fmt and the CI flags are significant additions.

---

### 5. Entirely New Commands (Not in Spec at All)

These commands exist in the codebase but have zero presence in the spec:

| Command              | What it does                                                 | Lines (approx)             |
| -------------------- | ------------------------------------------------------------ | -------------------------- |
| `gw context`         | Session snapshot — first thing an agent runs                 | Agent-critical             |
| `gw social`          | Cross-post to Bluesky via Zephyr (post/status/history/setup) | New domain                 |
| `gw export`          | Tenant data export (list/status/start/download/cleanup)      | New domain                 |
| `gw publish`         | npm publish with registry swap workflow                      | New domain                 |
| `gw metrics`         | Usage metrics (summary/errors/export/clear/ui)               | New domain                 |
| `gw mcp`             | MCP server for Claude Code (serve/tools/config)              | Listed in spec but minimal |
| `gw queen`           | CI runner pool management (planned, not live)                | Spec'd separately          |
| `gw config_validate` | Config file validation                                       | Internal                   |
| `gw env_audit`       | Environment audit                                            | Internal                   |
| `gw monorepo_size`   | Monorepo size analysis                                       | Internal                   |

**Status:** 🔴 Five major feature domains completely absent from the spec.

---

### 6. Safety Model: Spec Is Accurate but Outdated

The four-tier git safety model (READ → WRITE → DANGEROUS → PROTECTED) is documented well in the spec and still accurate. But:

- The spec mentions `GW_AGENT_MODE=1` environment variable — need to verify this is still the detection mechanism
- `gw git ship` and `gw git fast` have their own safety considerations (ship runs format+check before commit; fast skips hooks intentionally)
- The worktree system introduces a new category: managed filesystem state in `.gw-worktrees/`
- `--force-with-lease` is used under the hood for `gw git push --write --force` (safer than spec's `--force`)

**Status:** 🟡 Foundation is right, details need updating.

---

### 7. Configuration: Spec Matches Loosely

The `~/.grove/gw.toml` structure is largely as described, but:

- Package names have changed (greenhouse → meadow, etc.)
- Some packages in the spec don't exist anymore
- The tracking module (`tracking.py`) suggests usage analytics are built-in
- Shell completion is implemented for bash/zsh/fish with dedicated generator files

**Status:** 🟡 Needs refresh for current package names and real config.

---

### 8. MCP Server: Spec Is Skeletal

The spec has a table of ~25 MCP tools. The actual `mcp_server.py` likely exposes more, and the command now has three subcommands (serve/tools/config). The spec doesn't cover the `gw mcp config` command that generates Claude Code settings snippets.

**Status:** 🟠 Needs full inventory of actual MCP tools.

---

### 9. The Queen: Lives in the Source, Not Yet Born

`tools/gw/src/gw/commands/queen/` exists with `__init__.py`, `swarm.py`, and `ci.py`. These are the CLI commands that will talk to the Queen Firefly DO once it's built. The Queen's full spec is in `docs/specs/queen-firefly-coordinator-spec.md` — detailed, comprehensive, not yet implemented.

The spec mentions `gw queen status`, `gw queen swarm`, `gw queen ignite`, `gw queen config`, `gw queen consumers`. The actual source has `swarm.py` and `ci.py` as stubs.

**Status:** 🔴 Planned/stubbed, not live. Covered by its own spec.

---

### 10. Spec Structure: Planning Doc, Not Reference

The biggest issue isn't missing commands — it's that the spec is **structured as an implementation plan**:

- 18 phases with checkboxes (most now done)
- "Week 1", "Week 2" timelines (irrelevant now)
- "START HERE" markers (already started and finished)
- Implementation checklists mixed with reference docs
- Success metrics at the end that are already met

The new spec should be a **reference document** — what `gw` IS, not what it will be.

---

## Expedition Summary

### By the Numbers

| Metric                   | Count                                            |
| ------------------------ | ------------------------------------------------ |
| Total top-level commands | ~40                                              |
| Total leaf commands      | ~150+                                            |
| Source lines (Python)    | ~28,000                                          |
| Source files             | ~70                                              |
| Commands in spec         | ~100                                             |
| Commands NOT in spec     | ~50+                                             |
| Entirely new domains     | 5 (context, social, export, publish, metrics)    |
| Spec accuracy            | ~60% (foundations right, many additions missing) |
| Spec structure fitness   | Poor (planning doc, not reference)               |

### Health Assessment

| Area                           | Status              | Notes                                                                          |
| ------------------------------ | ------------------- | ------------------------------------------------------------------------------ |
| Cloudflare (d1/kv/r2/cache/do) | 🟡 Growing          | Spec says `db`, reality says `d1`. Export/social/backup exist but undocumented |
| Git                            | 🔴 Barren (in spec) | 15+ commands missing. Ship/fast/prep/worktree are workflow-critical            |
| GitHub                         | 🟡 Growing          | Foundation covered, several subcommands added since                            |
| Dev Tools                      | 🟡 Growing          | fmt, reinstall, CI flags missing                                               |
| Auth & Secrets                 | 🟢 Thriving         | Well documented in spec, matches reality                                       |
| Agent Tools                    | 🔴 Barren           | `gw context` not in spec at all                                                |
| System & Info                  | 🟡 Growing          | Metrics and MCP details missing                                                |
| Domain (tenant/flag)           | 🟢 Thriving         | Well covered                                                                   |
| Safety Model                   | 🟡 Growing          | Foundation right, new commands need classification                             |

### Cross-Cutting Themes

1. **The spec is a planning document that needs to become a reference document.** Strip the phases, strip the checkboxes, strip the timelines. Document what exists.

2. **Five entire feature domains are undocumented.** context, social, export, publish, metrics — these aren't minor additions, they're full command groups with multiple subcommands.

3. **The git section is the biggest gap.** The spec covers basic git but misses the workflow commands that agents use most: `ship`, `fast`, `prep`, `pr-prep`, `worktree`. These are the commands that make gw more than a git wrapper.

4. **The `gw db` → `gw d1` rename propagates everywhere.** Every spec example with `gw db` is wrong.

5. **The safety tier system is solid and should be preserved.** The four-tier model (READ → WRITE → DANGEROUS → PROTECTED) is a genuinely good design. The new spec should elevate it, not rewrite it.

6. **The MCP integration needs its own section.** It's a major feature that lets Claude Code call gw directly. The spec barely touches it.

7. **The `--json` flag pattern is universal.** Most commands support `gw --json <command>` for machine-readable output. This is a design principle worth documenting.

### Recommended Rewrite Structure

The new spec should be organized as:

1. **Overview & Philosophy** — What gw is, safety model, the `--write` convention
2. **Quick Reference** — Every command in a single scannable table
3. **Command Groups** — One section per group (Cloudflare, Git, GitHub, Dev, Auth, Agent, System, Domain)
4. **Safety Model** — The tier system, with every command classified
5. **Configuration** — The real `gw.toml` with current values
6. **MCP Integration** — Full tool inventory and setup
7. **Shell Completions & Aliases** — What's available
8. **Future** — Queen Firefly, planned features (brief, links to their own specs)

This replaces the 18-phase planning structure with a living reference that can be updated as gw grows.

---

_The fire dies to embers. The journal is full — 10 stops, 50+ undocumented commands mapped, the whole landscape surveyed. Tomorrow, the spec gets rewritten. But tonight? Tonight was the drive. And it was glorious._ 🚙
