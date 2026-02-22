---
aliases: []
date created: Sunday, February 22nd 2026
date modified: Sunday, February 22nd 2026
tags:
  - tooling
  - python
  - mcp
  - claude-code
type: tech-spec
---

```
            🌲          🌲          🌲
             \    ✨     |     ✨    /
              \    ·     |     ·    /
               \   ·     |     ·   /
                ╰──·─────┼─────·──╯
                   ·     │     ·
         ┌─────────·─────┼─────·─────────┐
         │    ░░░░░·░░░░░│░░░░░·░░░░░    │
         │    ░  root    │  system  ░    │
         │    ░░░░░░░░░░░│░░░░░░░░░░░    │
         └───────────────┼───────────────┘
                         │
                    ─────┴─────
                  ~ ~ ~ ~ ~ ~ ~ ~

         *The roots run deep. The forest drinks.*
```

# GW MCP Server: The Root System

> *The roots run deep. The forest drinks.*

The MCP server is the invisible layer between Claude Code and Grove's infrastructure. It exposes 25+ tools for database queries, git operations, deployments, and more. Unlike the CLI, the MCP server runs as a long-lived process where startup cost is irrelevant. It stays in Python, where the FastMCP framework is mature and the development velocity is highest.

**Public Name:** GW MCP Server
**Internal Name:** grove-mcp-server
**Location:** `tools/gw/src/gw/mcp_server.py` (current), migrates to `tools/grove-mcp-server/`
**Sister Spec:** [GW v2: Grove Wrap in Go](./gw-v2-go-rewrite.md)
**Last Updated:** February 2026

The root system metaphor: trees communicate through underground mycelial networks, sharing nutrients and warnings without anyone seeing. The MCP server does the same. Claude Code sends a request, the roots carry it to the right tool, and the answer surfaces. No one sees the plumbing. Everyone benefits.

---

## Overview

### What This Is

A Python MCP (Model Context Protocol) server that gives Claude Code direct access to Grove's infrastructure. It runs as a long-lived stdio process, started once per session. The server handles all Claude Code tool calls: querying databases, checking git status, creating PRs, running CI, and managing deployments.

### Why Python Stays

The MCP server is a long-running process. It starts once and serves for hours. The 580ms Python import tax is paid once, then amortized across hundreds of tool calls. There is no performance argument for porting this to Go.

Meanwhile, the Python advantages are significant:
- FastMCP framework makes tool definition trivial (decorator-based)
- The existing 1,432-line server works and is well-tested
- Python's MCP SDK is mature. Go's is not.
- Development velocity for adding new tools is highest in Python

### Goals

- Clean extraction from the gw Python package into its own standalone package
- Communication with the Go `gw` binary for actual operations
- All 25+ existing MCP tools preserved
- Agent-safe mode with stricter limits by default
- JSON-only output (no Rich, no terminal formatting)
- Testable in isolation from the CLI

### Non-Goals

- Porting to Go (the sister spec handles the CLI)
- Adding a REST API (MCP stdio is sufficient)
- Supporting multiple simultaneous connections (MCP is 1:1)
- Terminal UI of any kind (this is headless)

---

## Architecture

### Current State

Today, the MCP server lives inside the `gw` Python package at `src/gw/mcp_server.py`. It imports directly from `gw`'s internal modules: `git_wrapper.py`, `gh_wrapper.py`, `wrangler.py`, `config.py`, and `safety/`. This tight coupling means the MCP server cannot exist without the full Python gw installation.

### Target State

```
Claude Code
    │
    │ MCP stdio (JSON-RPC)
    ▼
┌───────────────────────────────────────────────┐
│          grove-mcp-server (Python)            │
│                                               │
│  ┌─────────┐  ┌─────────┐  ┌──────────────┐ │
│  │ FastMCP │  │ Safety  │  │  Config      │ │
│  │ Server  │  │ Engine  │  │  (gw.toml)   │ │
│  └────┬────┘  └────┬────┘  └──────┬───────┘ │
│       │             │              │          │
│       ▼             ▼              ▼          │
│  ┌────────────────────────────────────────┐  │
│  │         Tool Implementations           │  │
│  │  grove_db_*  grove_git_*  grove_gh_*  │  │
│  └─────────────────┬──────────────────────┘  │
│                     │                         │
└─────────────────────┼─────────────────────────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
    ┌─────────┐  ┌─────────┐  ┌──────────┐
    │ gw (Go) │  │   gh    │  │ wrangler │
    │ binary  │  │ (direct)│  │ (direct) │
    └─────────┘  └─────────┘  └──────────┘
```

### Package Structure

```
tools/grove-mcp-server/
├── pyproject.toml               # Standalone package
├── src/grove_mcp/
│   ├── __init__.py
│   ├── server.py                # FastMCP server setup
│   ├── config.py                # Config loader (reads ~/.grove/gw.toml)
│   ├── safety.py                # Safety validation (extracted from gw)
│   ├── tools/
│   │   ├── database.py          # grove_db_* tools
│   │   ├── git.py               # grove_git_* tools
│   │   ├── github.py            # grove_gh_* tools
│   │   ├── dev.py               # grove_dev_* tools
│   │   ├── infra.py             # grove_cache_*, grove_kv_*, grove_r2_*
│   │   └── status.py            # grove_status, grove_health
│   └── exec.py                  # Subprocess helpers (run gw, gh, wrangler)
└── tests/
    ├── test_server.py
    ├── test_safety.py
    └── test_tools.py
```

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Language | Python 3.12+ | Mature MCP SDK, fast development |
| MCP Framework | FastMCP (mcp>=1.0) | Decorator-based tool definition |
| Config | tomli | Read ~/.grove/gw.toml (same file as Go CLI) |
| Subprocess | subprocess.run | Shell out to gw binary, gh, wrangler |
| Testing | pytest | Existing test patterns |

---

## Tool Inventory

All tools return JSON. All tools are audit-logged. Write operations require explicit opt-in.

### Database Tools

| Tool | Type | Description |
|------|------|-------------|
| `grove_db_query` | READ | Execute SELECT queries against D1 |
| `grove_db_tables` | READ | List tables in a database |
| `grove_db_schema` | READ | Get table schema (columns, types, indexes) |
| `grove_tenant_lookup` | READ | Look up tenant by ID, slug, or domain |

### Git Tools

| Tool | Type | Description |
|------|------|-------------|
| `grove_git_status` | READ | Repository status (branch, changes, ahead/behind) |
| `grove_git_log` | READ | Commit history with filtering |
| `grove_git_diff` | READ | Show changes (staged, unstaged, between refs) |
| `grove_git_commit` | WRITE | Create a commit (conventional format enforced) |
| `grove_git_push` | WRITE | Push to remote |

### GitHub Tools

| Tool | Type | Description |
|------|------|-------------|
| `grove_gh_pr_list` | READ | List pull requests with filters |
| `grove_gh_pr_view` | READ | View PR details (diff stats, checks, comments) |
| `grove_gh_pr_create` | WRITE | Create a pull request |
| `grove_gh_issue_list` | READ | List issues with filters |
| `grove_gh_issue_view` | READ | View issue details |
| `grove_gh_run_list` | READ | List workflow runs |

### Infrastructure Tools

| Tool | Type | Description |
|------|------|-------------|
| `grove_status` | READ | Infrastructure status overview |
| `grove_health` | READ | Health check all components |
| `grove_cache_list` | READ | List cache keys |
| `grove_cache_purge` | WRITE | Purge cache entries |
| `grove_kv_get` | READ | Get KV value |
| `grove_r2_list` | READ | List R2 objects |

### Dev Tools

| Tool | Type | Description |
|------|------|-------------|
| `grove_packages_list` | READ | List monorepo packages |
| `grove_dev_status` | READ | Dev server status |
| `grove_test_run` | WRITE | Run tests for a package |
| `grove_build` | WRITE | Build a package |
| `grove_ci` | WRITE | Run full CI pipeline |

---

## Safety in Agent Mode

The MCP server always runs in agent mode. `GW_AGENT_MODE=1` is set automatically at startup. This means:

**Database Safety:**
- SELECT only. No INSERT, UPDATE, DELETE, or DDL through `grove_db_query`
- Row limits: 50 delete, 200 update (if write tools are added later)
- Protected tables: users, tenants, subscriptions, payments, sessions
- SQL injection pattern detection (see validation rules below)

**D1 SQL Validation Rules (for `grove_db_query`):**

The MCP server validates all SQL before passing it to `wrangler d1 execute`. These rules are implemented as pre-compiled regex patterns with early returns:

1. **Statement allowlist:** Only `SELECT` is permitted. The query (after stripping leading whitespace) must begin with `SELECT` (case-insensitive). All other statement types (INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, TRUNCATE, PRAGMA) are rejected.
2. **Semicolon blocking:** Reject any query containing `;` outside of string literals. This prevents stacked queries (`SELECT 1; DROP TABLE users`).
3. **Comment stripping:** Reject queries containing SQL comments (`--`, `/*`, `*/`). These are used in injection attacks to hide malicious payloads.
4. **UNION injection:** Reject queries containing `UNION` (case-insensitive) unless it appears inside a string literal. UNION-based injection is the primary read-path attack vector.
5. **Subquery depth limit:** Reject queries with more than 2 levels of nested parentheses. Prevents resource exhaustion via deeply nested subqueries.
6. **Protected table enforcement:** Even for SELECT, certain tables are blocked from direct query: `sessions`, `auth_tokens`. These contain sensitive authentication data.
7. **Result row limit:** Append `LIMIT 1000` if the query does not already contain a LIMIT clause. Prevents accidental full-table scans on large tables.

**Git Safety:**
- READ tools work without flags
- WRITE tools (`grove_git_commit`, `grove_git_push`) require the tool call to include a confirmation parameter
- DANGEROUS operations (reset, rebase, force-push) are completely blocked
- PROTECTED operations (force-push to main/master) are never exposed as tools

**GitHub Safety:**
- Rate limit checking before every API call
- Warning at 100 remaining, blocking at 10 remaining
- PR merge is not exposed as an MCP tool (too dangerous for agent use)

**General:**
- All tool calls are audit-logged with timestamp, tool name, parameters, and result
- No secrets are ever returned in tool responses
- File system access is limited to the repository root

---

## Communication with Go Binary

### Strategy: Subprocess with JSON

The MCP server calls the Go `gw` binary as a subprocess with `--json` output:

```python
import subprocess, json

def run_gw(*args, timeout: int = 30) -> dict:
    try:
        result = subprocess.run(
            ["gw", "--json", "--agent", *args],
            capture_output=True, text=True, timeout=timeout
        )
        if result.returncode != 0:
            return {"error": result.stderr.strip()}
        return json.loads(result.stdout)
    except subprocess.TimeoutExpired:
        return {"error": f"gw timed out after {timeout}s"}
    except json.JSONDecodeError as e:
        return {"error": f"gw returned non-JSON output: {e}"}
```

The `--json` flag guarantees structured output from the Go binary, but the error handling is defensive: timeouts prevent hangs on long-running operations, and JSONDecodeError catches edge cases where warnings or banners leak into stdout.

This is clean for several reasons:

1. **No shared state.** Each tool call is a fresh subprocess. No connection pooling, no stale caches.
2. **Safety enforcement in Go.** The Go binary enforces safety tiers. The MCP server does not need to re-implement them.
3. **Go binary startup is fast.** At <50ms, subprocess overhead is negligible compared to the actual operation (git, wrangler, gh calls).
4. **Testable independently.** Mock `subprocess.run` in tests.
5. **Timeout protection.** Default 30s prevents indefinite hangs on network operations.

### When to Call Go Binary vs Direct

Some operations skip the Go binary and call tools directly:

| Operation | Via Go `gw` | Direct Call | Why |
|-----------|-------------|-------------|-----|
| Git operations | ✓ | | Safety tier enforcement |
| GitHub operations | ✓ | | Rate limit tracking |
| D1 queries | | `wrangler d1 execute` | MCP server applies its own SQL validation rules (see Safety section) |
| KV/R2/Cache | | `wrangler kv:*` | Simple pass-through, no safety logic needed |
| Status/Health | ✓ | | Aggregation logic lives in Go binary |
| Dev tools | ✓ | | Package detection + runner logic |

The decision rule: if the operation has safety implications or aggregation logic, route through Go `gw`. If it is a simple wrangler pass-through, call wrangler directly.

### Claude Code Configuration

```json
{
  "mcpServers": {
    "grove": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/tools/grove-mcp-server", "grove-mcp-serve"]
    }
  }
}
```

Or, if the Go binary provides the launch command:

```json
{
  "mcpServers": {
    "grove": {
      "command": "gw",
      "args": ["mcp", "serve"]
    }
  }
}
```

The second form is preferred. `gw mcp serve` launches the Python MCP server as a subprocess, keeping the user-facing interface unified.

---

## Implementation Plan

### Phase 1: Extract from gw Python package

- [ ] Create `tools/grove-mcp-server/` with its own `pyproject.toml`
- [ ] Move `mcp_server.py` → `src/grove_mcp/server.py`
- [ ] Extract safety validation into `src/grove_mcp/safety.py`
- [ ] Extract config loading into `src/grove_mcp/config.py`
- [ ] Split monolithic server into tool modules (`tools/database.py`, `tools/git.py`, etc.)
- [ ] Move tests into `tests/`
- [ ] Verify all 25+ tools work in the new package

### Phase 2: Wire to Go binary

- [ ] Replace direct `git_wrapper` imports with `subprocess.run(["gw", "--json", ...])`
- [ ] Replace direct `gh_wrapper` imports with Go binary calls
- [ ] Keep direct wrangler calls for simple pass-through operations
- [ ] Test the full tool chain: Claude Code → MCP → Go gw → external tool

### Phase 3: Cleanup

- [ ] Remove `mcp_server.py` from the Python gw package
- [ ] Remove MCP-related dependencies from Python gw (the `mcp` package)
- [ ] Update Claude Code config in AGENT.md
- [ ] Update `gw mcp serve` in Go to launch the new standalone server
- [ ] Verify `gw mcp tools` and `gw mcp config` output is correct

---

## Related Documents

- [GW v2: Grove Wrap in Go](./gw-v2-go-rewrite.md)
- [GW Performance Analysis](./gw-performance-analysis.md)

---

*Invisible, underground, always feeding. The roots know every tree.*
