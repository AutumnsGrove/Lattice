# Grove Wrap (gw)

```
╭──────────────────────────────────────────────────────────────╮
│              🌿  G R O V E   W R A P  🌿                     │
│                                                              │
│      ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐            │
│      │ D1  │  │ KV  │  │ R2  │  │ Git │  │ GH  │            │
│      └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘            │
│         └────────┴───┬────┴────────┴────────┘               │
│                      │                                       │
│                 ╭────┴────╮                                  │
│                 │   gw    │                                  │
│                 ╰────┬────╯                                  │
│                      │                                       │
│         ┌────────────┼────────────┐                         │
│         ▼            ▼            ▼                         │
│      Human        Agent        CI/CD                        │
│      (safe)      (safer)      (safest)                      │
╰──────────────────────────────────────────────────────────────╯
```

> *One CLI to tend them all — Wrangler, git, and gh wrapped with agent-safe defaults.*

---

## 🚀 Quick Start (I Just Want to Deploy!)

```bash
# Install
cd tools/gw && uv sync

# Check everything is working
uv run gw health

# Run tests before deploying
uv run gw test --all

# Type check everything
uv run gw check --all

# Deploy!
uv run gw deploy --write
```

**Tired? Just want to commit and push?**

```bash
uv run gw git fast --write -m "fix: finally done"
```

---

## 📦 Installation

```bash
cd tools/gw
uv sync
```

The `gw` command is now available:

```bash
uv run gw --help
```

**Pro tip:** Add an alias to your shell:
```bash
alias gw="uv run --project ~/path/to/tools/gw gw"
```

---

## 🎯 Command Overview

| Command | What it does | Safe? |
|---------|--------------|-------|
| `gw status` | Show config and account info | ✅ Always |
| `gw health` | Health check all components | ✅ Always |
| `gw test` | Run tests | ✅ Always |
| `gw build` | Build packages | ✅ Always |
| `gw check` | Type check | ✅ Always |
| `gw lint` | Lint code | ✅ Always |
| `gw ci` | Run full CI pipeline | ✅ Always |
| `gw deploy --write` | Deploy to Cloudflare | ⚠️ Needs `--write` |
| `gw git commit --write` | Commit changes | ⚠️ Needs `--write` |
| `gw git push --write` | Push to remote | ⚠️ Needs `--write` |
| `gw d1 query --write` | Write to database | ⚠️ Needs `--write` |
| `gw git push --write --force` | Force push | 🔴 Needs `--write --force` |

---

## 🛠️ Dev Tools

### Running Tests

```bash
# Test current package (auto-detected from cwd)
gw test

# Test all packages
gw test --all

# Watch mode (re-run on changes)
gw test --watch

# With coverage
gw test --coverage

# Filter by test name
gw test -k "auth"

# See what would run without running it
gw test --dry-run
```

### Building

```bash
# Build current package
gw build

# Build all packages
gw build --all

# Production build
gw build --prod

# Clean build
gw build --clean

# Preview the command
gw build --dry-run
```

### Type Checking

```bash
# Check current package
gw check

# Check all packages
gw check --all

# Watch mode
gw check --watch

# Strict mode (fail on warnings)
gw check --strict
```

### Linting

```bash
# Lint current package
gw lint

# Lint all packages
gw lint --all

# Auto-fix issues
gw lint --fix
```

### Full CI Pipeline

```bash
# Run everything: lint → check → test → build
gw ci

# Stop on first failure
gw ci --fail-fast

# Skip specific steps
gw ci --skip-lint --skip-build

# Preview all steps
gw ci --dry-run
```

### Dev Server

```bash
# Start dev server for current package
gw dev start

# Start in background
gw dev start -b

# Stop background server
gw dev stop

# Restart
gw dev restart

# View logs
gw dev logs
gw dev logs -f  # follow
```

### Package Discovery

```bash
# List all packages in monorepo
gw packages list

# Filter by type
gw packages list --type sveltekit
gw packages list --type python

# Info about current package
gw packages current

# Info about specific package
gw packages info engine
```

---

## 🌿 Git Commands

All git commands have safety guards. Write operations need `--write`. Dangerous operations need `--write --force`.

### Reading (Always Safe)

```bash
gw git status              # Enhanced git status
gw git log                 # Formatted commit history
gw git log --limit 20      # Last 20 commits
gw git diff                # Show changes
gw git diff --staged       # Show staged changes
gw git blame file.ts       # Blame with context
gw git show abc123         # Show commit details
```

### Writing (Needs `--write`)

```bash
gw git add --write .                    # Stage files
gw git commit --write -m "feat: thing"  # Commit (validates conventional commits!)
gw git push --write                     # Push to remote
gw git branch --write feature/new       # Create branch
gw git stash --write                    # Stash changes
gw git stash --write pop                # Pop stash
```

### Grove Shortcuts

```bash
# Quick save: stage all + WIP commit
gw git save --write

# Quick sync: fetch + rebase + push
gw git sync --write

# WIP commit that skips hooks
gw git wip --write

# Undo last commit (keeps changes)
gw git undo --write

# Amend last commit message
gw git amend --write -m "better message"

# FAST MODE: skip ALL hooks, just commit and push
gw git fast --write -m "fix: emergency hotfix"
```

### Dangerous Operations (Needs `--write --force`)

```bash
# Force push (blocked to protected branches!)
gw git push --write --force

# Hard reset
gw git reset --write --force HEAD~1

# Interactive rebase
gw git rebase --write --force main
```

**Protected branches:** `main`, `master`, `production`, `staging` cannot be force-pushed, even with `--force`.

---

## 🐙 GitHub Commands

Interact with GitHub without leaving the terminal. Read operations are always safe.

### Pull Requests

```bash
# List open PRs
gw gh pr list

# View PR details
gw gh pr view 123

# Check PR status (CI, reviews, etc.)
gw gh pr status

# Create PR (needs --write)
gw gh pr create --write --title "feat: new thing" --body "Description"

# Add comment (needs --write)
gw gh pr comment --write 123 "LGTM!"

# Merge PR (needs --write, will prompt for confirmation)
gw gh pr merge --write 123
```

### Issues

```bash
# List open issues
gw gh issue list

# View issue
gw gh issue view 456

# Create issue (needs --write)
gw gh issue create --write --title "Bug: thing broke"

# Close issue (needs --write)
gw gh issue close --write 456
```

### Workflow Runs (CI)

```bash
# List recent runs
gw gh run list

# View run details
gw gh run view 12345678

# Watch a running workflow
gw gh run watch 12345678

# Rerun failed jobs (needs --write)
gw gh run rerun --write 12345678 --failed

# Cancel a run (needs --write)
gw gh run cancel --write 12345678
```

### Raw API Access

```bash
# GET requests (always safe)
gw gh api repos/AutumnsGrove/GroveEngine

# POST/PATCH (needs --write)
gw gh api --write repos/{owner}/{repo}/labels -X POST -f name="bug"

# DELETE (needs --write --force)
gw gh api --write --force repos/{owner}/{repo}/labels/old -X DELETE
```

### Rate Limits

```bash
# Check your rate limit status
gw gh rate-limit
```

---

## ☁️ Cloudflare Commands

### Databases (D1)

```bash
gw d1 list                              # List all databases
gw d1 tables                            # List tables
gw d1 tables --db groveauth             # Specific database
gw d1 schema tenants                    # Show table schema
gw d1 query "SELECT * FROM tenants"     # Read-only query
gw d1 query "UPDATE..." --write         # Write query
```

### KV Storage

```bash
gw kv list                              # List namespaces
gw kv keys cache                        # List keys in namespace
gw kv get cache session:123             # Get a value
gw kv put --write cache key "value"     # Set a value
gw kv delete --write cache old-key      # Delete a key
```

### R2 Object Storage

```bash
gw r2 list                              # List buckets
gw r2 ls grove-media                    # List objects
gw r2 get grove-media path/to/file      # Download
gw r2 put --write grove-media ./file    # Upload
gw r2 rm --write --force grove-media x  # Delete
```

### Feature Flags

```bash
gw flag list                            # List all flags
gw flag get dark_mode                   # Get flag value
gw flag enable --write dark_mode        # Enable flag
gw flag disable --write dark_mode       # Disable flag
gw flag delete --write --force old_flag # Delete flag
```

### Backups

```bash
gw backup list                          # List backups
gw backup create --write                # Create backup
gw backup download abc123               # Download backup
gw backup restore --write --force abc   # Restore (destructive!)
```

### Logs

```bash
gw logs                                 # Stream worker logs
gw logs --status error                  # Only errors
gw logs --method POST                   # Only POST requests
gw logs --search "tenant"               # Search in logs
```

### Deploy

```bash
gw deploy --dry-run                     # Preview deployment
gw deploy --write                       # Deploy!
gw deploy --write --env staging         # Deploy to staging
```

### Durable Objects

```bash
gw do list                              # List DO namespaces
gw do info TENANT_SESSIONS              # Show namespace info
```

### Email

```bash
gw email status                         # Check email routing
gw email rules                          # List routing rules
```

---

## 🔐 Secrets Management

Secrets are stored in an encrypted vault. Only humans can set secrets; agents can only apply them.

```bash
# Initialize vault (creates ~/.grove/secrets.enc)
gw secret init

# Store a secret (prompts for value - never in CLI history!)
gw secret set STRIPE_KEY

# List secret names (never shows values)
gw secret list

# Check if secret exists
gw secret exists STRIPE_KEY

# Apply to a worker (agent-safe!)
gw secret apply STRIPE_KEY -w grove-lattice

# Sync all secrets to a worker
gw secret sync -w grove-lattice

# Delete a secret
gw secret delete OLD_KEY
```

---

## 🔐 OAuth Client Management

Manage OAuth clients for Heartwood (GroveAuth):

```bash
# List clients
gw auth client list

# View client details
gw auth client info abc123

# Create new client
gw auth client create --write --name "My App" --redirect-uri "http://localhost:3000/callback"

# Rotate client secret
gw auth client rotate --write abc123

# Delete client
gw auth client delete --write --force abc123
```

---

## 🏷️ Global Flags

| Flag | Description |
|------|-------------|
| `--json` | Output machine-readable JSON |
| `--verbose` | Enable debug output |
| `--help` | Show help message |

**Important:** Global flags come BEFORE the command:

```bash
gw --json status    # ✓ Correct
gw status --json    # ✗ Wrong
```

---

## 🛡️ Safety System

### The `--write` Flag

By default, gw runs in read-only mode. To modify anything, you need `--write`:

```bash
gw git push                # ✗ Blocked
gw git push --write        # ✓ Allowed
```

### The `--force` Flag

Destructive operations need both `--write` and `--force`:

```bash
gw git push --force              # ✗ Blocked (no --write)
gw git push --write --force      # ✓ Allowed (but not to protected branches!)
```

### The `--dry-run` Flag

Preview what would happen without doing it:

```bash
gw test --dry-run
# DRY RUN - Would execute:
#   Package: @autumnsgrove/groveengine
#   Directory: /path/to/packages/engine
#   Command: pnpm run test:run
```

### Protected Branches

These branches can NEVER be force-pushed:
- `main`
- `master`
- `production`
- `staging`

### Agent Mode

When running with `GW_AGENT_MODE=1` or detected as Claude Code:
- Stricter row limits (50 delete, 200 update)
- Force operations are completely blocked
- All operations are audit-logged

### SQL Safety

The database safety layer blocks:
- **DDL** — CREATE, DROP, ALTER, TRUNCATE
- **SQL injection patterns** — Stacked queries, comments
- **Missing WHERE** — DELETE/UPDATE without WHERE
- **Protected tables** — users, tenants, subscriptions, payments, sessions
- **Row limits** — DELETE capped at 100, UPDATE at 500

---

## ⚙️ Configuration

Configuration lives at `~/.grove/gw.toml`:

```toml
[databases.lattice]
name = "grove-engine-db"
id = "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68"

[databases.groveauth]
name = "groveauth"
id = "45eae4c7-8ae7-4078-9218-8e1677a4360f"

[kv_namespaces.cache]
name = "CACHE_KV"
id = "514e91e81cc44d128a82ec6f668303e4"

[kv_namespaces.flags]
name = "FLAGS_KV"
id = "65a600876aa14e9cbec8f8acd7d53b5f"

[[r2_buckets]]
name = "grove-media"

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
repo = "GroveEngine"
rate_limit_warn_threshold = 100
```

---

## 🧪 Development

### Running Tests

```bash
uv sync --extra dev
uv run pytest tests/ -v
```

### Updating the Global Tool

When developing gw locally, `uv run gw` uses the local source. But the global `gw` command (installed via `uv tool install`) is a separate copy that won't see your changes!

**After adding new commands or making changes:**

```bash
# Reinstall the global tool from local source
uv tool install /path/to/tools/gw --force

# Verify your changes are there
gw --help
```

**Why this happens:** UV tools are installed to `~/.local/bin/` as standalone executables. Running `uv run gw` from the project uses the local `src/` directly, but `gw` alone uses the installed copy.

### Project Structure

```
tools/gw/
├── pyproject.toml
├── README.md                    # You are here!
├── src/gw/
│   ├── cli.py                   # Main CLI entry point
│   ├── config.py                # Configuration loading
│   ├── wrangler.py              # Wrangler subprocess wrapper
│   ├── git_wrapper.py           # Git subprocess wrapper
│   ├── gh_wrapper.py            # GitHub CLI wrapper
│   ├── packages.py              # Monorepo package detection
│   ├── secrets_vault.py         # Encrypted vault
│   ├── mcp_server.py            # MCP server for Claude Code
│   ├── ui.py                    # Rich terminal helpers
│   ├── safety/
│   │   ├── database.py          # SQL safety validation
│   │   ├── git.py               # Git safety tiers
│   │   └── github.py            # GitHub safety + rate limits
│   ├── completions/             # Shell completions
│   │   ├── bash.py
│   │   ├── zsh.py
│   │   └── fish.py
│   └── commands/
│       ├── status.py            # gw status
│       ├── health.py            # gw health
│       ├── auth.py              # gw auth (+ client management)
│       ├── bindings.py          # gw bindings
│       ├── db.py                # gw d1
│       ├── tenant.py            # gw tenant
│       ├── secret.py            # gw secret
│       ├── cache.py             # gw cache
│       ├── kv.py                # gw kv
│       ├── r2.py                # gw r2
│       ├── flag.py              # gw flag
│       ├── backup.py            # gw backup
│       ├── logs.py              # gw logs
│       ├── deploy.py            # gw deploy
│       ├── do.py                # gw do
│       ├── email.py             # gw email
│       ├── packages.py          # gw packages
│       ├── mcp.py               # gw mcp
│       ├── doctor.py            # gw doctor
│       ├── whoami.py            # gw whoami
│       ├── history.py           # gw history
│       ├── completion.py        # gw completion
│       ├── git/                 # gw git *
│       │   ├── read.py
│       │   ├── write.py
│       │   ├── danger.py
│       │   └── shortcuts.py
│       ├── gh/                  # gw gh *
│       │   ├── pr.py
│       │   ├── issue.py
│       │   ├── run.py
│       │   ├── project.py
│       │   └── api.py
│       └── dev/                 # gw dev * / gw test / gw build / etc.
│           ├── server.py
│           ├── test.py
│           ├── build.py
│           ├── check.py
│           ├── lint.py
│           └── ci.py
└── tests/
    ├── test_safety.py           # Database safety tests
    ├── test_git.py              # Git safety tests
    ├── test_gh.py               # GitHub safety tests
    ├── test_mcp.py              # MCP server tests
    └── test_packages.py         # Package detection tests
```

---

## 🤖 MCP Server (Claude Code Integration)

Grove Wrap can run as an MCP server, exposing all commands as tools that Claude Code can call directly.

### Setup

Add to your Claude Code settings:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "grove-wrap": {
      "command": "gw",
      "args": ["mcp", "serve"]
    }
  }
}
```

Or generate the config automatically:
```bash
gw mcp config
```

### Available MCP Tools

| Tool | Category | Safety | Description |
|------|----------|--------|-------------|
| `grove_db_query` | Database | READ | Execute read-only SQL query |
| `grove_db_tables` | Database | READ | List tables in database |
| `grove_db_schema` | Database | READ | Get table schema |
| `grove_tenant_lookup` | Database | READ | Look up tenant info |
| `grove_cache_list` | Cache | READ | List cache keys |
| `grove_cache_purge` | Cache | WRITE | Purge cache keys |
| `grove_kv_get` | KV | READ | Get KV value |
| `grove_r2_list` | R2 | READ | List R2 objects |
| `grove_status` | Status | READ | Infrastructure status |
| `grove_health` | Status | READ | Health check |
| `grove_git_status` | Git | READ | Repository status |
| `grove_git_log` | Git | READ | Commit history |
| `grove_git_diff` | Git | READ | Show changes |
| `grove_git_commit` | Git | WRITE | Create commit |
| `grove_git_push` | Git | WRITE | Push to remote |
| `grove_gh_pr_list` | GitHub | READ | List pull requests |
| `grove_gh_pr_view` | GitHub | READ | View PR details |
| `grove_gh_issue_list` | GitHub | READ | List issues |
| `grove_gh_issue_view` | GitHub | READ | View issue details |
| `grove_gh_run_list` | GitHub | READ | List workflow runs |
| `grove_gh_pr_create` | GitHub | WRITE | Create pull request |
| `grove_packages_list` | Dev | READ | List monorepo packages |
| `grove_dev_status` | Dev | READ | Dev server status |
| `grove_test_run` | Dev | WRITE | Run package tests |
| `grove_build` | Dev | WRITE | Build package |
| `grove_ci` | Dev | WRITE | Run CI pipeline |

### MCP Commands

```bash
# Start MCP server (runs in stdio mode for Claude Code)
gw mcp serve

# List available tools
gw mcp tools

# Show setup configuration
gw mcp config
```

### Safety in MCP Mode

When running as an MCP server:
- **Agent mode** is automatically enabled (`GW_AGENT_MODE=1`)
- **Write operations** (INSERT, UPDATE, DELETE) are blocked in SQL queries
- **Force operations** (force-push, hard reset) are completely blocked
- **Protected branches** cannot be modified
- All tools return JSON for easy parsing

---

## 🩺 Quality of Life Commands

### Doctor

Diagnose common setup issues:

```bash
gw doctor
```

Checks: Wrangler installation, authentication, git config, GitHub CLI, Node.js, Python/uv, config file, secrets vault, and more.

### Whoami

Show current identity context:

```bash
gw whoami
```

Shows: Cloudflare account, GitHub user, project info, vault status.

### History

View command history:

```bash
# Recent commands
gw history list

# Search history
gw history search "deploy"

# Show specific command
gw history show 42

# Re-run a command
gw history run 42

# Clear history
gw history clear --write
```

### Shell Completions

Enable tab completion:

```bash
# Bash
gw completion bash >> ~/.bashrc

# Zsh
gw completion zsh >> ~/.zshrc

# Fish
gw completion fish > ~/.config/fish/completions/gw.fish
```

---

## ✅ Roadmap

### Complete ✅

- [x] **Phase 1** — Foundation (`status`, `health`, `auth`, `bindings`)
- [x] **Phase 2** — Database & Tenant (`db`, `tenant`)
- [x] **Phase 3** — Secrets & Cache (`secret`, `cache`)
- [x] **Phase 4-6** — Cloudflare (`kv`, `r2`, `logs`, `deploy`, `do`, `flag`, `backup`, `email`)
- [x] **Phase 7** — MCP Server (`gw mcp serve` for Claude Code)
- [x] **Phase 7.5** — Quality of Life (`doctor`, `whoami`, `history`, `completion`)
- [x] **Phase 9-11** — Git Integration (`git status/commit/push/...`, shortcuts)
- [x] **Phase 12-14** — GitHub Integration (`gh pr/issue/run/api`)
- [x] **Phase 15-18** — Dev Tools (`dev`, `test`, `build`, `check`, `lint`, `ci`, `packages`)

### 🎉 All Phases Complete!

---

## 📚 Related

- **Spec:** `docs/specs/gw-cli-spec.md`
- **Issue:** [#348](https://github.com/AutumnsGrove/GroveEngine/issues/348)

---

## 🆘 Common Issues

### "No package found"

You're not in a package directory. Either:
- `cd` into a package (e.g., `cd packages/engine`)
- Use `--package engine` to specify

### "groveauth database not configured"

Add it to `~/.grove/gw.toml`:
```toml
[databases.groveauth]
name = "groveauth"
id = "your-database-id"
```

### "Rate limit exhausted"

GitHub has rate limits. Check with:
```bash
gw gh rate-limit
```

Wait for reset or authenticate with a token.

### "Protected branch"

You tried to force-push to `main`. Don't do that. Create a PR instead:
```bash
gw gh pr create --write --title "My changes"
```

---

*The best CLI is the one you don't have to think about. Just type `gw` and go.* 🌿
