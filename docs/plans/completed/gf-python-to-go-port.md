# Grove Find (gf) — Python to Go Port

**Created**: 2026-02-13
**Status**: Completed (Python version archived 2026-02-17)
**Priority**: High (developer tooling performance)

## Goal

Port the `gf` CLI tool from Python (Typer + Rich) to Go (Cobra) for near-instant startup, parallel subprocess execution, and single-binary distribution. Every command, flag, and output format must be preserved.

## Background

`gf` is a codebase search tool optimized for AI agents. It wraps ripgrep, fd, git, and gh with context-enriched commands that reduce agent round-trips by ~50%. The Python version works well but suffers from 300-600ms startup overhead (Python interpreter + imports), sequential subprocess execution, and requires a Python/UV environment.

### Why Go

- **Startup**: Sub-10ms vs 300-600ms (Python interpreter + Typer/Rich imports)
- **Parallelism**: Goroutines for multi-query commands (class, impact, orphaned)
- **Distribution**: Single static binary, no runtime dependencies
- **Ecosystem fit**: ripgrep and fd are Rust; Go is the natural CLI companion

## Scope

### In Scope

- All 40+ top-level commands
- All 3 subcommand groups (git, github, cf) — **unhidden**
- All 3 output modes (human, agent, JSON)
- Global flags: `--root`, `--agent`, `--json`, `--verbose`, `--version`
- fd-to-rg fallback for file finding
- JSON output for **all** commands (expanding beyond Python's 3)
- Standard exclusion globs (node_modules, .git, dist, build, \*.lock)

### Out of Scope

- gw (separate tool, stays Python)
- MCP server integration (future phase)
- New commands not in the Python version

## Architecture

### Directory Structure

```
tools/grove-find-go/
├── go.mod
├── go.sum
├── main.go                    # Entry point
├── cmd/
│   ├── root.go                # Root command + global flags
│   ├── search.go              # search, class, func, usage, imports
│   ├── files.go               # svelte, ts, js, css, md, json, etc.
│   ├── git.go                 # git subcommand group
│   ├── github.go              # github subcommand group
│   ├── cf.go                  # cloudflare subcommand group
│   ├── quality.go             # todo, log, env, engine
│   ├── project.go             # stats, briefing, deps, config-diff
│   ├── domain.go              # routes, db, glass, store, type, export, auth
│   ├── infra.go               # large, orphaned, migrations, flags, workers, emails
│   └── impact.go              # impact, test-for, diff-summary
├── internal/
│   ├── config/
│   │   └── config.go          # Config loading (root, agent mode, json mode)
│   ├── tools/
│   │   └── tools.go           # Tool discovery (rg, fd, git, gh) — cached
│   ├── search/
│   │   └── search.go          # Ripgrep/fd wrapper with standard exclusions
│   └── output/
│       └── output.go          # Output formatting (human/agent/JSON)
└── Makefile                   # Build targets
```

### Key Design Decisions

1. **Cobra** for CLI framework (Go equivalent of Typer)
2. **Tool discovery once** at init, cached in a global struct
3. **Parallel subprocess calls** via goroutines where commands run multiple searches
4. **Streaming output** where possible (don't buffer entire rg output)
5. **All commands support JSON output** (`--json` flag)
6. **Subcommand groups are visible** (not hidden like Python version)
7. **fd fallback to rg --files** mirrors Python behavior exactly

### Output Modes

| Mode  | Trigger                  | Behavior                                            |
| ----- | ------------------------ | --------------------------------------------------- |
| Human | default                  | Colored output, section headers with formatting     |
| Agent | `--agent` / `GF_AGENT=1` | Plain text, `=== ===` / `--- ---` headers, no color |
| JSON  | `--json`                 | Structured JSON for all commands                    |

### Ripgrep Integration

Single `RunRg()` function in `internal/search/`:

```go
func RunRg(args []string, opts ...Option) (string, error)
```

Options: `WithCwd()`, `WithColor()`, `WithExcludes()`, `WithType()`, `WithFilesOnly()`

Standard exclusions applied by default:

- `--glob !node_modules`
- `--glob !.git`
- `--glob !dist`
- `--glob !build`
- `--glob !*.lock`
- `--glob !pnpm-lock.yaml`

## Implementation Phases

### Phase 1: Core Infrastructure

- Go module init
- Config loading (root detection, env vars, flags)
- Tool discovery with caching
- Ripgrep/fd wrapper
- Output formatting (human/agent/JSON)
- Root command with global flags

### Phase 2: Search Commands

- `search`, `class`, `func`, `usage`, `imports`
- These are the most-used commands

### Phase 3: File Type Commands

- `svelte`, `ts`, `js`, `css`, `md`, `json`, `toml`, `yaml`, `html`, `shell`
- `test`, `config`
- All share the same pattern: find files by type, optionally filter by name

### Phase 4: Git Commands

- Top-level: `recent`, `changed`
- Subcommand group: `git blame`, `git history`, `git pickaxe`, `git commits`, `git churn`, `git branches`, `git pr`, `git wip`, `git stash`, `git reflog`, `git tag`

### Phase 5: Project & Quality Commands

- `todo`, `log`, `env`, `stats`, `briefing`
- `deps`, `config-diff`

### Phase 6: Domain Commands

- `routes`, `db`, `glass`, `store`, `type`, `export`, `auth`, `engine`

### Phase 7: Infrastructure Commands

- `large`, `orphaned`, `migrations`, `flags`, `workers`, `emails`

### Phase 8: Impact Analysis

- `impact`, `test-for`, `diff-summary`

### Phase 9: GitHub & Cloudflare Groups

- `github` subcommand group (issue, issues, board, mine, stale, refs, link)
- `cf` subcommand group (overview, d1, kv, r2, do)

## Migration Strategy

The Go binary will be installed alongside the Python version initially:

- Python: `gf` (existing, via `uv tool install`)
- Go: `gf-go` or replaces `gf` directly

Once validated, the Go binary replaces the Python version entirely. The Python code remains in `tools/grove-find/` for reference.

## Testing Strategy

- Test against the same codebase the Python version searches
- Compare output of Go vs Python for key commands
- Ensure agent mode output is byte-identical where possible
- JSON output must be structurally equivalent

## Performance Targets

| Metric                     | Python            | Go Target |
| -------------------------- | ----------------- | --------- |
| Startup (no-op)            | 300-600ms         | <10ms     |
| Simple search              | 400-700ms         | <100ms    |
| Complex command (briefing) | 1-2s              | <300ms    |
| Binary size                | N/A (interpreted) | <15MB     |
