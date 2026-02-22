---
aliases: []
date created: Sunday, February 22nd 2026
date modified: Sunday, February 22nd 2026
tags:
  - tooling
  - gw
  - developer-experience
  - cli
type: implementation-plan
---

            ╭──────────────────────────────────╮
            │                                  │
            │   ╭────╮                         │
            │   │ gw │  tend the grove         │
            │   ╰────╯                         │
            │                                  │
            │    ─────────────────────────     │
            │    READ   WRITE   DANGER          │
            │    🟢      🟡      🔴            │
            │    ─────────────────────────     │
            │                                  │
            │        ≈ fast as a root ≈        │
            │                                  │
            ╰──────────────────────────────────╯

        *a CLI that should feel like the grove, not a waiting room*

# gw Go — DX Improvements

> *The grove keeper's tools should never make you wait.*

`gw` is the daily driver for every Grove operation — git, infrastructure, CI, deployment.
The Go port shipped today and the bones are excellent: Charm Lipgloss panels, safety tiers,
history tracking, beautiful tables. Now it needs polish and speed.

**Internal Name:** Grove Wrap (gw)
**Tool:** `tools/grove-wrap-go/`
**Last Updated:** February 2026

This spec covers the specific gaps found during the test-drive safari on launch day. Every
item here was directly observed, not theorized.

---

## Overview

### What This Is

gw wraps git, GitHub (gh), Wrangler, pnpm/bun, and the dev toolchain behind a safety-tiered
interface. It is the primary daily-use CLI for all Grove development. It has 98+ commands
across 7 groups and was ported from Python to Go on Feb 22, 2026.

### Goals

- Eliminate the 4-10 second wrangler lag that undermines daily trust in the tool
- Bring all commands to the same visual standard (panels, not bare Printf)
- Add opt-in interactive mode for humans without breaking agent/CI compatibility
- Fix naming inconsistencies between documentation and actual command paths
- Give developers version information that is actually useful

### Non-Goals

- Redesigning the safety tier system (it is correct)
- Changing the Lipgloss color palette (it is Grove-aligned)
- Adding new infrastructure commands (separate effort)
- Breaking the `--agent` / `--json` contracts

---

## Architecture

```
gw invocation
    │
    ├── Pure Go command (git log, packages, context)?
    │       └── executes in <600ms  ✓
    │
    └── Wrangler-touching command (whoami, doctor, health)?
            │
            ├── Cache hit? (~/.grove/wrangler-cache.json, <60s old)
            │       └── returns in <5ms  ✓
            │
            └── Cache miss?
                    └── spawn wrangler → 4s → update cache → return
```

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| CLI framework | Cobra v1.10 | Established, subcommand routing works |
| Terminal UI | Lipgloss v1.1 | Grove palette, rounded borders |
| Tables | Charm Tables | Already used for git log |
| Interactive TUI | Bubble Tea v1.3 | Same family, opt-in only |
| Config | TOML (BurntSushi) | Already dependency |

---

## Feature 1: Wrangler Auth Cache

**The problem:** Every command that calls `wrangler whoami` or `wrangler status` costs
~4 seconds. `gw doctor` calls it twice = ~9.7s. `gw whoami`, `gw health`, `gw status`
all pay the same tax.

**The fix:** A simple file-based cache in `~/.grove/wrangler-cache.json` with a 60-second TTL.

```
Cache structure:
~/.grove/wrangler-cache.json
{
  "authenticated": true,
  "email": "autumn@grove.place",
  "account_id": "abc123",
  "timestamp": 1708644000
}
```

```
Decision flow:
    gw whoami
        │
        ▼
    Read ~/.grove/wrangler-cache.json
        │
        ├── Exists AND timestamp < 60s ago?
        │       └── use cached email/auth → return in 1ms
        │
        └── Missing OR stale?
                └── run wrangler whoami → parse → write cache → return
```

**Implementation location:** `internal/exec/wrangler.go` — add `WranglerWhoisCached()` that
wraps the existing `WranglerOutput("whoami")` with cache read/write logic.

**Invalidation:** Force refresh with `gw whoami --refresh` or `gw doctor --refresh`.

### Implementation checklist

- [ ] Create `internal/cloudflare/cache.go` with read/write/check functions
- [ ] Add `~/.grove/wrangler-cache.json` as the cache path (respect `GroveRoot` config)
- [ ] 60-second TTL by default, configurable via `gw.toml`
- [ ] `--refresh` flag on `gw whoami`, `gw doctor`, `gw health` to force fresh fetch
- [ ] `--no-cloud` global flag to skip ALL wrangler calls (for git-only workflows)
- [ ] Update `gw whoami`, `gw health`, `gw status`, `gw doctor` to use cached version

---

## Feature 2: `gw context` Panel Upgrade

**The problem:** `gw context` is the recommended first command of every session. But it
renders with bare `fmt.Printf` while everything else in gw uses Lipgloss panels. It looks
like it was written before the Charm glow-up.

**Current output:**
```
gw context

  Branch:     claude/explore-gw-gf-toolkits-LwgIM
  Staged:     0   Unstaged: 0   Untracked: 0

  Recent Commits
    3a69e07 docs(safari): gw + gf test drive expedition journal
    d223191 feat(gw): port social and publish commands to Go
```

**Target output:**
```
╭──────────────────────────────────────────────────────────╮
│ gw context                                               │
├──────────────────────────────────────────────────────────┤
│ branch      claude/explore-gw-gf-toolkits-LwgIM          │
│ staged      0   unstaged 0   untracked 0                 │
│ packages    tools/grove-wrap-go                          │
╰──────────────────────────────────────────────────────────╯

╭──────────────────────────────────────────────────────────╮
│ Recent Commits                                           │
├──────────────────────────────────────────────────────────┤
│ 3a69e07  docs(safari): gw + gf test drive safari         │
│ d223191  feat(gw): port social and publish commands      │
╰──────────────────────────────────────────────────────────╯
```

### Implementation checklist

- [ ] Replace bare `fmt.Printf` in `cmd/context.go` with `ui.RenderInfoPanel`
- [ ] Recent commits section: use a compact table (hash | message | date)
- [ ] Stash count appears inline when > 0 (not a separate line)
- [ ] Package names link-styled with `CommandStyle` for scannability

---

## Feature 3: `gw git ship --help` Fix

**The problem:** `gw git ship --help` shows the parent git group help screen instead of
ship's own flags. This means developers can't discover `-m`, `-a`, `--no-check`,
`--no-format`, `--issue` from the help system.

This is a Cobra help routing issue. When a subcommand doesn't have `SetHelpFunc` defined,
Cobra falls back to the parent group's custom help. The ship command needs its own help
template showing its specific flags.

### Implementation checklist

- [ ] Add `SetHelpFunc` or `Long` description to `gitShipCmd` with flag documentation
- [ ] Verify `gw git ship --help` shows ship-specific flags after fix
- [ ] Apply same pattern to `gw git prep --help` and `gw git pr-prep --help`
- [ ] Audit all other subcommands for the same routing issue

---

## Feature 4: Version via `git describe`

**The problem:** When built from source (the current default since dist/ doesn't exist yet),
`gw version` shows `dev`. This is cosmetically awkward and unhelpful for debugging.

**The fix:** The CI already uses `-ldflags="-X cmd.Version=0.1.0"` — but with a hardcoded
version. Use `git describe --tags --always --dirty` at build time instead.

```
# Local build via Makefile:
go build -ldflags="-X cmd.Version=$(git describe --tags --always --dirty)" -o gw .

# Result:
gw version → 0.1.0-g471f93d        (commit after last tag)
gw version → 0.1.0                  (exact tag)
gw version → 0.1.0-g471f93d-dirty  (uncommitted changes)
```

### Implementation checklist

- [ ] Update `install.sh` local build fallback to pass ldflags with git describe
- [ ] Update `Makefile` build targets to use git describe
- [ ] Update CI `rebuild-gw-binaries.yml` to use git describe instead of hardcoded `0.1.0`
- [ ] Show `gw version` with commit hash when built from non-tagged commit

---

## Feature 5: `gw ci` Alias

**The problem:** `AGENT.md` (the most-read document in the project) documents:
```bash
gw ci --affected --fail-fast --diagnose
```

But `gw ci` doesn't exist at root level. The command is `gw dev ci`. Every agent and
developer who follows AGENT.md verbatim gets an error.

**The fix:** Register `gw ci` as an alias that delegates to `gw dev ci`.

```go
// In cmd/root.go init():
rootCmd.AddCommand(ciAliasCmd)

var ciAliasCmd = &cobra.Command{
    Use:    "ci",
    Short:  "Run full CI pipeline (alias: gw dev ci)",
    Hidden: false,
    RunE:   devCiCmd.RunE,  // delegate to the real implementation
}
// Copy flags from devCiCmd
```

### Implementation checklist

- [ ] Register `gw ci` alias in root command with the same flags as `gw dev ci`
- [ ] Update `gw --help` to show `ci` in the dev tools section (or shortcuts)
- [ ] Update `AGENT.md` to clarify both forms work
- [ ] Update `gw dev ci --help` to note the alias exists

---

## Feature 6: Interactive Mode (`--interactive` / `-i`)

**The concept:** gw currently outputs and exits. For humans in a terminal, some operations
are better served by interactive TUI. For agents and CI, pure output mode must remain default.

The model: add a global `--interactive` / `-i` flag. Without it, gw behaves exactly as today.
With it, eligible commands enter Bubble Tea TUI mode.

```
WITHOUT flag (default, safe for agents/CI):
  gw git log → prints table, exits

WITH flag (opt-in, humans only):
  gw git log -i → opens scrollable paginator, arrow keys, q to quit
```

**Eligible commands for interactive mode:**

| Command | Interactive behavior |
|---------|---------------------|
| `gw git log` | Scrollable table, press enter to show full commit diff |
| `gw packages` | Filterable list, press enter to see package commands |
| `gw history list` | Searchable history with fuzzy filter |
| `gw d1 query` | Multi-line SQL editor with table results |
| `gw git ship -i` | Step-by-step confirmation prompts before commit/push |

**Technical approach:** Each command checks `cfg.InteractiveMode` and branches to either
the existing plain output path or a new Bubble Tea model. The plain path is unchanged —
no risk to agents or CI.

```
gw git log -i
    │
    ├── cfg.InteractiveMode == true?
    │       └── create bubbletea.Program with scrollable table model
    │
    └── cfg.InteractiveMode == false (default)
            └── current plain table output
```

### Implementation checklist

- [ ] Add `--interactive` / `-i` flag to root persistent flags
- [ ] Set `cfg.InteractiveMode` in config initialization
- [ ] Implement interactive `gw git log -i` as first proof-of-concept
- [ ] Scrollable Bubble Tea table model with Lipgloss styling
- [ ] Add `gw history list -i` as second interactive command (fuzzy filter)
- [ ] Document the `-i` flag in `gw --help` and `AGENT.md`
- [ ] Ensure `--interactive` cannot combine with `--agent` or `--json` (error if attempted)

---

## Feature 7: Animated Spinner for Slow Operations

**The problem:** When gw calls wrangler, the terminal hangs silently for 4 seconds. There
is no feedback. This amplifies the perceived slowness significantly.

Even with caching, the first call (and any cache-miss) still takes 4 seconds. A spinner
transforms "is this broken?" into "yes, working on it."

```
gw doctor
╭─────────────╮
│ gw doctor   │  ⣾  Checking Cloudflare auth...
╰─────────────╯
```

**Technical approach:** Use `github.com/charmbracelet/bubbles/spinner` which is already a
dependency. The spinner runs in a goroutine while the wrangler subprocess executes.

### Implementation checklist

- [ ] Add spinner wrapper in `internal/ui/spinner.go` (file exists, add `RunWithSpinner`)
- [ ] Use spinner for all wrangler subprocess calls in `internal/exec/wrangler.go`
- [ ] Suppress spinner when `--agent`, `--json`, or when stdout is not a TTY
- [ ] Spinner uses `SpinnerStyle` from `theme.go` (ForestGreen, already defined)

---

## Implementation Order

Phase 1 — Quick wins (1-2 hours each):
1. Wrangler auth cache
2. `gw ci` alias
3. `gw git ship --help` fix
4. `gw version` via git describe

Phase 2 — Visual polish (1-2 hours each):
5. `gw context` panel upgrade
6. Animated spinner for wrangler calls
7. `--no-cloud` flag

Phase 3 — New capability (1 day):
8. Interactive mode framework + `gw git log -i`
9. `gw history list -i`

---

*The grove keeper's tools should feel as sure as roots — fast beneath the surface, warm
above. When gw tends the grove, the grove tends back.*
