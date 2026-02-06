# grove-find: Shell to Python CLI Conversion

## Summary

Convert `scripts/repo/grove-find.sh` (2300+ lines, 50+ commands) to a Python CLI that installs via UV. This eliminates the awkward `source` command that agents struggle with.

**Before:** `GF_AGENT=1 source scripts/repo/grove-find.sh && gf "pattern"`
**After:** `gf "pattern"` or `gf search "pattern" --agent`

---

## Architecture

### Package Structure

```
tools/grove-find/
├── pyproject.toml
├── src/grove_find/
│   ├── __init__.py
│   ├── __main__.py           # python -m grove_find
│   ├── cli.py                # Typer app entry point
│   ├── commands/
│   │   ├── search.py         # gf, class, func, usage, imports
│   │   ├── files.py          # svelte, ts, js, css, md, json, etc.
│   │   ├── git.py            # recent, changed, blame, history, etc.
│   │   ├── github.py         # issue, issues, board, mine, stale
│   │   ├── cloudflare.py     # cf d1, cf kv, cf r2, cf do
│   │   ├── quality.py        # type, export, auth, engine
│   │   └── project.py        # briefing, stats, gitstats
│   ├── core/
│   │   ├── config.py         # GROVE_ROOT detection, tool paths
│   │   ├── tools.py          # rg, fd, git, gh discovery
│   │   ├── patterns.py       # Regex pattern builders
│   │   └── git_ops.py        # Git command wrappers
│   ├── output/
│   │   ├── console.py        # Rich console with agent mode
│   │   ├── tables.py         # Table formatting
│   │   └── panels.py         # Panel/header formatting
│   └── utils/
│       ├── paths.py          # Path utilities
│       └── exceptions.py     # Custom errors
└── tests/
    ├── conftest.py           # Fixtures, mocks
    ├── unit/                 # Pure function tests
    ├── integration/          # Command tests with fixtures
    └── smoke/                # All commands run without crash
```

### CLI Framework: Typer + Rich

- **Typer**: Type hints for validation, automatic help, Rich integration
- **Rich**: Beautiful human output, cleanly disabled for agent mode

### Command Structure: Subcommands Only (Clean)

**Decision:** No short aliases like `gfc`. All commands use subcommand syntax for discoverability.

```bash
# Core search
gf "pattern"                    # Default = search
gf class GlassCard             # Find component
gf func handleSubmit           # Find function
gf usage Button                # Find where used
gf imports lodash              # Find imports

# File types
gf svelte                      # List Svelte files
gf ts                          # TypeScript files

# Git operations
gf recent                      # Recently modified
gf changed                     # Changed on branch
gf git blame src/file.ts       # Nested git commands
gf git pickaxe "string"

# GitHub (nested)
gf github issue 42
gf github board

# Cloudflare (nested)
gf cf d1 users
```

### Root Detection: Auto-detect from CWD

Walk up from current directory looking for:
1. `AGENT.md` file (Grove project marker)
2. `.git` directory (fallback)
3. Error if neither found

---

## Output Modes

### Human Mode (default)
Rich panels, colors, emoji, tables with borders

### Agent Mode (`--agent` or `GF_AGENT=1`)
No colors, no emoji, no box-drawing, `===` headers

### JSON Mode (`--json`)
Structured output for scripting

---

## Configuration Precedence

1. CLI flags (`--root`, `--agent`)
2. Environment variables (`GROVE_ROOT`, `GF_AGENT`)
3. Config file (`.grove-find.toml`)
4. Auto-detection (walk up from CWD)

---

## External Dependencies

| Tool | Required | Install |
|------|----------|---------|
| ripgrep (rg) | Yes | `brew install ripgrep` |
| fd | Yes | `brew install fd` |
| git | Yes | (usually installed) |
| gh | Optional | `brew install gh` |

Graceful errors when missing, with install instructions.

---

## Command Mapping (50+ commands)

### Core Search
| Shell | Python | Description |
|-------|--------|-------------|
| `gf` | `gf` or `gf search` | General search |
| `gfc` | `gf class` | Class/component |
| `gff` | `gf func` | Function |
| `gfi` | `gf imports` | Imports |
| `gfused` | `gf usage` | Find usage |

### File Types
| Shell | Python |
|-------|--------|
| `gfs` | `gf svelte` |
| `gft` | `gf ts` |
| `gfj` | `gf js` |
| `gfcss` | `gf css` |
| `gfmd` | `gf md` |
| `gfjson` | `gf json` |
| `gftoml` | `gf toml` |
| `gfyaml` | `gf yaml` |
| `gfh` | `gf html` |
| `gfsh` | `gf shell` |

### Git Operations
| Shell | Python |
|-------|--------|
| `gfrecent` | `gf recent` |
| `gfchanged` | `gf changed` |
| `gfblame` | `gf git blame` |
| `gfhistory` | `gf git history` |
| `gfpickaxe` | `gf git pickaxe` |
| `gfcommits` | `gf git commits` |
| `gfchurn` | `gf git churn` |
| `gfbranches` | `gf git branches` |
| `gfpr` | `gf git pr` |
| `gfwip` | `gf git wip` |
| `gfstash` | `gf git stash` |
| `gfreflog` | `gf git reflog` |
| `gftag` | `gf git tag` |

### GitHub Issues
| Shell | Python |
|-------|--------|
| `gfissue` | `gf github issue` |
| `gfissues` | `gf github issues` |
| `gfissueboard` | `gf github board` |
| `gfissuemine` | `gf github mine` |
| `gfissuestale` | `gf github stale` |
| `gfissuerefs` | `gf github refs` |
| `gfissuelink` | `gf github link` |

### Cloudflare
| Shell | Python |
|-------|--------|
| `gfbind` | `gf cf` |
| `gfd1` | `gf cf d1` |
| `gfkv` | `gf cf kv` |
| `gfr2` | `gf cf r2` |
| `gfdo` | `gf cf do` |

### Project Health
| Shell | Python |
|-------|--------|
| `gfgitstats` | `gf stats` |
| `gfbriefing` | `gf briefing` |
| `gftodo` | `gf todo` |
| `gflog` | `gf log` |
| `gfenv` | `gf env` |

---

## Testing Strategy (Beaver)

### Test Distribution (Testing Trophy)
- **Unit Tests** (~25): Pure functions, patterns, formatters
- **Integration Tests** (~40): Commands with temp repos
- **Smoke Tests** (~30): Every command runs without crash

### Key Test Files
```
tests/
├── conftest.py              # sample_codebase, mock_rg, mock_fd, mock_git
├── unit/
│   ├── test_patterns.py     # Regex pattern builders
│   ├── test_output.py       # Human/agent/JSON formatting
│   └── test_tools.py        # Tool discovery
├── integration/
│   ├── test_search.py       # Core search commands
│   ├── test_git.py          # Git commands
│   └── test_output_modes.py # --agent, --json flags
└── smoke/
    └── test_all_commands.py # Parametrized: every command runs
```

### Mocking Strategy
- Mock `subprocess.run` for rg, fd, git, gh
- Use real filesystem fixtures for integration tests
- Test graceful degradation when tools missing

---

## Implementation Phases

### Phase 1: MVP Core Search (Week 1)
1. Project scaffolding with UV
2. Config system (GROVE_ROOT, tool detection)
3. Output abstraction (Rich + agent mode)
4. Core commands: `gf`, `class`, `func`, `usage`, `imports`
5. Unit + smoke tests

### Phase 2: File Types + Workflow (Week 2)
6. File type commands: `svelte`, `ts`, `js`, etc.
7. Workflow commands: `todo`, `log`, `env`
8. Domain commands: `routes`, `db`, `glass`, `test`, `config`

### Phase 3: Git Integration (Week 3)
9. Basic git: `recent`, `changed`, `commits`, `branches`
10. Advanced git: `blame`, `history`, `pickaxe`, `churn`
11. PR helpers: `pr`, `wip`, `stash`, `reflog`

### Phase 4: GitHub + Metrics (Week 4)
12. GitHub issues (graceful gh absence)
13. Metrics: `stats`, code counting
14. Project health: `briefing`, `gitstats`

### Phase 5: Polish + Migration (Week 5)
15. Cloudflare commands
16. Full test coverage
17. Shell wrapper for gradual migration
18. Update AGENT.md instructions

---

## Migration Path

### Parallel Existence
Both work simultaneously:
```bash
source scripts/repo/grove-find.sh && gf "pattern"  # Old
gf "pattern"                                        # New
```

### Gradual Transition
1. Install Python CLI alongside shell script
2. Add `GF_USE_PYTHON=1` to switch shell to Python backend
3. Flip default to Python
4. Deprecate shell with warning
5. Archive shell script

---

## pyproject.toml

```toml
[project]
name = "grove-find"
version = "1.0.0"
description = "Blazing fast codebase search for the Grove ecosystem"
requires-python = ">=3.11"
dependencies = [
    "typer>=0.9.0",
    "rich>=13.0.0",
]

[project.scripts]
gf = "grove_find.cli:app"
grove-find = "grove_find.cli:app"

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-cov>=4.1.0",
    "pytest-mock>=3.12.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

---

## Critical Files

| File | Purpose |
|------|---------|
| `scripts/repo/grove-find.sh` | Source of all command logic to port |
| `.claude/skills/rich-terminal-output/SKILL.md` | Rich output patterns |
| `.claude/skills/uv-package-manager/SKILL.md` | UV conventions |
| `tools/gw/` | Example Python CLI in this project |

---

## Verification

After implementation:
1. Run `uv pip install -e tools/grove-find`
2. Test `gf --help` shows all commands
3. Test `gf "TODO"` finds TODOs in codebase
4. Test `gf --agent "TODO"` has no colors/emoji
5. Run `uv run pytest` - all tests pass
6. Update AGENT.md to remove `source` instructions
