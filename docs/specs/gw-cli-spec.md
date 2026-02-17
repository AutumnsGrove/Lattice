---
aliases: []
date created: Sunday, February 2nd 2026
date modified: Monday, February 17th 2026
lastUpdated: 2026-02-17
tags:
  - lattice
  - cloudflare
  - tooling
  - agent-integration
type: tech-spec
---

```
                    ╭──────────────────────────────────╮
                    │     🌿  G R O V E W R A P  🌿    │
                    │                                  │
                    │   ┌────┐  ┌────┐  ┌────┐        │
                    │   │ D1 │──│ KV │──│ R2 │        │
                    │   └──┬─┘  └──┬─┘  └──┬─┘        │
                    │      │       │       │          │
                    │      └───────┼───────┘          │
                    │              │                  │
                    │         ╭────┴────╮             │
                    │         │   gw    │             │
                    │         ╰────┬────╯             │
                    │              │                  │
                    │    ┌─────────┴─────────┐        │
                    │    ▼                   ▼        │
                    │  Human              Agent       │
                    │  (safe)            (safer)      │
                    │                                  │
                    ╰──────────────────────────────────╯

             The trellis that holds the wild growth in check.
```

> _A friendly fence around Wrangler's garden. Safe enough for agents, fast enough for humans._

**Public Name:** Grove Wrap (gw)
**Internal Name:** GroveWrap
**Package:** `tools/gw/` (Python + UV)
**Source:** ~28,000 lines across ~70 Python modules
**Commands:** ~40 top-level, ~150+ leaf commands
**Last Updated:** February 2026

Grove Wrap (`gw`) is the infrastructure CLI for the Grove monorepo. It wraps Wrangler, git, gh, and dev tooling behind a unified interface with:

- **Safety guards** — Read-only by default, `--write` for mutations, `--force` for destruction
- **Grove awareness** — Knows database IDs, package paths, project board fields, tenant subdomains
- **Agent integration** — MCP server mode, `--json` output, `gw context` for session bootstrapping
- **Monorepo intelligence** — Auto-detects current package, runs CI for affected packages only
- **Beautiful output** — Rich terminal UI for humans, structured JSON for machines

---

## Quick Reference

Every command at a glance. Safety tier indicates what flags are needed.

### Cloudflare

| Command     | Subcommands                            | Safety                                       | Description                     |
| ----------- | -------------------------------------- | -------------------------------------------- | ------------------------------- |
| `gw d1`     | list, tables, schema, query, migrate   | READ; query --write for mutations            | D1 database operations          |
| `gw kv`     | list, keys, get, put, delete           | READ; put/delete --write                     | KV namespace operations         |
| `gw r2`     | list, ls, get, put, create, rm         | READ; put/create --write, rm --write --force | R2 object storage               |
| `gw logs`   | _(direct)_                             | READ                                         | Stream real-time Worker logs    |
| `gw deploy` | _(direct)_                             | WRITE (--write)                              | Deploy Workers to Cloudflare    |
| `gw do`     | list, info, alarm                      | READ                                         | Durable Objects inspection      |
| `gw cache`  | list, purge, stats                     | READ; purge --write                          | Cache management (KV + CDN)     |
| `gw backup` | list, create, download, restore        | READ; create/restore --write                 | D1 database backups             |
| `gw export` | list, status, start, download, cleanup | READ; start/download/cleanup --write         | Tenant data zip exports         |
| `gw email`  | status, rules, test                    | READ; test --write                           | Email routing operations        |
| `gw social` | status, history, post, setup           | READ; post --write                           | Social cross-posting via Zephyr |

### Git

| Command              | Safety    | Description                          |
| -------------------- | --------- | ------------------------------------ |
| `gw git status`      | READ      | Working tree status                  |
| `gw git log`         | READ      | Commit log with filters              |
| `gw git diff`        | READ      | Changes between commits/working tree |
| `gw git blame`       | READ      | Line-by-line authorship              |
| `gw git show`        | READ      | Commit details                       |
| `gw git fetch`       | READ      | Fetch refs without merging           |
| `gw git reflog`      | READ      | Reference log (HEAD history)         |
| `gw git shortlog`    | READ      | Commit summary by author             |
| `gw git add`         | WRITE     | Stage files                          |
| `gw git commit`      | WRITE     | Commit with Conventional Commits     |
| `gw git push`        | WRITE     | Push to remote                       |
| `gw git pull`        | WRITE     | Pull from remote                     |
| `gw git branch`      | WRITE     | Create, delete, or list branches     |
| `gw git switch`      | WRITE     | Switch branches                      |
| `gw git stash`       | WRITE     | Stash changes                        |
| `gw git unstage`     | WRITE     | Unstage files                        |
| `gw git restore`     | WRITE     | Restore files or unstage changes     |
| `gw git tag`         | WRITE     | Manage tags                          |
| `gw git remote`      | WRITE     | Manage remotes                       |
| `gw git config`      | WRITE     | View/set git configuration           |
| `gw git cherry-pick` | WRITE     | Cherry-pick commits                  |
| `gw git amend`       | WRITE     | Amend last commit message            |
| `gw git merge`       | WRITE     | Merge branches                       |
| `gw git force-push`  | DANGEROUS | Force push (--force-with-lease)      |
| `gw git rebase`      | DANGEROUS | Rebase current branch                |
| `gw git reset`       | DANGEROUS | Reset HEAD                           |
| `gw git clean`       | DANGEROUS | Remove untracked files               |

**Git Workflow Shortcuts:**

| Command           | Safety | Description                                                             |
| ----------------- | ------ | ----------------------------------------------------------------------- |
| `gw git ship`     | WRITE  | Format → check → commit → push (canonical workflow)                     |
| `gw git fast`     | WRITE  | Stage all → commit → push, skipping all hooks                           |
| `gw git save`     | WRITE  | Stage all → WIP commit                                                  |
| `gw git wip`      | WRITE  | WIP commit skipping pre-commit hooks                                    |
| `gw git sync`     | WRITE  | Fetch → rebase on base → push                                           |
| `gw git undo`     | WRITE  | Soft-reset last commit (keeps changes staged)                           |
| `gw git prep`     | READ   | Preflight check (dry run of ship)                                       |
| `gw git pr-prep`  | READ   | Full PR readiness report                                                |
| `gw git worktree` | WRITE  | Manage worktrees (create/list/remove/finish/cd/open/clean/prune/status) |

### GitHub

| Command            | Subcommands                                                                                   | Safety                                                   | Description                  |
| ------------------ | --------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------- |
| `gw gh pr`         | list, view, create, comment, comments, diff, checks, review, re-review, resolve, merge, close | READ; create/comment/review/merge/close --write          | Pull request operations      |
| `gw gh issue`      | list, view, create, comment, close, reopen, batch, milestones                                 | READ; create/comment/close/batch --write                 | Issue operations             |
| `gw gh project`    | list, view, move, field, bulk, add, remove                                                    | READ; move/field/bulk/add/remove --write                 | Project board operations     |
| `gw gh run`        | list, view, watch, rerun, cancel                                                              | READ; rerun/cancel --write                               | Workflow run operations      |
| `gw gh api`        | _(direct)_                                                                                    | READ for GET; POST/PATCH --write; DELETE --write --force | Raw GitHub API access        |
| `gw gh rate-limit` | _(direct)_                                                                                    | READ                                                     | GitHub API rate limit status |

### Developer Tools

| Command       | Subcommands                                | Safety                           | Description                          |
| ------------- | ------------------------------------------ | -------------------------------- | ------------------------------------ |
| `gw dev`      | start, stop, restart, logs, fmt, reinstall | READ for logs; fmt --write       | Dev server management                |
| `gw test`     | _(direct)_                                 | READ                             | Run tests (auto-detect or --package) |
| `gw build`    | _(direct)_                                 | READ                             | Build packages                       |
| `gw check`    | _(direct)_                                 | READ                             | Type checking (svelte-check / mypy)  |
| `gw lint`     | _(direct)_                                 | READ; --fix/--write for auto-fix | Linting (eslint/prettier/ruff)       |
| `gw ci`       | _(direct)_                                 | READ                             | Full CI pipeline locally             |
| `gw packages` | list, info, current, deps                  | READ                             | Monorepo package discovery           |
| `gw publish`  | npm                                        | WRITE                            | Publish to npm with registry swap    |

### Auth & Secrets

| Command     | Subcommands                                                    | Safety                                              | Description               |
| ----------- | -------------------------------------------------------------- | --------------------------------------------------- | ------------------------- |
| `gw auth`   | check, login, client (list/info/create/delete/rotate)          | READ; create/delete/rotate --write                  | Authentication management |
| `gw secret` | init, list, exists, set, delete, generate, apply, sync, reveal | READ for list/exists; set/delete/apply/sync --write | Encrypted secrets vault   |

### Agent Tools

| Command      | Safety | Description                                       |
| ------------ | ------ | ------------------------------------------------- |
| `gw context` | READ   | Session snapshot — start every agent session here |

### System & Info

| Command         | Subcommands                         | Safety                  | Description                                      |
| --------------- | ----------------------------------- | ----------------------- | ------------------------------------------------ |
| `gw status`     | _(direct)_                          | READ                    | Configuration and infrastructure overview        |
| `gw health`     | _(direct)_                          | READ                    | Readiness checks                                 |
| `gw bindings`   | _(direct)_                          | READ                    | All Cloudflare bindings from wrangler.toml files |
| `gw doctor`     | _(direct)_                          | READ; --fix for repairs | Diagnose common issues                           |
| `gw whoami`     | _(direct)_                          | READ                    | Current user, account, and context               |
| `gw history`    | list, show, search, run, clear      | READ; clear --write     | Command history                                  |
| `gw completion` | install, uninstall, bash, zsh, fish | READ                    | Shell tab completions                            |
| `gw mcp`        | serve, tools, config                | READ                    | MCP server for Claude Code                       |
| `gw metrics`    | summary, errors, export, clear, ui  | READ; clear --write     | Usage metrics and statistics                     |

### Domain

| Command     | Subcommands                         | Safety                                       | Description             |
| ----------- | ----------------------------------- | -------------------------------------------- | ----------------------- |
| `gw tenant` | list, lookup, stats, create, delete | READ; create --write, delete --write --force | Tenant management       |
| `gw flag`   | list, get, enable, disable, delete  | READ; enable/disable/delete --write          | Feature flag operations |

---

## Cloudflare Commands

### D1 Database (`gw d1`)

Query databases, list tables, and inspect schemas. All queries are read-only by default.

```bash
# List all databases
gw d1 list

# List tables in the default database
gw d1 tables

# Show schema for a table
gw d1 schema tenants
gw d1 schema --db groveauth users

# Read-only query
gw d1 query "SELECT * FROM tenants WHERE subdomain = 'autumn'"
gw d1 query --db groveauth "SELECT * FROM oauth_clients"

# Write query (requires --write)
gw d1 query --write "UPDATE tenants SET plan = 'oak' WHERE id = 'abc'"

# Execute a migration file
gw d1 migrate --file migrations/042_new_table.sql        # Dry run
gw d1 migrate --write --file migrations/042_new_table.sql # Apply
```

### KV Namespaces (`gw kv`)

```bash
gw kv list                        # List all namespaces
gw kv keys cache                  # List keys in 'cache' namespace
gw kv get cache session:123       # Get a value
gw kv put --write cache key value # Set a value
gw kv delete --write cache key    # Delete a key
```

### R2 Object Storage (`gw r2`)

```bash
gw r2 list                        # List all buckets
gw r2 create --write new-bucket   # Create a bucket
gw r2 ls grove-media              # List objects in bucket
gw r2 get grove-media path/file   # Download an object
gw r2 put --write bucket file     # Upload an object
gw r2 rm --write --force bucket path/file  # Delete an object
```

### Worker Logs (`gw logs`)

Stream real-time logs from Cloudflare Workers. Always safe — no `--write` needed.

```bash
gw logs                            # Stream all logs
gw logs --worker grove-engine      # Specific worker
gw logs --status error             # Only errors
gw logs --method POST              # Only POST requests
gw logs --search "tenant"          # Search in log content
gw logs --format json              # JSON output
gw logs --sampling-rate 0.5        # Sample 50% of requests
```

### Deployment (`gw deploy`)

```bash
gw deploy --dry-run                # Preview deployment
gw deploy --write                  # Deploy to production
gw deploy --write --env staging    # Deploy to staging
gw deploy --write grove-auth       # Deploy specific worker
```

### Durable Objects (`gw do`)

Read-only inspection of Durable Object namespaces and instances.

```bash
gw do list                         # List DO namespaces
gw do info TENANT_SESSIONS         # Show namespace info
gw do alarm TENANT_SESSIONS        # Check alarm status
```

### Cache Management (`gw cache`)

```bash
gw cache list                      # List cache keys from KV
gw cache stats                     # Show cache statistics
gw cache purge --write             # Purge cache entries
```

### Database Backups (`gw backup`)

```bash
gw backup list                     # List available backups
gw backup create --write           # Create a backup
gw backup download ID              # Download a backup file
gw backup restore --write --force ID  # Restore from backup
```

### Data Export (`gw export`)

Manage tenant data zip exports (stored in R2).

```bash
gw export list                     # List recent exports
gw export list autumn              # Exports for a tenant
gw export status <export-id>       # Check export status
gw export start autumn --write     # Trigger new export
gw export download <id> --write    # Download zip from R2
gw export cleanup --write          # Clean expired exports
```

### Email Routing (`gw email`)

```bash
gw email status                    # Check email routing status
gw email rules                     # List email routing rules
gw email test --write              # Send a test email
```

### Social Cross-Posting (`gw social`)

Scatter content on the wind — post to Bluesky (and more, soon) via Zephyr.

```bash
gw social status                   # Platform status and health
gw social history                  # Recent broadcast history
gw social post --write "Hello from the grove!"  # Post to platforms
gw social setup                    # Setup instructions
```

---

## Git Commands (`gw git`)

```
┌─────────────────────────────────────────────────────────────────┐
│                    🌿  GIT INTEGRATION  🌿                       │
│                                                                 │
│   Safe defaults for agents. Conventional Commits by default.   │
│   Issue linking. Branch protection. Worktree management.       │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  READ    │  │  WRITE   │  │ DANGER   │  │PROTECTED │        │
│  │  (safe)  │  │ (--write)│  │(--force) │  │ (never)  │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │               │
│  status        commit        force-push    force-push           │
│  log           push          reset --hard  to main/prod         │
│  diff          add           rebase                             │
│  blame         branch        clean                              │
│  show          ship/fast                                        │
│  fetch         worktree                                         │
│  prep          sync/save                                        │
│                                                                 │
╰─────────────────────────────────────────────────────────────────╯
```

### Safety Tiers

- **READ** — Always safe, no flags needed: status, log, diff, blame, show, fetch, reflog, shortlog, prep, pr-prep
- **WRITE** — Require `--write`: commit, push, pull, add, branch, restore, stash, tag, config, ship, fast, save, sync, wip, undo, amend, worktree, cherry-pick, merge, remote
- **DANGEROUS** — Require `--write --force`: force-push, reset, rebase, clean
- **PROTECTED** — Always blocked: force-push to main/production/staging

### Read Operations

```bash
# Status
gw git status                      # Rich formatted status
gw git status --short              # Compact output

# Log
gw git log                         # Last 10 commits
gw git log --limit 25              # More commits
gw git log --oneline               # Compact
gw git log --author autumn         # Filter by author
gw git log --stat                  # With file change stats

# Diff
gw git diff                        # Unstaged changes
gw git diff --staged               # Staged changes
gw git diff main                   # Compare to branch
gw git diff --stat                 # Summary only
gw git diff --numstat              # Machine-readable stats

# Other reads
gw git blame src/lib/auth.ts       # Line-by-line authorship
gw git show abc123                 # Commit details
gw git show HEAD~2 --stat          # Just file changes
gw git fetch --prune               # Fetch + clean stale refs
gw git reflog                      # HEAD change history
gw git shortlog                    # Summary by author
```

### Write Operations

All require `--write` flag.

```bash
# Staging
gw git add --write src/lib/auth.ts
gw git add --write .               # All changes
gw git unstage --write src/lib/auth.ts

# Commits (Conventional Commits enforced)
gw git commit --write -m "feat(auth): add session refresh"
gw git commit --write -m "fix(ui): correct button alignment" --issue 348

# Push
gw git push --write                # Push to current branch
gw git push --write --set-upstream origin feature/new-thing

# Branches
gw git branch --write feature/348-rate-limiting
gw git branch --write --delete old-branch
gw git switch main                 # Switch branch

# Stash
gw git stash --write               # Save changes
gw git stash list                  # List stashes (READ)
gw git stash pop --write           # Apply + drop
gw git stash apply --write         # Apply, keep stash
gw git stash drop --write          # Drop stash

# Tags
gw git tag --write v1.2.0          # Create tag
gw git tag --write -d v1.2.0       # Delete tag

# Other writes
gw git cherry-pick --write abc123  # Cherry-pick commit
gw git amend --write -m "new msg"  # Amend last commit message
gw git merge --write feature/branch # Merge branch
gw git restore --write file.ts     # Restore file
gw git remote --write add upstream URL
gw git config --write user.name "Name"
```

### Dangerous Operations

Require `--write --force`. Blocked entirely in agent mode.

```bash
# Force push (uses --force-with-lease under the hood)
gw git force-push --write --force origin feature/my-branch
# Blocked on main/production/staging — always

# Reset
gw git reset --write --force --hard HEAD~3

# Rebase
gw git rebase --write --force main

# Clean untracked files
gw git clean --write --force
```

### Workflow Shortcuts

These are the commands that make `gw git` more than a wrapper. They compose multiple operations into safe, opinionated workflows.

#### `gw git ship` — The Canonical Commit+Push

The one command you'll use most. Formats staged files, type-checks affected packages, commits with Conventional Commits, and pushes — all in one step.

```bash
gw git ship --write -m "feat(auth): add session refresh"
gw git ship --write -m "fix(ui): button alignment" --issue 348
gw git ship --write -m "chore: update deps" --no-check  # Skip type checking
gw git ship --write -m "feat: new feature" -a            # Auto-stage all changes
```

**Steps:** auto-stage (if -a) → format with Prettier → type-check affected packages → commit → push (auto --set-upstream if new branch)

#### `gw git fast` — Skip All Hooks

When you need speed over ceremony. Still validates Conventional Commits format.

```bash
gw git fast --write -m "fix(api): quick hotfix"
gw git fast --write -m "chore: checkpoint"
```

**Steps:** stage all → commit --no-verify → push --no-verify

#### `gw git save` — Quick WIP Checkpoint

```bash
gw git save --write                            # Stage all + WIP commit
gw git save --write -m "checkpoint before refactor"
```

#### `gw git wip` — WIP Without Hooks

Creates a WIP commit with `[skip ci]` in the message, skipping pre-commit hooks.

```bash
gw git wip --write
```

#### `gw git sync` — Stay Current

Fetch, rebase on base branch, push. The safe way to stay up to date.

```bash
gw git sync --write                  # Sync with origin/main
gw git sync --write origin develop   # Sync with origin/develop
```

#### `gw git undo` — Soft Reset

Undoes the last commit, keeping all changes staged. Safe to recommit.

```bash
gw git undo --write
```

#### `gw git prep` — Preflight Check

Dry run of what `ship` would do. READ-only, no flags needed.

```bash
gw git prep                          # Check formatting + types
```

#### `gw git pr-prep` — PR Readiness Report

Analyzes all changes since branching from base. Summarizes affected packages, file counts, line changes, push status, and suggests a PR title.

```bash
gw git pr-prep                       # Compare against main
gw git pr-prep --base develop        # Compare against develop
```

#### `gw git worktree` — Parallel Branch Work

Manage git worktrees in `.gw-worktrees/` for working on multiple branches simultaneously without stashing.

```bash
gw git worktree create 920           # Create worktree for PR #920
gw git worktree create #450          # Create worktree for issue-450
gw git worktree list                 # List all worktrees
gw git worktree status               # Status of all worktrees
gw git worktree cd 920               # Print path (for shell cd)
gw git worktree open 920             # Open in VS Code
gw git worktree finish --write 920   # Push, then remove
gw git worktree remove --write 920   # Remove and clean up
gw git worktree clean --write        # Remove ALL gw-managed worktrees
gw git worktree prune --write        # Remove stale worktrees
```

---

## GitHub Commands (`gw gh`)

```
┌─────────────────────────────────────────────────────────────────┐
│                    🌿  GITHUB INTEGRATION  🌿                    │
│                                                                 │
│     Pull requests. Issues. Workflows. Project boards.          │
│     Agent-safe by default. Rate-limit aware.                   │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │    PR    │  │  ISSUE   │  │   RUN    │  │ PROJECT  │        │
│  │  (12)   │  │   (8)    │  │   (5)    │  │   (7)    │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │               │
│    list          list          list          list               │
│    view          view          view          view               │
│    create        create        watch         move               │
│    comment       comment       rerun         field              │
│    comments      close         cancel        bulk               │
│    diff          reopen                      add                │
│    checks        batch                       remove             │
│    review        milestones                                     │
│    re-review                                                    │
│    resolve                                                      │
│    merge                                                        │
│    close                                                        │
│                                                                 │
╰─────────────────────────────────────────────────────────────────╯
```

Wraps `gh` CLI with Grove-aware defaults. Knows the repo, project board field IDs, and integrates with the badger-triage workflow.

### Pull Requests (`gw gh pr`)

```bash
# Read operations (always safe)
gw gh pr list                          # List open PRs
gw gh pr list --author @me             # Your PRs
gw gh pr list --label bug              # Filter by label
gw gh pr view 123                      # View PR details
gw gh pr comments 123                  # List all comments
gw gh pr diff 123                      # View code changes
gw gh pr checks 123                    # CI/CD check status

# Write operations (require --write)
gw gh pr create --write --title "feat: ..." --body "..."
gw gh pr comment --write 123 --body "LGTM!"
gw gh pr review --write 123 --approve
gw gh pr review --write 123 --request-changes --body "See comments"
gw gh pr re-review --write 123         # Request re-review
gw gh pr resolve --write 123           # Resolve review threads
gw gh pr merge --write 123             # Merge PR
gw gh pr merge --write 123 --squash    # Squash merge
gw gh pr close --write 123             # Close without merging
```

### Issues (`gw gh issue`)

```bash
# Read operations
gw gh issue list                       # List open issues
gw gh issue list --label bug           # Filter by label
gw gh issue view 348                   # View issue details
gw gh issue milestones                 # List milestones

# Write operations
gw gh issue create --write --title "Bug: ..." --body "..."
gw gh issue comment --write 348 --body "Investigating..."
gw gh issue close --write 348          # Close issue
gw gh issue reopen --write 348         # Reopen issue

# Batch create from JSON (key for bee-collect workflow)
gw gh issue batch --write --from-json issues.json
```

### Project Board (`gw gh project`)

Integration with GitHub Projects for the badger-triage workflow. These commands know the Grove project board field IDs.

```bash
# Read operations
gw gh project list                     # List project items
gw gh project list --status "In Progress"
gw gh project view 348                 # View item by issue number

# Write operations
gw gh project move --write 348 --status "In Progress"
gw gh project field --write 348 --size "M"
gw gh project field --write 348 --priority "High"
gw gh project bulk --write --issues 348,349,350 --status "Ready"
gw gh project add --write 348          # Add issue to board
gw gh project remove --write 348       # Remove from board
```

### Workflow Runs (`gw gh run`)

```bash
gw gh run list                         # List recent runs (grouped by commit)
gw gh run view 12345678                # View run with job breakdown
gw gh run watch 12345678               # Watch run in progress
gw gh run rerun --write 12345678       # Rerun workflow
gw gh run cancel --write 12345678      # Cancel workflow
```

### Raw API Access (`gw gh api`)

Safety tier based on HTTP method: GET is READ, POST/PATCH is WRITE, DELETE is DANGEROUS.

```bash
# GET (always safe)
gw gh api repos/AutumnsGrove/GroveEngine
gw gh api user

# POST/PATCH (require --write)
gw gh api --write repos/{owner}/{repo}/labels -X POST -f name="bug" -f color="d73a4a"

# DELETE (require --write --force)
gw gh api --write --force repos/{owner}/{repo}/labels/old -X DELETE

# JQ filtering
gw gh api repos/{owner}/{repo}/pulls --jq '.[].title'
```

### Rate Limit Awareness

```bash
gw gh rate-limit                       # Show current rate limit status
```

When approaching limits (< 100 remaining), operations warn or throttle automatically.

---

## Developer Tools

```
┌─────────────────────────────────────────────────────────────────┐
│                    🌿  DEV TOOLS  🌿                             │
│                                                                 │
│     Monorepo-aware development. Package-scoped commands.       │
│     CI parity. One command to rule them all.                   │
│                                                                 │
│         packages/                                               │
│         ├── engine/     →  gw build --package engine            │
│         ├── landing/    →  gw test --package landing            │
│         ├── plant/      →  gw check --package plant             │
│         ├── meadow/     →  gw lint --package meadow             │
│         ├── clearing/   →  gw ci --package clearing             │
│         └── terrarium/  →  gw dev start --package terrarium     │
│                                                                 │
╰─────────────────────────────────────────────────────────────────╯
```

All dev commands auto-detect the current package from your working directory, or accept `--package`/`-p` to specify explicitly. Use `--all` to target every package. Use `--dry-run` to preview what would run.

### Dev Server (`gw dev`)

```bash
gw dev start                       # Start dev server (auto-detect package)
gw dev start --package engine      # Start specific package
gw dev stop                        # Stop dev server
gw dev restart                     # Restart dev server
gw dev logs                        # View dev server logs
```

### Formatting (`gw dev fmt`)

```bash
gw dev fmt                         # Format current package (prettier + black)
gw dev fmt --all                   # Format all packages
gw dev fmt --check                 # Check only, don't write
gw dev fmt src/lib/utils.ts        # Format specific files
```

### Reinstall (`gw dev reinstall`)

After making changes to `tools/gw/` source, reinstall so the global `gw` command picks up changes.

```bash
gw dev reinstall
```

### Tests (`gw test`)

```bash
gw test                            # Test current package
gw test --all                      # Test all packages
gw test --package engine           # Test specific package
gw test -w                         # Watch mode
gw test -c                         # With coverage
gw test -k "auth"                  # Filter by name
gw test --ui                       # Open Vitest UI
gw test --dry-run                  # Preview command
```

### Build (`gw build`)

```bash
gw build                           # Build current package
gw build --all                     # Build all packages
gw build --prod                    # Production build
gw build --clean                   # Clean then build
gw build --package engine          # Build specific package
```

### Type Checking (`gw check`)

For TypeScript/Svelte: runs `svelte-check`. For Python: runs `mypy`.

```bash
gw check                           # Check current package
gw check --all                     # Check all packages
gw check -w                        # Watch mode
gw check --strict                  # Fail on warnings
```

### Linting (`gw lint`)

For TypeScript: eslint/prettier. For Python: ruff.

```bash
gw lint                            # Lint current package
gw lint --all                      # Lint all packages
gw lint --fix                      # Auto-fix issues
gw lint --write                    # Alias for --fix
```

### CI Pipeline (`gw ci`)

Run exactly what CI runs, locally. The `--affected` flag is critical for fast feedback — only checks packages with uncommitted changes.

```bash
gw ci                              # Run full CI: lint → check → test → build
gw ci --affected                   # Only changed packages
gw ci --affected --fail-fast       # Fast feedback loop
gw ci --diagnose                   # Structured error diagnostics on failure
gw ci --skip-lint                  # Skip linting step
gw ci --skip-check                 # Skip type checking
gw ci --skip-test                  # Skip testing
gw ci --skip-build                 # Skip build
gw ci --package engine             # CI for specific package
gw ci --dry-run                    # Preview all steps
```

### Package Discovery (`gw packages`)

```bash
gw packages list                   # List all packages in the monorepo
gw packages info engine            # Show detailed info about a package
gw packages current                # Show current package (from cwd)
gw packages deps engine            # List dependencies for a package
```

### Publish (`gw publish`)

Handles the registry swap workflow for publishing to npm while keeping GitHub Packages as the default.

```bash
gw publish npm --bump patch        # Bump patch, publish to npm
gw publish npm --bump minor        # Bump minor version
gw publish npm --dry-run           # Preview without publishing
```

---

## Auth & Secrets

### Authentication (`gw auth`)

```bash
gw auth check                      # Check Cloudflare auth status
gw auth login                      # Log in to Cloudflare
```

### OAuth Client Management (`gw auth client`)

Manage OAuth clients registered with Heartwood (GroveAuth). Automates the painful manual process of client registration, secret generation, and base64url hash computation.

```bash
gw auth client list                # List all OAuth clients
gw auth client info grove-plant    # Show client details
gw auth client create --write --name "My App"  # Create new client
gw auth client rotate --write grove-plant       # Rotate client secret
gw auth client delete --write grove-test        # Delete client
```

### Secrets Vault (`gw secret`)

Agent-safe secrets management. Store secrets locally in an encrypted vault and apply them to Cloudflare Workers without exposing values. The vault lives at `~/.grove/secrets.enc`.

**Critical rule:** Agents must NEVER run `gw secret reveal`. The entire point of the vault is that agents never see secret values.

```bash
# Vault management
gw secret init                     # Initialize the secrets vault
gw secret list                     # List secret NAMES (never values)
gw secret exists API_KEY           # Check if a secret exists (exit code)

# Store secrets (human-only, prompts for value)
gw secret set API_KEY              # Interactive prompt
gw secret generate API_KEY         # Generate and store a secure key
gw secret delete --write API_KEY   # Delete a secret

# Apply to Workers (agent-safe — never exposes values)
gw secret apply API_KEY --worker grove-engine
gw secret sync --worker grove-engine  # Sync all secrets to worker

# Reveal (HUMAN ONLY — agents must never use this)
gw secret reveal --dangerous API_KEY
```

**Security model:**

- Secrets stored encrypted at `~/.grove/secrets.enc`
- Master key derived from system keychain (macOS) or password
- `GW_VAULT_PASSWORD` env var for non-interactive access
- Agent commands NEVER return secret values in output
- Audit log tracks all secret applications

---

## Agent Tools

### Context Snapshot (`gw context`)

The first command an agent should run at session start. Returns a one-shot work session snapshot combining git status, recent commits, affected packages, issue context, and TODO counts.

```bash
gw context                         # Rich terminal output
gw --json context                  # Structured JSON for agents
```

Always safe — no `--write` flag needed.

---

## System & Info

### Status (`gw status`)

Shows current Grove Wrap status and configuration: Cloudflare account info, available databases, KV namespaces, R2 buckets, and project directory.

```bash
gw status
```

### Health Check (`gw health`)

Verifies Wrangler is installed and authenticated, configuration file exists and is valid, and database connectivity is configured.

```bash
gw health
```

### Bindings (`gw bindings`)

Scans the monorepo for `wrangler.toml` files and displays all configured Cloudflare bindings.

```bash
gw bindings                        # Show all bindings
gw bindings -t d1                  # Show only D1 databases
gw bindings -t kv                  # Show only KV namespaces
gw bindings -t r2                  # Show only R2 buckets
gw bindings -t do                  # Show only Durable Objects
gw bindings -t services            # Show only service bindings
gw bindings -p engine              # Show bindings for specific package
```

### Diagnostics (`gw doctor`)

Like `brew doctor` — runs diagnostic checks and suggests fixes.

```bash
gw doctor                          # Run all checks
gw doctor --fix                    # Attempt to fix issues
gw doctor -v                       # Verbose output
```

### Identity (`gw whoami`)

Shows current user, Cloudflare account, and project context.

```bash
gw whoami                          # Basic identity info
gw whoami -v                       # Verbose with all details
```

### Command History (`gw history`)

Track previous commands and re-run them. Useful for audit trails and repeating operations.

```bash
gw history                         # Show recent commands (alias: gw history list)
gw history list --writes           # Show only write operations
gw history show 5                  # Show details for entry #5
gw history search "tenant"         # Search history
gw history run 5                   # Re-run command #5
gw history clear --write           # Clear history
```

### Shell Completions (`gw completion`)

Tab-complete commands, subcommands, and options for bash, zsh, and fish.

```bash
gw completion install              # Auto-detect shell and install
gw completion uninstall            # Remove installed completions
gw completion bash                 # Generate bash completion script
gw completion zsh                  # Generate zsh completion script
gw completion fish                 # Generate fish completion script
```

### MCP Server (`gw mcp`)

Expose gw commands as MCP tools that Claude Code can call directly.

```bash
gw mcp serve                      # Start MCP server (stdio transport)
gw mcp tools                      # List available MCP tools
gw mcp config                     # Show Claude Code configuration snippet
```

**Claude Code setup:**

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

### Usage Metrics (`gw metrics`)

Track command usage, success rates, error patterns, and performance.

```bash
gw metrics                         # Show summary (alias: gw metrics summary)
gw metrics summary --days 30       # 30-day summary
gw metrics errors                  # Show recent errors
gw metrics export                  # Export as JSON
gw metrics clear --write           # Clear all metrics
gw metrics ui                      # Launch web dashboard
```

---

## Domain Commands

### Tenant Management (`gw tenant`)

Find tenants by subdomain, email, or ID. View statistics and manage accounts.

```bash
# Lookup (always safe)
gw tenant list                     # List all tenants
gw tenant lookup autumn            # By subdomain
gw tenant lookup --email user@example.com
gw tenant lookup --id abc-123
gw tenant stats autumn             # Detailed statistics

# Management (require --write)
gw tenant create --write           # Create a new tenant
gw tenant delete --write --force autumn  # Delete tenant and all data
```

**Tenant deletion** is DANGEROUS — requires `--write --force` and confirmation. Handles D1 CASCADE cleanup, R2 media purge, and session invalidation.

### Feature Flags (`gw flag`)

Manage feature flags stored in KV.

```bash
gw flag list                       # List all flags
gw flag get dark_mode              # Get flag value
gw flag enable --write dark_mode   # Enable a flag
gw flag disable --write beta_ui    # Disable a flag
gw flag delete --write old_flag    # Delete a flag
```

---

## Safety Model

The `--write` flag is the core safety mechanism. Every mutation requires it. This single convention makes gw safe for agent auto-approval of read commands while requiring explicit intent for writes.

```
┌─────────────────────────────────────────────────────────────────┐
│                      SAFETY FLOW                                │
│                                                                 │
│  ┌───────────┐                                                  │
│  │  Command  │                                                  │
│  └─────┬─────┘                                                  │
│        │                                                        │
│        ▼                                                        │
│  ┌───────────────┐     YES    ┌─────────────────┐              │
│  │ Is it a read? │──────────▶ │ Execute freely  │              │
│  └───────┬───────┘            └─────────────────┘              │
│          │ NO                                                   │
│          ▼                                                      │
│  ┌───────────────┐     NO     ┌─────────────────┐              │
│  │ --write flag? │──────────▶ │ Block + explain │              │
│  └───────┬───────┘            └─────────────────┘              │
│          │ YES                                                  │
│          ▼                                                      │
│  ┌───────────────┐     YES    ┌─────────────────┐              │
│  │ Dangerous?    │──────────▶ │ Require --force │              │
│  └───────┬───────┘            └─────────────────┘              │
│          │ NO                                                   │
│          ▼                                                      │
│  ┌───────────────┐     YES    ┌─────────────────┐              │
│  │ Protected     │──────────▶ │ Always blocked  │              │
│  │ branch?       │            └─────────────────┘              │
│  └───────┬───────┘                                              │
│          │ NO                                                   │
│          ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ Execute + log   │                                            │
│  └─────────────────┘                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Four Safety Tiers

| Tier          | Flag Required     | Behavior                                   | Examples                                        |
| ------------- | ----------------- | ------------------------------------------ | ----------------------------------------------- |
| **READ**      | None              | Always safe, execute freely                | git status, d1 tables, gh pr list, context      |
| **WRITE**     | `--write`         | Logged, allowed for agents with flag       | git commit, d1 query --write, gh pr create      |
| **DANGEROUS** | `--write --force` | Confirmation prompt, blocked in agent mode | git force-push, git reset --hard, tenant delete |
| **PROTECTED** | N/A               | Always blocked, cannot be overridden       | Force-push to main/production/staging           |

### Database Safety

Write queries against D1 have additional guards:

- **Row limits** — DELETE capped at 100 rows, UPDATE at 500 rows (configurable)
- **Protected tables** — `tenants`, `users`, `subscriptions`, `payments`, `sessions` require `--force`
- **SQL parsing** — Detects write operations (INSERT/UPDATE/DELETE/DROP) and requires `--write`

### Global Flags

These flags work on every command:

| Flag               | Description                                             |
| ------------------ | ------------------------------------------------------- |
| `--write`          | Confirm write operation                                 |
| `--force`          | Confirm dangerous operation (must combine with --write) |
| `--json`           | Machine-readable JSON output                            |
| `--verbose` / `-v` | Debug output                                            |
| `--dry-run`        | Preview without executing                               |
| `--help`           | Show help                                               |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                  gw CLI                                      │
│                                                                              │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐                 │
│  │ Cloudflare│  │    Git    │  │  GitHub   │  │ Dev Tools │                 │
│  │ d1,kv,r2  │  │ 32 cmds  │  │ pr,issue  │  │ test,ci   │                 │
│  │ cache,do  │  │ ship,fast │  │ project   │  │ build,fmt │                 │
│  │ backup    │  │ worktree  │  │ run,api   │  │ packages  │                 │
│  │ export    │  │           │  │           │  │           │                 │
│  │ social    │  │           │  │           │  │           │                 │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘                 │
│        │              │              │              │                        │
│  ┌─────┴──────────────┴──────────────┴──────────────┘                        │
│  │                    Safety Layer                                           │
│  │  • Read-only default            • Protected tables                       │
│  │  • Row limits on DELETE         • Git branch protection                  │
│  │  • --write / --force gates      • GitHub rate limit awareness            │
│  │  • Audit logging                • Agent mode restrictions                │
│  └──────────────────────┬──────────────────────────────────────────────────  │
│                          │                                                   │
└──────────────────────────┼───────────────────────────────────────────────────┘
                           │
               ┌───────────┼───────────┐
               ▼           ▼           ▼
┌──────────────────┐ ┌──────────┐ ┌──────────┐
│   Wrangler CLI   │ │   git    │ │    gh    │
│   (subprocess)   │ │  (exec)  │ │  (exec)  │
└──────────────────┘ └──────────┘ └──────────┘
```

### Tech Stack

| Component       | Choice            | Rationale                                |
| --------------- | ----------------- | ---------------------------------------- |
| Language        | Python 3.11+      | Rich terminal UI, fast iteration with UV |
| Package Manager | UV                | Already used in Grove, instant startup   |
| CLI Framework   | Click             | Battle-tested, good for subcommands      |
| Terminal UI     | Rich              | Tables, panels, progress bars            |
| Config          | TOML              | Matches wrangler.toml pattern            |
| Wrangler        | Subprocess        | Wraps existing commands                  |
| Git             | Subprocess        | Direct exec with output parsing          |
| GitHub          | Subprocess (`gh`) | Wraps gh CLI with safety                 |

### Source Structure

```
tools/gw/src/gw/
├── cli.py              # Main CLI entry point (Click)
├── config.py           # Configuration loading (~/.grove/gw.toml)
├── wrangler.py         # Wrangler subprocess wrapper
├── git_wrapper.py      # Git subprocess wrapper
├── gh_wrapper.py       # GitHub CLI wrapper
├── packages.py         # Monorepo package detection
├── secrets_vault.py    # Encrypted secrets storage
├── mcp_server.py       # MCP server implementation
├── tracking.py         # Usage metrics tracking
├── help_formatter.py   # Rich help output formatting
├── ui.py               # Rich terminal output helpers
│
├── commands/
│   ├── db.py           # D1 database commands
│   ├── kv.py           # KV commands
│   ├── r2.py           # R2 commands
│   ├── cache.py        # Cache commands
│   ├── do.py           # Durable Objects
│   ├── deploy.py       # Deployment
│   ├── logs.py         # Worker log tailing
│   ├── backup.py       # D1 backups
│   ├── export.py       # Data export
│   ├── email.py        # Email routing
│   ├── social.py       # Social cross-posting
│   ├── auth.py         # Authentication
│   ├── secret.py       # Secrets vault
│   ├── context.py      # Agent session snapshot
│   ├── status.py       # Status display
│   ├── health.py       # Health checks
│   ├── bindings.py     # Cloudflare bindings scan
│   ├── doctor.py       # Diagnostics
│   ├── whoami.py       # Identity display
│   ├── history.py      # Command history
│   ├── completion.py   # Shell completions
│   ├── mcp.py          # MCP commands
│   ├── metrics.py      # Usage metrics
│   ├── tenant.py       # Tenant management
│   ├── flag.py         # Feature flags
│   ├── packages.py     # Package discovery
│   ├── publish.py      # npm publish
│   ├── config_validate.py  # Config validation
│   ├── env_audit.py    # Environment audit
│   ├── monorepo_size.py    # Monorepo size analysis
│   │
│   ├── git/
│   │   ├── read.py     # status, log, diff, blame, show, fetch, reflog, shortlog
│   │   ├── write.py    # add, commit, push, pull, branch, stash, switch, restore, unstage
│   │   ├── danger.py   # force-push, reset, rebase, clean, merge
│   │   ├── shortcuts.py # ship, fast, save, wip, sync, undo, amend, prep, pr-prep
│   │   ├── worktree.py # worktree management (10 subcommands)
│   │   ├── remote.py   # remote management
│   │   ├── tag.py      # tag management
│   │   └── config_cmd.py # git config
│   │
│   ├── gh/
│   │   ├── pr.py       # Pull request operations (12 subcommands)
│   │   ├── issue.py    # Issue operations (8 subcommands)
│   │   ├── project.py  # Project board operations (7 subcommands)
│   │   ├── run.py      # Workflow run operations (5 subcommands)
│   │   └── api.py      # Raw API access
│   │
│   ├── dev/
│   │   ├── server.py   # Dev server management
│   │   ├── test.py     # Test runner
│   │   ├── build.py    # Build commands
│   │   ├── check.py    # Type checking
│   │   ├── lint.py     # Linting
│   │   ├── ci.py       # CI pipeline runner
│   │   ├── format.py   # Code formatting
│   │   └── reinstall.py # gw reinstall helper
│   │
│   └── queen/          # Future: CI runner pool (not live)
│       ├── swarm.py    # Pool management stubs
│       └── ci.py       # CI job management stubs
│
├── completions/
│   ├── bash.py         # Bash completion generator
│   ├── zsh.py          # Zsh completion generator
│   └── fish.py         # Fish completion generator
│
└── safety/
    ├── database.py     # DB safety (row limits, protected tables, SQL parsing)
    ├── git.py          # Git safety tiers
    └── github.py       # GitHub safety tiers
```

---

## Configuration

Grove Wrap is configured via `~/.grove/gw.toml`. The tool auto-discovers most settings from `wrangler.toml` files in the monorepo, but the config file provides aliases, safety settings, and project board field IDs.

```toml
# ─────────────────────────────────────────────────────────────────
#                    CLOUDFLARE CONFIGURATION
# ─────────────────────────────────────────────────────────────────

[databases]
default = "grove-engine-db"

[databases.lattice]
name = "grove-engine-db"
id = "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68"

[databases.groveauth]
name = "groveauth"
id = "45eae4c7-8ae7-4078-9218-8e1677a4360f"

[databases.clearing]
name = "daily-clearing-db"
id = "1fb94ac6-53c6-49d6-9388-a6f585f86196"

[kv_namespaces]
default = "CACHE_KV"

[r2_buckets]
default = "grove-media"

[safety]
max_delete_rows = 100
max_update_rows = 500
protected_tables = ["users", "tenants", "subscriptions", "payments"]


# ─────────────────────────────────────────────────────────────────
#                    GIT CONFIGURATION
# ─────────────────────────────────────────────────────────────────

[git]
commit_format = "conventional"
conventional_types = ["feat", "fix", "docs", "style", "refactor", "test", "chore", "perf", "ci"]
protected_branches = ["main", "production", "staging"]
auto_link_issues = true
issue_pattern = "(?:^|/)(?P<num>\\d+)[-_]"
skip_hooks_on_wip = true


# ─────────────────────────────────────────────────────────────────
#                    GITHUB CONFIGURATION
# ─────────────────────────────────────────────────────────────────

[github]
owner = "AutumnsGrove"
repo = "GroveEngine"
project_number = 1

[github.project_fields]
status = "PVTSSF_xxx"
priority = "PVTSSF_yyy"
size = "PVTSSF_zzz"
sprint = "PVTSSF_aaa"

[github.project_values]
status_backlog = "bbb"
status_ready = "ccc"
status_in_progress = "ddd"
status_in_review = "eee"
status_done = "fff"


# ─────────────────────────────────────────────────────────────────
#                    MONOREPO CONFIGURATION
# ─────────────────────────────────────────────────────────────────

[packages]
default = "engine"
root = "packages"

[packages.aliases]
eng = "engine"
land = "landing"
heart = "heartwood"
clear = "clearing"
terra = "terrarium"
```

---

## Shell Aliases

These shell aliases are available in local development (set up via grove-find integration):

```bash
# Cloudflare
gwd                    # gw d1
gwq "sql"              # gw d1 query "sql"
gwt                    # gw d1 tables
gwc tenant             # gw cache purge --tenant
gws                    # gw status

# Git
gwgs                   # gw git status
gwgl                   # gw git log
gwgd                   # gw git diff
gwgc "msg"             # gw git commit --write -m "msg"
gwgp                   # gw git push --write
gwgsave                # gw git save --write
gwgsync                # gw git sync --write

# GitHub
gwpr                   # gw gh pr list
gwprc                  # gw gh pr create --write
gwprv 123              # gw gh pr view 123
gwiss                  # gw gh issue list
gwissv 348             # gw gh issue view 348

# Dev
gwdev                  # gw dev start
gwtest                 # gw test
gwbuild                # gw build
gwci                   # gw ci
```

---

## Future

### Queen Firefly (CI Runner Pool)

A Cloudflare Durable Object that coordinates pools of Firefly instances for CI, Bloom, and Outpost workloads. CLI stubs exist at `gw queen swarm` and `gw queen ci`. Full spec at `docs/specs/queen-firefly-coordinator-spec.md`.

Planned commands:

```bash
gw queen status                    # Queue depth, runner counts, costs
gw queen swarm status              # Detailed pool breakdown
gw queen swarm warm --count N      # Pre-warm runners
gw queen swarm freeze              # Fade all runners
gw ci list                         # CI jobs (extends current gw ci)
gw ci view 127                     # Job details and logs
gw ci run                          # Manually trigger CI
gw ci logs 127 --follow            # Stream job logs
```

### Other Planned Features

- `gw shell` — Interactive REPL mode
- `gw tunnel` — Quick cloudflared tunnel for local dev
- `gw inspect <request-id>` — Debug specific Worker requests
- `gw replay` — Replay webhooks for debugging

---

## Related

- **Queen Firefly Spec** — `docs/specs/queen-firefly-coordinator-spec.md` (CI runner coordination)
- **Firefly SDK Spec** — `docs/specs/firefly-sdk-spec.md` (provider-agnostic server provisioning)
- **Warden SDK Spec** — `docs/specs/warden-sdk-spec.md` (secrets management SDK)
- **grove-find (gf)** — `tools/grove-find-go/` (Go binary for codebase search)

---

_The best CLI is the one you don't have to think about. Just type `gw` and go._
