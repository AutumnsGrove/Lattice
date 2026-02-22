---
aliases: []
date created: Sunday, February 22nd 2026
date modified: Sunday, February 22nd 2026
tags:
  - tooling
  - go
  - cli
  - performance
  - charm
type: tech-spec
---

```
                    ╔═══════════════════════════╗
                    ║                           ║
              ┌─────╢    🔨  THE  FORGE  🔨    ╟─────┐
              │     ║                           ║     │
              │     ╚═══════════╤═══════════════╝     │
              │                 │                     │
         ░░░░░│░░░░░░░░░░░░░░░░│░░░░░░░░░░░░░░░░░│░░░░░
        ░░░░░░│░░  ┌─────┐  ░░░│░░░  ┌─────┐  ░░░│░░░░░░
       ░░░░░░░│░░  │ .py │──→──│──→──│ .go │  ░░░│░░░░░░░
        ░░░░░░│░░  └─────┘  ░░░│░░░  └─────┘  ░░░│░░░░░░
         ░░░░░│░░░░░░░░░░░░░░░░│░░░░░░░░░░░░░░░░░│░░░░░
              │                 │                     │
              └────── heat ─────┴───── patience ──────┘

       *Every tool in the grove was shaped by fire and patience.*
```

# GW v2: Grove Wrap in Go

> *Every tool in the grove was shaped by fire and patience.*

Grove Wrap is the CLI that tends the grove. It wraps git, GitHub, Wrangler, and the dev toolchain behind a safety-tiered interface. The Python prototype proved the design across 29,000 lines and 212 commands. Now the forge makes it permanent: a single Go binary, sub-50ms startup, and the Charm suite for terminal UI that surpasses what Rich could offer.

**Public Name:** GW (Grove Wrap)
**Internal Name:** grove-wrap-go
**Location:** `tools/grove-wrap-go/`
**Sister Spec:** [GW MCP Server (Python)](./gw-mcp-server-python.md)
**Predecessor:** [GW Performance Analysis](./gw-performance-analysis.md)
**Last Updated:** February 2026

The forge metaphor fits. The Python gw was the wax model, poured and shaped to discover the right form. Every command, every safety tier, every help screen was an experiment in what a grove-tending CLI should be. Now we melt the wax and cast it in metal. The form is proven. The material changes.

---

## Overview

### What This Is

A ground-up rewrite of the `gw` CLI from Python to Go. Every command from the Python version is ported, the 4-tiered safety system is preserved, and the Charm suite replaces Rich for terminal output. The result is a single binary with zero runtime dependencies, 60-100x faster startup, and interactive TUI capabilities that Python could never achieve.

### Goals

- Sub-50ms startup for any command (currently 775ms-1,360ms)
- Single binary distribution, zero runtime dependencies
- Feature parity with Python gw (all 212 leaf commands)
- Terminal UI that surpasses Rich via the Charm suite
- Interactive TUI modes for high-frequency commands (git status, pr list, logs)
- Same config format (`~/.grove/gw.toml`) for seamless migration
- Same safety tier system (READ/WRITE/DANGEROUS/PROTECTED)

### Non-Goals (Out of Scope)

- MCP server in Go (stays in Python, see sister spec)
- Rewriting the external tools gw wraps (git, gh, wrangler stay as-is)
- Changing the command surface area (no new commands in v2, no removed commands)
- Mobile or web interfaces
- Plugin system or extensibility API

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        gw (Go binary)                           │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Cobra   │  │  Safety  │  │  Config  │  │  Charm Suite  │  │
│  │  Router  │  │  Engine  │  │  Loader  │  │  (UI Render)  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬────────┘  │
│       │              │              │               │           │
│       ▼              ▼              ▼               ▼           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Command Layer (cmd/)                     │  │
│  │  git/  gh/  dev/  d1/  kv/  r2/  secret/  deploy/ ...  │  │
│  └────────────────────────┬─────────────────────────────────┘  │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
      ┌──────────┐    ┌──────────┐    ┌──────────┐
      │   git    │    │    gh    │    │ wrangler │
      │ (binary) │    │ (binary) │    │ (binary) │
      └──────────┘    └──────────┘    └──────────┘
```

### Package Layout

```
tools/grove-wrap-go/
├── main.go                       # Entry point → cmd.Execute()
├── go.mod / go.sum               # Module definition
├── Makefile                      # Build targets (4 platforms)
├── install.sh                    # Platform auto-detect installer
│
├── cmd/                          # Command definitions (Cobra)
│   ├── root.go                   # Root command, global flags, help
│   ├── git.go                    # Git command group
│   ├── git_read.go               # status/log/diff/blame/show/fetch
│   ├── git_write.go              # commit/push/pull/add/branch/switch
│   ├── git_danger.go             # reset/rebase/merge/force-push
│   ├── git_shortcuts.go          # save/sync/wip/undo/amend/ship
│   ├── git_worktree.go           # Worktree management
│   ├── gh.go                     # GitHub command group
│   ├── gh_pr.go                  # PR operations
│   ├── gh_issue.go               # Issue operations
│   ├── gh_run.go                 # Workflow run operations
│   ├── gh_api.go                 # Raw API + rate limiting
│   ├── dev.go                    # Dev tools group
│   ├── dev_server.go             # start/stop/restart/logs
│   ├── dev_quality.go            # test/check/lint/fmt
│   ├── dev_build.go              # build/ci
│   ├── d1.go                     # D1 database operations
│   ├── kv.go                     # KV storage
│   ├── r2.go                     # R2 object storage
│   ├── deploy.go                 # Cloudflare deployment
│   ├── secret.go                 # Secrets vault
│   ├── auth.go                   # OAuth client management
│   ├── tenant.go                 # Tenant operations
│   ├── cache.go                  # Cache management
│   ├── backup.go                 # D1 backups
│   ├── export.go                 # Data exports
│   ├── flag.go                   # Feature flags
│   ├── email.go                  # Email routing
│   ├── do.go                     # Durable Objects
│   ├── logs.go                   # Worker log streaming
│   ├── social.go                 # Social broadcasting
│   ├── packages.go               # Monorepo package detection
│   ├── metrics.go                # Usage metrics
│   ├── history.go                # Command history
│   ├── completion.go             # Shell completions
│   ├── doctor.go                 # Diagnostics
│   ├── whoami.go                 # Current context display
│   ├── context.go                # Session context
│   ├── status.go                 # Config/account status
│   ├── health.go                 # Health checks
│   ├── queen.go                  # Queen CI orchestration
│   ├── warden.go                 # Agent/service monitoring
│   ├── publish.go                # Package publishing
│   └── mcp.go                    # Delegates to Python MCP server
│
├── internal/                     # Shared internal packages
│   ├── config/
│   │   └── config.go             # TOML loader (~/.grove/gw.toml)
│   ├── safety/
│   │   ├── tiers.go              # Tier definitions & enforcement
│   │   ├── git.go                # Git operation classification
│   │   ├── database.go           # SQL validation, DDL blocking
│   │   └── github.go             # Rate limiting, safety checks
│   ├── exec/
│   │   ├── git.go                # Git subprocess wrapper
│   │   ├── gh.go                 # GitHub CLI wrapper
│   │   ├── wrangler.go           # Wrangler subprocess wrapper
│   │   └── runner.go             # Generic subprocess runner
│   ├── ui/
│   │   ├── theme.go              # Grove palette, Lip Gloss styles
│   │   ├── tables.go             # Table rendering (charm/table)
│   │   ├── panels.go             # Panel/card rendering
│   │   ├── help.go               # Cozy help formatter
│   │   ├── interactive.go        # Bubble Tea shared components
│   │   └── log.go                # Structured logging (charm/log)
│   ├── vault/
│   │   └── vault.go              # Secrets vault (Fernet-compatible)
│   ├── tracking/
│   │   └── tracking.go           # Metrics collection
│   ├── packages/
│   │   └── detect.go             # Monorepo package detection
│   └── commits/
│       └── conventional.go       # Conventional commit validation
│
└── dist/                         # Pre-built binaries
    ├── gw-linux-x86_64
    ├── gw-linux-arm64
    ├── gw-darwin-arm64
    └── gw-windows-x86_64.exe
```

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Language | Go 1.24+ | Single binary, 13ms startup (proven with gf) |
| CLI Framework | Cobra v1.10+ | Industry standard, built-in completions |
| Terminal Styling | Lip Gloss v2 | Composable styles, adaptive color profiles |
| Interactive TUI | Bubble Tea | Elm architecture, keyboard-driven interfaces |
| Forms & Prompts | Huh | Beautiful forms, validation, multi-step wizards |
| Markdown Render | Glamour | Terminal markdown with custom stylesheets |
| Tables | charm/table | Sortable, filterable, styled tables |
| Logging | charm/log | Structured, leveled, styled logging |
| Config | BurntSushi/toml | Read/write TOML (existing gw.toml compat) |
| Crypto | Go stdlib + x/crypto | Fernet-compatible vault encryption |
| Testing | Go stdlib testing | Table-driven tests, subtests |

---

## The Charm Suite: A Capability Upgrade

This is where the Go rewrite goes beyond parity. The Charm suite does not just replace Rich. It unlocks an entire class of interactions.

| Charm Tool | Replaces in Python | New Capabilities |
|------------|-------------------|-----------------|
| Lip Gloss | Rich styling/colors | Composable style system, flexbox-like layout engine |
| Bubble Tea | Nothing in Rich | Full interactive TUIs, keyboard navigation, live updates |
| Huh | Click's prompts | Beautiful forms, multi-step wizards, validation |
| Glamour | Rich markdown | Terminal markdown with custom stylesheets |
| charm/table | Rich tables | Sorting, filtering, flexible styling |
| charm/log | Rich logging | Structured, leveled, styled logging |

### Phase 1: Rich Parity (Lip Gloss + Table + Log)

Every command that currently renders Rich output gets equivalent or better output.

**Grove Theme** (`internal/ui/theme.go`):

```go
var (
    ForestGreen = lipgloss.Color("#2d5a27")
    LeafYellow  = lipgloss.Color("#b8a924")
    BarkBrown   = lipgloss.Color("#8b6914")
    BlossomPink = lipgloss.Color("#d4547a")
    RiverCyan   = lipgloss.Color("#3a9d9b")
    MossGreen   = lipgloss.Color("#4a7c59")
    SunsetAmber = lipgloss.Color("#e8a838")
)

var HeaderStyle = lipgloss.NewStyle().
    Bold(true).Foreground(ForestGreen).
    BorderStyle(lipgloss.RoundedBorder()).Padding(0, 1)

var SafeReadStyle  = lipgloss.NewStyle().Foreground(ForestGreen)
var SafeWriteStyle = lipgloss.NewStyle().Foreground(LeafYellow)
var DangerStyle    = lipgloss.NewStyle().Foreground(lipgloss.Color("#ff4444")).Bold(true)
```

### Phase 2: Interactive Forms (Huh)

Safety confirmations and input collection become interactive experiences.

**Conventional Commit Builder** (new capability, replaces raw `-m` flag):

```go
func BuildCommitMessage() (string, error) {
    var commitType, scope, description string
    form := huh.NewForm(
        huh.NewGroup(
            huh.NewSelect[string]().Title("Commit type").Options(
                huh.NewOption("feat — A new feature", "feat"),
                huh.NewOption("fix — A bug fix", "fix"),
                huh.NewOption("refactor — Code restructuring", "refactor"),
                // ...
            ).Value(&commitType),
            huh.NewInput().Title("Scope (optional)").Value(&scope),
            huh.NewInput().Title("Description").Value(&description),
        ),
    ).WithTheme(groveTheme)
    if err := form.Run(); err != nil { return "", err }
    if scope != "" {
        return fmt.Sprintf("%s(%s): %s", commitType, scope, description), nil
    }
    return fmt.Sprintf("%s: %s", commitType, description), nil
}
```

**Safety Tier Confirmation** (replaces Click's yes/no prompts):

```go
func ConfirmDangerousOp(operation, target string) (bool, error) {
    var confirmed bool
    form := huh.NewForm(huh.NewGroup(
        huh.NewNote().Title("⚠️  Dangerous Operation").Description(
            fmt.Sprintf("You are about to %s on %s.\nRequires --write --force.", operation, target),
        ),
        huh.NewConfirm().Title("Proceed?").
            Affirmative("Yes, I understand").Negative("Cancel").
            Value(&confirmed),
    )).WithTheme(groveTheme)
    return confirmed, form.Run()
}
```

### Phase 3: Interactive TUIs (Bubble Tea)

Full keyboard-driven interfaces. This is what Python physically cannot do.

**`gw git status` — Interactive File Manager:**

```
┌─ gw git status ──────────────────────────────────────────────┐
│  Branch: feat/charm-integration  ↑2 ↓0 from origin          │
│                                                               │
│  Staged (3)                                                   │
│  │ ✓ M  src/lib/auth.ts                                     │
│  │ ✓ M  src/lib/session.ts                                  │
│  │ ✓ A  src/lib/tokens.ts                                   │
│                                                               │
│  Unstaged (2)                                                 │
│  │▸M  src/routes/+page.svelte          ← cursor              │
│  │ M  src/routes/+layout.server.ts                           │
│                                                               │
│  Preview:                                                     │
│  │ @@ -12,6 +12,8 @@                                        │
│  │  <script>                                                 │
│  │ +  import { session } from '$lib/session';                │
│  │ +  import { validateToken } from '$lib/tokens';           │
│                                                               │
│  [s] stage  [u] unstage  [d] diff  [c] commit  [q] quit     │
└───────────────────────────────────────────────────────────────┘
```

**`gw gh pr list` — Interactive PR Browser:**

```
┌─ gw gh pr list ──────────────────────────────────────────────┐
│  Filter: [all ▾]  Sort: [updated ▾]  Search: [          ]   │
│                                                               │
│  │ # │ Title                            │ Author │ Status │  │
│  │▸47│ feat(auth): add session refresh  │ autumn │ ✓ Pass │  │
│  │ 45│ fix(ui): glass card blur Safari  │ autumn │ ● Run  │  │
│  │ 43│ docs: update API reference       │ autumn │ ✓ Pass │  │
│  │ 41│ refactor: extract tenant service │ autumn │ ✗ Fail │  │
│                                                               │
│  PR #47 — +142 -28 │ 3 files │ 2 commits │ CI: passing      │
│                                                               │
│  [enter] view  [m] merge  [c] checkout  [o] browser         │
└───────────────────────────────────────────────────────────────┘
```

**`gw ci` — Live CI Dashboard:**

```
┌─ gw ci ──────────────────────────────────────────────────────┐
│  Running CI for: apps/grove (SvelteKit)                      │
│  ═══════════════════════════════════════════ 67%              │
│                                                               │
│  ✓ Install dependencies ................... 3.2s             │
│  ✓ Type check (tsc --noEmit) .............. 8.1s             │
│  ✓ Lint (eslint) .......................... 4.3s             │
│  ● Build (vite build) .................... 12.4s  ← running  │
│  ○ Test (vitest) .......................... —                 │
│  ○ Format check (prettier) ............... —                 │
│                                                               │
│  [q] quit  [f] toggle follow  [v] verbose                    │
└───────────────────────────────────────────────────────────────┘
```

---

## Safety System

The 4-tiered safety system ports directly. Go's type system enforces tiers at compile time.

### Tier Definitions

```go
type SafetyTier int

const (
    TierRead      SafetyTier = iota  // Always safe, no flags needed
    TierWrite                         // Requires --write flag
    TierDangerous                     // Requires --write AND --force
    TierProtected                     // Never allowed
)
```

### Operation Flow

```
Request arrives
    │
    ▼
Classify tier ── READ ──→ Execute immediately
    │
    WRITE
    │
    ▼
--write flag? ── No ──→ Error: "requires --write"
    │
    Yes ──→ Execute
    │
    DANGEROUS
    │
    ▼
--write AND --force? ── No ──→ Error: "requires --write --force"
    │
    Yes + Interactive? ──→ Huh confirmation ── Cancel ──→ Abort
    │                                          │
    Yes + Agent mode? ──→ Execute              Confirmed ──→ Execute
    │
    PROTECTED ──→ Block unconditionally
```

### Git Safety Classifications

| Tier | Operations |
|------|-----------|
| READ | status, log, diff, show, blame, fetch, reflog, shortlog, branch --list |
| WRITE | add, commit, push, pull, switch, checkout, stash, unstage, restore, cherry-pick |
| DANGEROUS | reset, rebase, merge, force-push, clean, branch --delete |
| PROTECTED | force-push to main/master/production/staging |

### Database Safety

Same validation as Python. Pre-compiled regex patterns, early returns.

- Block all DDL (CREATE, DROP, ALTER, TRUNCATE)
- Block injection patterns (stacked queries, comment attacks)
- Require WHERE clause on DELETE/UPDATE
- Block writes to protected tables (users, tenants, subscriptions, payments, sessions)
- Enforce row limits (100 delete / 500 update in interactive, 50 / 200 in agent mode)

---

## Configuration System

### File Format (unchanged)

The Go version reads the same `~/.grove/gw.toml`. Zero migration effort.

```toml
[databases.lattice]
name = "grove-engine-db"
id = "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68"

[safety]
max_delete_rows = 100
max_update_rows = 500
protected_tables = ["users", "tenants", "subscriptions", "payments", "sessions"]

[git]
commit_format = "conventional"
protected_branches = ["main", "master", "production", "staging"]
auto_link_issues = true

[github]
owner = "AutumnsGrove"
repo = "Lattice"
rate_limit_warn_threshold = 100
```

### Go Config Struct

```go
type Config struct {
    Databases    map[string]Database   `toml:"databases"`
    KVNamespaces map[string]Namespace  `toml:"kv_namespaces"`
    R2Buckets    []Bucket              `toml:"r2_buckets"`
    Safety       SafetyConfig          `toml:"safety"`
    Git          GitConfig             `toml:"git"`
    GitHub       GitHubConfig          `toml:"github"`
}
```

### Agent Mode

When `GW_AGENT_MODE=1` is set (or `--agent` flag):

- Stricter safety limits (50 delete, 200 update vs 100/500)
- No color output (machine-readable)
- JSON output mode available (`--json`)
- Interactive prompts disabled (fail-safe: deny if confirmation needed)
- `--write` is never auto-implied

---

## Secrets Vault

The vault must be backwards-compatible with existing `~/.grove/secrets.enc` files.

Python's `cryptography.fernet.Fernet` uses AES-128-CBC with HMAC-SHA256 authentication, PBKDF2-HMAC-SHA256 key derivation (100,000 iterations), and Base64url encoding. The Go implementation uses `crypto/aes`, `crypto/hmac`, `crypto/sha256`, and `golang.org/x/crypto/pbkdf2` to produce byte-identical output.

```go
func Open(path, passphrase string) (*Vault, error) {
    salt := readSalt(path)
    key := pbkdf2.Key([]byte(passphrase), salt, 100000, 32, sha256.New)
    return &Vault{path: path, key: key}, nil
}
```

Existing vaults created by Python gw open without any migration step.

---

## Command Mapping: Python → Go

Every Python command maps to a Go file. The table below is the complete inventory.

### Top-Level Commands

| Command | Go File | Tier |
|---------|---------|------|
| `gw status` | status.go | READ |
| `gw health` | health.go | READ |
| `gw doctor` | doctor.go | READ |
| `gw whoami` | whoami.go | READ |
| `gw context` | context.go | READ |
| `gw packages` | packages.go | READ |
| `gw bindings` | status.go | READ |
| `gw deploy` | deploy.go | WRITE |
| `gw logs` | logs.go | READ |
| `gw config-validate` | status.go | READ |
| `gw env-audit` | status.go | READ |
| `gw monorepo-size` | packages.go | READ |

### Git Commands

| Command | Go File | Tier |
|---------|---------|------|
| `gw git status/log/diff/show/blame` | git_read.go | READ |
| `gw git fetch/reflog/shortlog` | git_read.go | READ |
| `gw git add/commit/push/pull` | git_write.go | WRITE |
| `gw git branch/switch/checkout` | git_write.go | WRITE |
| `gw git stash/unstage/restore/cherry-pick` | git_write.go | WRITE |
| `gw git reset/rebase/merge` | git_danger.go | DANGEROUS |
| `gw git force-push` | git_danger.go | DANGEROUS/PROTECTED |
| `gw git save/sync/wip/fast` | git_shortcuts.go | WRITE |
| `gw git ship/prep/pr-prep` | git_shortcuts.go | WRITE/READ |
| `gw git undo/amend` | git_shortcuts.go | DANGEROUS |
| `gw git worktree *` | git_worktree.go | WRITE |
| `gw git remote/tag/config` | git_read.go | READ/WRITE |

### GitHub Commands

| Command | Go File | Tier |
|---------|---------|------|
| `gw gh pr list/view/status` | gh_pr.go | READ |
| `gw gh pr create/comment` | gh_pr.go | WRITE |
| `gw gh pr merge` | gh_pr.go | DANGEROUS |
| `gw gh issue list/view` | gh_issue.go | READ |
| `gw gh issue create/close` | gh_issue.go | WRITE |
| `gw gh run list/view/watch` | gh_run.go | READ |
| `gw gh run rerun/cancel` | gh_run.go | WRITE |
| `gw gh api` | gh_api.go | varies |
| `gw gh rate-limit` | gh_api.go | READ |
| `gw gh project` | gh_api.go | varies |

### Dev Commands

| Command | Go File | Tier |
|---------|---------|------|
| `gw dev start/stop/restart` | dev_server.go | WRITE |
| `gw dev logs` | dev_server.go | READ |
| `gw dev test/check/lint/fmt` | dev_quality.go | READ |
| `gw dev build/ci` | dev_build.go | READ |
| `gw dev reinstall` | dev_build.go | WRITE |
| `gw test/build/check/lint/ci` | (aliases) | READ |

### Infrastructure Commands

| Command | Go File | Tier |
|---------|---------|------|
| `gw d1 list/tables/schema/query` | d1.go | READ |
| `gw d1 migrate` | d1.go | WRITE |
| `gw kv list/keys/get` | kv.go | READ |
| `gw kv put/delete` | kv.go | WRITE |
| `gw r2 list/ls/get` | r2.go | READ |
| `gw r2 create/put` | r2.go | WRITE |
| `gw r2 rm` | r2.go | DANGEROUS |
| `gw cache list/stats` | cache.go | READ |
| `gw cache purge` | cache.go | WRITE |
| `gw backup list/download` | backup.go | READ |
| `gw backup create` | backup.go | WRITE |
| `gw backup restore` | backup.go | DANGEROUS |
| `gw export list/status/download` | export.go | READ |
| `gw export start/cleanup` | export.go | WRITE |
| `gw do list/info/alarm` | do.go | READ |
| `gw flag list/get` | flag.go | READ |
| `gw flag enable/disable/delete` | flag.go | WRITE |
| `gw email status/rules` | email.go | READ |
| `gw email test` | email.go | WRITE |

### Auth, Secrets, Meta

| Command | Go File | Tier |
|---------|---------|------|
| `gw auth check` | auth.go | READ |
| `gw auth login` | auth.go | WRITE |
| `gw auth client *` | auth.go | READ/WRITE/DANGEROUS |
| `gw secret init/set/generate/delete` | secret.go | WRITE |
| `gw secret list/reveal/exists` | secret.go | READ |
| `gw secret apply/sync` | secret.go | WRITE |
| `gw tenant list/lookup/stats` | tenant.go | READ |
| `gw tenant create` | tenant.go | WRITE |
| `gw tenant delete` | tenant.go | DANGEROUS |
| `gw social post` | social.go | WRITE |
| `gw social status/history/setup` | social.go | READ |
| `gw metrics summary/errors/export` | metrics.go | READ |
| `gw metrics clear` | metrics.go | WRITE |
| `gw history list/search/show` | history.go | READ |
| `gw history run/clear` | history.go | WRITE |
| `gw completion install/uninstall` | completion.go | WRITE |
| `gw completion bash/zsh/fish` | completion.go | READ |
| `gw mcp serve` | mcp.go | — (delegates to Python) |
| `gw mcp tools/config` | mcp.go | READ |
| `gw queen ci/swarm` | queen.go | WRITE |
| `gw warden agent/logs/status` | warden.go | READ |
| `gw publish npm` | publish.go | WRITE |

---

## Help System: Cozy in Go

The Python spec planned a `CozyGroup` class for Rich panels. The Go version implements the same concept using Cobra's custom help templates and Lip Gloss rendering.

Each command group defines categories (same structure as the Python CozyGroup spec):

```go
var gitCategories = []HelpCategory{
    {Title: "Read (Always Safe)", Icon: "📖", Style: SafeReadStyle,
     Commands: []string{"status", "log", "diff", "show", "blame", "fetch"}},
    {Title: "Write (Require --write)", Icon: "✏️", Style: SafeWriteStyle,
     Commands: []string{"add", "commit", "push", "pull", "branch", "switch"}},
    {Title: "Dangerous (--write --force)", Icon: "🔥", Style: DangerStyle,
     Commands: []string{"reset", "rebase", "merge", "force-push"}},
    {Title: "Shortcuts", Icon: "⚡", Style: ShortcutStyle,
     Commands: []string{"save", "sync", "wip", "undo", "amend", "ship"}},
}
```

Cobra's `SetHelpTemplate()` renders these into Lip Gloss-styled panels. Same warm tea shop feeling, compiled into the binary. All 22 command groups get the cozy treatment from day one.

---

## Dependencies

```
grove-wrap-go
├── github.com/spf13/cobra              # CLI framework
├── github.com/spf13/pflag              # Flag parsing (via Cobra)
├── github.com/BurntSushi/toml          # TOML config read/write
├── github.com/charmbracelet/lipgloss/v2  # Terminal styling
├── github.com/charmbracelet/bubbletea    # Interactive TUI
├── github.com/charmbracelet/huh          # Interactive forms
├── github.com/charmbracelet/glamour      # Markdown rendering
├── github.com/charmbracelet/table        # Table rendering
├── github.com/charmbracelet/log          # Structured logging
├── golang.org/x/crypto/pbkdf2          # Key derivation (vault)
└── golang.org/x/sync                   # Concurrency primitives
```

**11 direct dependencies.** All compiled into the binary. No runtime loading, no import tax.

**Expected binary size:** ~8-10MB (larger than gf's 5.1MB due to Charm, still tiny)

---

## Performance Targets

| Metric | Python (current) | Go (target) | Improvement |
|--------|-----------------|-------------|-------------|
| Startup to first output | 775-1,360ms | <50ms | 15-27x |
| `gw status` end-to-end | ~2s | <200ms | 10x |
| `gw git status` end-to-end | ~1.5s | <100ms | 15x |
| `gw --help` | ~800ms | <30ms | 27x |
| Binary size | N/A (interpreted) | ~8-10MB | Single file |
| Install time | ~30s (uv tool install) | ~1s (copy binary) | 30x |
| Memory usage | ~40MB (Python + deps) | ~5MB | 8x |

---

## Implementation Plan

### Phase 0: Project Scaffolding

- [ ] Create `tools/grove-wrap-go/` directory structure
- [ ] Initialize Go module, Makefile, install.sh
- [ ] Basic Cobra root command with global flags (--write, --force, --json, --agent, --verbose)
- [ ] Config loader for `~/.grove/gw.toml`
- [ ] Grove theme and Lip Gloss styles (`internal/ui/`)
- [ ] Safety tier engine (`internal/safety/`)
- [ ] Subprocess runner (`internal/exec/`)
- [ ] Cozy help template system

### Phase 1: Core Read Commands

Highest-traffic read-only commands. No write operations, no risk.

- [ ] `gw status`, `gw health`, `gw context`, `gw whoami`, `gw doctor`
- [ ] `gw git status`, `gw git log`, `gw git diff`, `gw git show`, `gw git blame`
- [ ] `gw git fetch`, `gw git reflog`, `gw git shortlog`
- [ ] `gw packages`, `gw --help` (cozy panels)

### Phase 2: Git Write Operations + Safety

- [ ] `gw git add`, `gw git commit` (with conventional commit validation)
- [ ] `gw git push`, `gw git pull`, `gw git branch`, `gw git switch`
- [ ] `gw git stash`, `gw git unstage`, `gw git restore`
- [ ] `gw git save`, `gw git sync`, `gw git wip`, `gw git ship`
- [ ] `gw git prep`, `gw git pr-prep`
- [ ] Safety tier enforcement (--write, --force)
- [ ] Agent mode detection

### Phase 3: GitHub + Dev Tools

- [ ] `gw gh pr *`, `gw gh issue *`, `gw gh run *`
- [ ] `gw gh api`, `gw gh rate-limit`
- [ ] `gw dev test/check/lint/fmt`, `gw dev build/ci`
- [ ] `gw dev start/stop/restart/logs`
- [ ] Top-level aliases (gw test, gw build, gw ci, gw check, gw lint)

### Phase 4: Infrastructure Commands

- [ ] `gw d1 *` (with SQL safety validation)
- [ ] `gw kv *`, `gw r2 *`, `gw cache *`
- [ ] `gw deploy`, `gw logs`
- [ ] `gw backup *`, `gw export *`
- [ ] `gw do *`, `gw flag *`, `gw email *`

### Phase 5: Auth, Secrets, Meta

- [ ] `gw secret *` (Fernet-compatible vault)
- [ ] `gw auth *` (OAuth client management)
- [ ] `gw tenant *`, `gw social *`
- [ ] `gw metrics *`, `gw history *`
- [ ] `gw completion *` (Cobra built-in + custom)
- [ ] `gw publish *`, `gw queen *`, `gw warden *`

### Phase 6: Interactive TUIs (Bubble Tea)

- [ ] `gw git status` interactive mode (stage/unstage/diff/commit)
- [ ] `gw gh pr list` interactive mode (view/merge/checkout)
- [ ] `gw ci` live dashboard with progress bars
- [ ] `gw logs` interactive log viewer with filtering
- [ ] `gw d1 query` interactive results browser
- [ ] Conventional commit builder (Huh form)
- [ ] Safety confirmation forms (Huh)

### Phase 7: Distribution + Migration

- [ ] Makefile: build for linux-x86_64, linux-arm64, darwin-arm64, windows-x86_64
- [ ] Pre-built binaries in `dist/`
- [ ] GitHub Actions workflow for automated builds
- [ ] Update install.sh to handle both gf and gw
- [ ] Update AGENT.md installation instructions
- [ ] `gw mcp serve` delegates to Python MCP server
- [ ] Migration guide: Python gw → Go gw
- [ ] Update Claude Code hooks to reference Go binary

---

## Migration Strategy

### Parallel Running Period

Both versions coexist during migration:

```
gw-py git status      # Python version (renamed temporarily)
gw git status         # Go version (takes the gw name)
gw mcp serve          # Go binary launches Python MCP server
```

### Breaking Changes: None

- Same command names and flags
- Same config file format (`~/.grove/gw.toml`)
- Same safety tiers and behavior
- Same `--write` / `--force` semantics
- Same conventional commit validation rules
- Same `--json` output format

The Go binary is a drop-in replacement. The only visible difference is speed.

### Cutover Plan

1. Go binary lands as `gw2` for testing alongside Python `gw`
2. Run both in parallel, compare output for key commands
3. Once parity is confirmed, swap: Go becomes `gw`, Python becomes `gw-py`
4. After a stabilization period, remove `gw-py`
5. Python MCP server continues to run independently (see sister spec)

---

## Security Considerations

- Secrets vault uses Go standard library crypto, no third-party encryption packages
- Subprocess execution uses `exec.Command` with argument lists (no shell injection)
- SQL validation reuses the same patterns as Python (pre-compiled regexes)
- Protected branches list is config-driven, not hardcoded
- Agent mode enforces stricter limits by default
- No network calls except through wrapped tools (git, gh, wrangler)
- Binary is compiled. No source code exposure at runtime

---

## Related Documents

- [GW Performance Analysis](./gw-performance-analysis.md)
- [GW MCP Server (Python)](./gw-mcp-server-python.md)
- [GW CLI Audit and Refactor](./gw-cli-audit-and-refactor.md)
- [GF Python to Go Port](../completed/gf-python-to-go-port.md)

---

*The prototype whispered what the tool could be. The forge shouts it into existence.*
