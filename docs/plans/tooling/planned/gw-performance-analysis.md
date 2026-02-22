# Grove Wrap (gw) — Performance Analysis & Go Port Feasibility

**Created**: 2026-02-22
**Status**: Analysis Complete — Decision Pending
**Priority**: High (developer tooling performance)

## Executive Summary

GW is a 29,000-line Python CLI with 212 leaf commands across 84 source files. It wraps 12 external tools (git, gh, wrangler, pnpm, bun, etc.) behind a safety-tiered interface. Every invocation pays a **~580ms import tax** before any command logic runs, and total startup (including uv/venv resolution) reaches **775ms–1.4s**. For comparison, the Go-based GF binary starts in **13ms** — a **60-100x difference**.

This overhead compounds across a typical session: 50 GW invocations/day × 1s each = **~50 seconds of pure waiting**, just for the interpreter to boot.

---

## The Problem: Where Time Goes

### Measured Startup Breakdown

| Phase | Time | What Happens |
|-------|------|-------------|
| Python interpreter + uv resolution | ~200-800ms | Find venv, load interpreter, resolve entry point |
| `click` import | ~116ms | CLI framework + all its decorators |
| `rich` imports (5 modules) | ~324ms | Console, Panel, Spinner, Table, Text |
| `tomli` import | ~7ms | TOML parser (lightweight) |
| Standard library | ~20ms | subprocess, json, re, Path, etc. |
| All 84 command modules | ~115ms | Every command file imported eagerly at startup |
| **Total to first useful work** | **~780-1,360ms** | Before any actual command logic executes |

### Root Causes

1. **Eager import of everything**: `cli.py` imports all 30+ command modules at the top level. Even `gw status` loads the git worktree system, the export pipeline, the social cross-poster, the MCP server commands — all before doing anything.

2. **Rich is heavy**: The Rich library alone costs ~324ms. It's used for beautiful terminal output, but that beauty has a price. Every single command pays this cost whether it uses Rich panels or just prints a string.

3. **Click framework overhead**: ~116ms just to set up the CLI framework. Click is convenient but not lightweight.

4. **Python interpreter startup**: The interpreter itself, plus venv resolution via uv, adds 200-800ms of pure overhead that no amount of Python optimization can eliminate.

5. **No lazy loading**: Unlike GW's MCP server (which correctly defers `from ..mcp_server import run_server` to execution time), most command modules are imported eagerly.

---

## GW vs GF: Architecture Comparison

| Dimension | GW (Python) | GF (Go) |
|-----------|-------------|---------|
| **Language** | Python 3.12+ | Go 1.24 |
| **CLI Framework** | Click | Cobra |
| **UI Library** | Rich (324ms import) | ANSI escape codes (0ms) |
| **Config Parser** | tomli + tomli_w | encoding/json (stdlib) |
| **Crypto** | cryptography (Fernet) | — (not needed) |
| **MCP Server** | mcp (FastMCP) | — (not needed yet) |
| **Total Dependencies** | 36 packages installed | 3 (Cobra, pflag, sync) |
| **Source Lines** | 29,019 Python | 8,973 Go |
| **Source Files** | 84 .py files | 16 .go files |
| **Leaf Commands** | 212 | ~70 |
| **External Tools** | 12 (git, gh, wrangler, pnpm, bun, etc.) | 4 (rg, fd, git, gh) |
| **Startup Time** | 775ms–1,360ms | 13ms |
| **Binary Size** | N/A (interpreted) | 5.1MB |
| **Distribution** | `uv tool install --editable` | Pre-compiled binary in dist/ |

### Key Architectural Differences

**GF is a search aggregator**: It wraps ripgrep/fd/git/gh, runs them in parallel via goroutines, and formats the output. It has no write operations, no safety tiers, no state management. Every command follows the same pattern: parse args → run external tools → format output.

**GW is an infrastructure orchestration layer**: It manages database safety, git workflow enforcement, conventional commit validation, secrets vault (with encryption), MCP server, metrics tracking, worktree management, deployment pipelines, and more. It has:
- 4 safety tiers (READ → WRITE → DANGEROUS → PROTECTED)
- `--write` flag enforcement
- Agent mode vs interactive mode
- Config persistence (~/.grove/gw.toml)
- Metrics collection and history
- Secrets vault with Fernet encryption
- MCP server for Claude Code integration
- Shell completion generation (bash/zsh/fish)

---

## Feasibility Assessment: Porting GW to Go

### What Ports Cleanly (Low Risk)

These are "GF-shaped" — subprocess wrapping + output formatting:

| Command Group | Commands | Complexity | Notes |
|--------------|----------|------------|-------|
| git read ops | status, log, diff, blame, show | Low | Direct git subprocess calls |
| gh read ops | pr list/view, issue list/view, run list | Low | Direct gh subprocess calls |
| status/health | status, health, bindings, doctor | Low | Read-only queries |
| d1 read ops | tables, schema, query (SELECT) | Low | Wrangler subprocess |
| kv/r2 read ops | list, get | Low | Wrangler subprocess |
| dev tools | test, build, check, lint, ci | Medium | Shell out to pnpm/bun |
| context | context | Medium | Multi-tool aggregation (like GF's briefing) |
| packages | list, graph | Low | Parse pnpm-workspace.yaml |

**Estimated effort**: ~60% of commands, ~40% of code

### What Ports with Moderate Effort

| Feature | Complexity | Challenge |
|---------|------------|-----------|
| Git write ops (commit, push, ship) | Medium | Conventional commit validation, hook skipping logic |
| Git safety system | Medium | Tier classification, `--write` enforcement |
| GitHub write ops (pr create, issue create) | Medium | Template handling, label management |
| Config system | Medium | TOML read/write (Go has good TOML libs) |
| Help formatter (CozyGroup) | Medium | Recreating Rich's panel/table formatting in ANSI |
| Metrics tracking | Medium | SQLite or JSON file I/O |
| History system | Low-Medium | Append-only log file |

**Estimated effort**: ~25% of commands, ~35% of code

### What's Hard to Port (High Risk)

| Feature | Complexity | Challenge |
|---------|------------|-----------|
| **MCP Server** | High | Go MCP SDK is immature vs Python's `mcp` library. FastMCP makes this trivial in Python. |
| **Secrets Vault** | Medium-High | Fernet encryption. Go has crypto libs but need to match the exact format for existing vaults. |
| **Shell completions** | Medium | Click generates these automatically. In Go, Cobra also does, but the custom ones need porting. |
| **Git worktree manager** | Medium-High | 10 subcommands with directory management, state tracking |
| **Warden** | Medium | Service management, log tailing |
| **Queen (future)** | Unknown | CI coordinator — not yet built |
| **Rich-quality output** | High | Rich's tables, panels, spinners, markdown rendering have no direct Go equivalent at the same quality level |

**Estimated effort**: ~15% of commands, ~25% of code

---

## Option Analysis

### Option A: Full Go Port

**Approach**: Rewrite all 29,000 lines in Go, matching all 212 commands.

| Dimension | Assessment |
|-----------|------------|
| Startup improvement | 60-100x (13ms vs 780-1360ms) |
| Development effort | Very high — GW is 3.2x the code volume of GF |
| Agent experience | Excellent — pre-compiled binary, no install dance |
| Maintainability | Harder for you personally (Python is your stronger language) |
| MCP Server risk | High — Go MCP ecosystem is immature |
| Feature velocity | Slower in Go (more boilerplate, stricter type system) |
| Rich output quality | Would regress — no Go equivalent of Rich |

**Verdict**: High reward, very high cost, real risk on MCP and output quality.

### Option B: Hybrid — Go Binary + Python MCP Server

**Approach**: Port the CLI to Go, keep the MCP server in Python.

This is architecturally clean because the MCP server is already a separate module (`mcp_server.py`) with a lazy import. The CLI and MCP server share wrappers (`git_wrapper.py`, `gh_wrapper.py`, `wrangler.py`), but the MCP server could shell out to the Go binary instead.

| Dimension | Assessment |
|-----------|------------|
| Startup improvement | 60-100x for CLI; MCP server startup doesn't matter (long-running) |
| Development effort | High but reduced — MCP server stays Python |
| Agent experience | Excellent for CLI; MCP is already fine (long-lived process) |
| MCP complexity | Eliminated — stays in Python where the SDK is mature |
| Feature velocity | Go CLI + Python MCP = best of both worlds |

**Verdict**: Best balance. MCP server startup time doesn't matter because it's a long-running process. CLI is the hot path.

### Option C: Optimize Python (No Rewrite)

**Approach**: Keep Python, apply aggressive optimization.

Specific optimizations available:
1. **Lazy imports**: Defer all command modules to execution time. Only import the one command being run. Potential savings: ~100-200ms.
2. **Replace Rich with lightweight output**: Use ANSI escape codes directly for most output. Keep Rich only for complex tables. Potential savings: ~200-300ms.
3. **Use `python -S` or `sitecustomize` tricks**: Skip site-packages scanning. Marginal savings.
4. **Compile with Nuitka or Cython**: Compile Python to native code. Can reduce startup to ~200-400ms, but adds build complexity.
5. **Use `zipapp` or `shiv`**: Package as a zip application. Marginal improvement.

| Dimension | Assessment |
|-----------|------------|
| Startup improvement | 2-3x at best (400ms → ~200ms with lazy imports + no Rich) |
| Development effort | Low-Medium |
| Agent experience | No change — still needs Python/uv |
| Maintainability | Stays in your comfort zone |
| Output quality | Would degrade if Rich is removed |

**Verdict**: Low hanging fruit exists, but Python's fundamental interpreter overhead (~200ms minimum) creates a floor you can't break through. 200ms is still 15x slower than Go's 13ms.

### Option D: Python with PyInstaller/Nuitka Binary

**Approach**: Keep Python source, compile to native binary for distribution.

| Dimension | Assessment |
|-----------|------------|
| Startup improvement | 2-5x (300-500ms realistic) |
| Binary size | 30-80MB (bundles Python interpreter + all deps) |
| Build complexity | High — cross-compilation is painful |
| Agent experience | Better — single binary, no uv install needed |
| Maintainability | Source stays Python, build gets complicated |

**Verdict**: Moderate improvement with significant build complexity. Binary size is bloated.

---

## Recommendation

### Phase 1 (Immediate): Optimize Python — Lazy Loading

Before doing any rewrite, grab the easy wins:

1. Convert all imports in `cli.py` to lazy imports using Click's lazy loading pattern
2. This alone should cut ~100-200ms from startup
3. Zero risk, fully backwards compatible

### Phase 2 (Near-term): Decide Go Port Scope

The GF port proved the model works. The question is scope:

**Recommended: Option B (Hybrid)**
- Port the CLI to Go for the 60-100x startup improvement
- Keep the MCP server in Python where the SDK is mature
- The MCP server's startup time doesn't matter — it's a long-running process
- The CLI is invoked 50-100 times per day — that's where the pain is

### Phase 3 (If Go port proceeds): Port Order

Follow the same phased approach that worked for GF:

1. **Core infrastructure**: Config loading, tool discovery, output formatting, safety tier system
2. **Read-only commands first**: status, health, git status/log/diff, d1 tables/schema
3. **Git workflows**: The most-used commands (ship, commit, push, prep)
4. **Everything else**: Cloudflare, export, social, warden, etc.
5. **MCP stays Python**: Or migrates later when Go MCP SDKs mature

### Phase 4: Binary Distribution

Same model as GF:
- Pre-compiled binaries in `dist/` (4 platforms)
- `install.sh` auto-detects OS/arch
- GitHub Actions workflow for automated rebuilds
- Binary committed to repo for zero-dependency installation

---

## Appendix: Raw Measurements

```
Environment: Linux 4.4.0, Python 3.12.3, Go 1.24.0

GW startup (uv run gw --help):        1,362ms
GW startup (uv run gw status --help):   775ms
GW import chain only:                    582ms
  click:                                 116ms
  rich (5 modules):                      324ms
  tomli:                                   7ms
  stdlib:                                 20ms
  84 command modules:                   ~115ms

GF startup (pre-compiled binary):         13ms

Ratio: 60-100x faster
```

```
GW code volume:
  Total lines:    29,019
  Total files:    84
  Leaf commands:  212
  Top-level groups: 40
  Largest files:
    mcp_server.py:     1,432 lines
    gh_wrapper.py:     1,175 lines
    git/write.py:      1,026 lines
    gh/pr.py:            881 lines
    git/worktree.py:     860 lines
    git_wrapper.py:      825 lines

GF code volume:
  Total lines:    8,973
  Total files:    16
  Commands:       ~70
  Binary size:    5.1MB
```

```
GW dependencies (36 packages):
  click >= 8.1.0
  rich >= 13.0.0
  tomli >= 2.0.0
  tomli-w >= 1.0.0
  cryptography >= 42.0.0
  mcp >= 1.0.0
  + 30 transitive dependencies

GF dependencies (3 packages):
  spf13/cobra v1.10.2
  spf13/pflag v1.0.9
  golang.org/x/sync v0.19.0
```
