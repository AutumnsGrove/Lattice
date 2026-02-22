---
title: "GW Full Sweep Safari — Every Help Screen Gets the Cozy Treatment"
status: planned
category: tooling
---

# GW Full Sweep Safari — Every Help Screen Gets the Cozy Treatment

> One CLI to tend them all — and right now, only two rooms are decorated.
> **Aesthetic principle**: Every `gw <group>` should feel like walking into the same warm tea shop. Same panels, same colors, same safety-tier language. No plain Click walls.
> **Scope**: Help screen output for every command group in gw (22 groups total)

---

## Ecosystem Overview

**22 command groups** in `tools/gw/src/gw/commands/`

Today, **2 of 22** groups have cozy Rich-formatted help:

- `gw` (root) — `GWGroup` in `cli.py` with categorized panels via `help_formatter.py`
- `gw git` — `GitGroup` in `git/__init__.py` with categorized panels

The other **20 groups** all use plain `@click.group()` — default Click help formatting. Monospace. Alphabetical. Cold.

### Groups by category

**Version Control**: git (done), gh
**Cloudflare Infrastructure**: d1, kv, r2, cache, backup, export, do, deploy (single cmd), logs (single cmd), email
**Developer Tools**: dev, packages, publish, completion
**Auth & Secrets**: auth, secret
**Agent & Meta**: context (single cmd), mcp, history, metrics, queen
**Tenant & Social**: tenant, flag, social

### Single-command "groups" (no help panel needed)

These are registered as standalone commands, not groups — they don't have subcommands to categorize:

- `deploy`, `logs`, `context`, `bindings`, `status`, `health`, `doctor`, `whoami`, `config-validate`, `env-audit`, `monorepo-size`

**That leaves 17 actual groups** that need the cozy treatment, plus 3-4 that are borderline (only 1-2 subcommands).

---

## Quick Survey

| #   | Stop            | Commands                                                                      | Current State                                    | Warmth | Priority                    |
| --- | --------------- | ----------------------------------------------------------------------------- | ------------------------------------------------ | ------ | --------------------------- |
| 1   | `gw gh`         | 6 (pr, issue, run, api, rate-limit, project)                                  | Plain Click wall, safety tiers in docstring only | Cold   | **High** (238 uses)         |
| 2   | `gw d1`         | 5 (list, tables, schema, query, migrate)                                      | Plain Click wall                                 | Cold   | **High** (62 uses)          |
| 3   | `gw dev`        | 12 (start, stop, restart, logs, test, build, check, lint, fmt, ci, reinstall) | Plain Click wall, no categories                  | Cold   | **High** (dev daily driver) |
| 4   | `gw secret`     | 9 (init, set, list, reveal, exists, delete, generate, apply, sync)            | Plain Click wall                                 | Cold   | **Medium** (16 uses)        |
| 5   | `gw gh pr`      | 6 (list, view, create, edit, close, merge)                                    | Plain Click wall (nested)                        | Cold   | **Medium**                  |
| 6   | `gw gh issue`   | 6 (list, view, create, batch, edit, close)                                    | Plain Click wall (nested)                        | Cold   | **Medium**                  |
| 7   | `gw kv`         | 5 (list, keys, get, put, delete)                                              | Plain Click wall                                 | Cold   | **Low**                     |
| 8   | `gw r2`         | 6 (list, create, ls, get, put, rm)                                            | Plain Click wall                                 | Cold   | **Low**                     |
| 9   | `gw backup`     | 4 (list, create, restore, download)                                           | Plain Click wall                                 | Cold   | **Low**                     |
| 10  | `gw export`     | 5 (list, status, start, download, cleanup)                                    | Plain Click wall                                 | Cold   | **Low**                     |
| 11  | `gw do`         | 3 (list, info, alarm)                                                         | Plain Click wall                                 | Cold   | **Low**                     |
| 12  | `gw tenant`     | 5 (list, lookup, stats, create, delete)                                       | Plain Click wall                                 | Cold   | **Low**                     |
| 13  | `gw flag`       | 5 (list, get, enable, disable, delete)                                        | Plain Click wall                                 | Cold   | **Low**                     |
| 14  | `gw email`      | 3 (status, test, rules)                                                       | Plain Click wall                                 | Cold   | **Low**                     |
| 15  | `gw auth`       | 3 + subgroup (check, login, client)                                           | Plain Click wall                                 | Cold   | **Low**                     |
| 16  | `gw social`     | 4 (post, status, history, setup)                                              | Plain Click wall + **broken \\b**                | Broken | **Medium**                  |
| 17  | `gw cache`      | 3 (list, purge, stats)                                                        | Plain Click wall                                 | Cold   | **Low**                     |
| 18  | `gw metrics`    | 5 (summary, errors, export, clear, ui)                                        | Plain Click wall                                 | Cold   | **Low**                     |
| 19  | `gw history`    | 5 (list, search, show, run, clear)                                            | Plain Click wall                                 | Cold   | **Low**                     |
| 20  | `gw mcp`        | 3 (serve, tools, config)                                                      | Plain Click wall                                 | Cold   | **Low**                     |
| 21  | `gw publish`    | 1 (npm)                                                                       | Plain Click + **broken \\b** + **own Console()** | Broken | **Low**                     |
| 22  | `gw completion` | 5 (install, uninstall, bash, zsh, fish)                                       | Plain Click wall                                 | Cold   | **Low**                     |

### Terrain summary

- **Thriving** (2): root `gw`, `gw git` — Rich panels, categorized, warm
- **Barren** (18): Plain Click walls, no categorization, no color
- **Broken** (2): `publish` and `social` — broken `\b` escape + `publish` has its own `Console()`

---

## The Core Design Decision

### Don't build 20 custom Group classes

The `GitGroup` approach works beautifully but is bespoke — the categories dict, the panel rendering, and the safety footer are all hand-crafted inside `git/__init__.py`. Copying that 50-line class into 20 files would be a maintenance nightmare.

### Build one reusable `CozyGroup` class

Create a **single `CozyGroup(click.Group)`** in `ui.py` (or a new `cozy_group.py`) that:

1. Takes a `title` string (e.g., "gw gh — GitHub operations")
2. Takes a `categories` dict in the same format as `GIT_CATEGORIES`
3. Takes an optional `footer` (for safety tiers, tips, etc.)
4. Renders the same warm panels pattern that `GitGroup` uses
5. Falls back gracefully when a group has no categories (just renders a single panel with all commands)

Then every group definition becomes:

```python
from ...ui import CozyGroup, GROVE_COLORS

GH_CATEGORIES = {
    "read": ("📖 Read (Always Safe)", GROVE_COLORS["forest_green"], [...]),
    "write": ("✏️  Write (Require --write)", GROVE_COLORS["leaf_yellow"], [...]),
    ...
}

@click.group(cls=CozyGroup, cozy_title="gw gh", cozy_categories=GH_CATEGORIES)
def gh() -> None:
    """GitHub operations with safety guards."""
    pass
```

And `GitGroup` becomes `CozyGroup` too — deduplication.

---

## Stop-by-Stop Observations & Designs

### 1. `gw gh` — GitHub Operations

**Character**: The social butterfly of gw — PRs, issues, runs, API calls. High traffic (238 uses). Has safety tiers in the docstring but they're buried in plain text.

**Current help**: Plain Click wall, 6 commands listed alphabetically.

**Design spec (safari-approved)**:

```
GH_CATEGORIES = {
    "read": ("📖 Read (Always Safe)", forest_green, [
        ("pr list", "List open pull requests"),
        ("pr view", "View PR details"),
        ("issue list", "List open issues"),
        ("issue view", "View issue details"),
        ("run list", "List workflow runs"),
        ("run view", "View run details"),
        ("run logs", "View run logs"),
        ("rate-limit", "Check API rate limit"),
    ]),
    "write": ("✏️  Write (Require --write)", leaf_yellow, [
        ("pr create", "Create a pull request"),
        ("pr edit", "Edit a pull request"),
        ("issue create", "Create an issue"),
        ("issue batch", "Batch create issues from JSON"),
        ("issue edit", "Edit an issue"),
        ("run rerun", "Re-run a workflow"),
    ]),
    "destructive": ("🔥 Destructive (Require --write)", "red", [
        ("pr merge", "Merge a pull request"),
        ("pr close", "Close a pull request"),
        ("issue close", "Close an issue"),
    ]),
    "advanced": ("🔧 Advanced", bark_brown, [
        ("api", "Raw GitHub API requests"),
        ("project", "Project board operations"),
    ]),
}
```

**Note**: `gh` has nested subgroups (`pr`, `issue`, `run`, `project`). The help should flatten the most-used commands for discoverability while keeping the subgroups navigable.

---

### 2. `gw d1` — D1 Database

**Character**: The careful librarian — read-only by default, migrations require `--write`. Only 5 commands but high value (62 uses).

**Design spec**:

```
D1_CATEGORIES = {
    "read": ("📖 Read (Always Safe)", forest_green, [
        ("list", "List all databases"),
        ("tables", "List tables in a database"),
        ("schema", "Show schema for a table"),
        ("query", "Execute a read-only SQL query"),
    ]),
    "write": ("✏️  Write (Require --write)", leaf_yellow, [
        ("migrate", "Execute a SQL migration file"),
    ]),
}
```

---

### 3. `gw dev` — Developer Tools

**Character**: The workshop — 12 commands spanning servers, tests, builds, linting, CI. The biggest group after `git`. No safety tiers (everything's local), but natural categories exist.

**Design spec**:

```
DEV_CATEGORIES = {
    "server": ("🖥️  Dev Server", river_cyan, [
        ("start", "Start dev server for current package"),
        ("stop", "Stop a running dev server"),
        ("restart", "Restart a dev server"),
        ("logs", "Show dev server logs"),
    ]),
    "quality": ("✅ Quality", forest_green, [
        ("test", "Run tests"),
        ("check", "Run type checking"),
        ("lint", "Lint code"),
        ("fmt", "Format code"),
    ]),
    "build": ("📦 Build & Ship", leaf_yellow, [
        ("build", "Build packages"),
        ("ci", "Run full CI pipeline locally"),
    ]),
    "tools": ("🔧 Tools", bark_brown, [
        ("reinstall", "Reinstall gw as a UV tool"),
    ]),
}
```

---

### 4. `gw secret` — Secrets Vault

**Character**: The locksmith — 9 commands for an encrypted vault. Clear read/write split.

**Design spec**:

```
SECRET_CATEGORIES = {
    "setup": ("🔑 Setup", river_cyan, [
        ("init", "Initialize the secrets vault"),
    ]),
    "read": ("📖 Read (Always Safe)", forest_green, [
        ("list", "List all secrets"),
        ("reveal", "Show a secret value"),
        ("exists", "Check if a secret exists"),
    ]),
    "write": ("✏️  Write (Require --write)", leaf_yellow, [
        ("set", "Store a secret"),
        ("generate", "Generate and store a secure API key"),
        ("delete", "Delete a secret"),
    ]),
    "deploy": ("🚀 Deploy", blossom_pink, [
        ("apply", "Apply secrets to a Worker"),
        ("sync", "Sync all secrets to a Worker"),
    ]),
}
```

---

### 5. `gw kv` — KV Storage

**Character**: Key-value simplicity. Clean read/write split.

**Design spec**:

```
KV_CATEGORIES = {
    "read": ("📖 Read (Always Safe)", forest_green, [
        ("list", "List all KV namespaces"),
        ("keys", "List keys in a namespace"),
        ("get", "Get a value"),
    ]),
    "write": ("✏️  Write (Require --write)", leaf_yellow, [
        ("put", "Set a value"),
        ("delete", "Delete a key"),
    ]),
}
```

---

### 6. `gw r2` — R2 Object Storage

**Character**: The warehouse — buckets and objects. Three-tier safety (read/write/delete).

**Design spec**:

```
R2_CATEGORIES = {
    "read": ("📖 Read (Always Safe)", forest_green, [
        ("list", "List all R2 buckets"),
        ("ls", "List objects in a bucket"),
        ("get", "Download an object"),
    ]),
    "write": ("✏️  Write (Require --write)", leaf_yellow, [
        ("create", "Create a new bucket"),
        ("put", "Upload an object"),
    ]),
    "destructive": ("🔥 Delete (--write --force)", "red", [
        ("rm", "Delete an object"),
    ]),
}
```

---

### 7. `gw backup` — D1 Backups

**Design spec**:

```
BACKUP_CATEGORIES = {
    "read": ("📖 Read (Always Safe)", forest_green, [
        ("list", "List available backups"),
        ("download", "Download a backup file"),
    ]),
    "write": ("✏️  Write (Require --write)", leaf_yellow, [
        ("create", "Create a database backup"),
    ]),
    "destructive": ("🔥 Restore (--write --force)", "red", [
        ("restore", "Restore database from backup"),
    ]),
}
```

---

### 8. `gw export` — Data Exports

**Design spec**:

```
EXPORT_CATEGORIES = {
    "read": ("📖 Read (Always Safe)", forest_green, [
        ("list", "List recent exports"),
        ("status", "Check export status"),
    ]),
    "write": ("✏️  Write (Require --write)", leaf_yellow, [
        ("start", "Trigger a new export"),
        ("download", "Download export zip from R2"),
        ("cleanup", "Clean expired exports"),
    ]),
}
```

---

### 9. `gw do` — Durable Objects

**Design spec**: Only 3 read-only commands. Single panel, no categories needed.

```
DO_CATEGORIES = {
    "read": ("📖 Read (Always Safe)", forest_green, [
        ("list", "List DO namespaces"),
        ("info", "Show namespace info"),
        ("alarm", "Check alarm status"),
    ]),
}
```

---

### 10. `gw tenant` — Tenant Management

**Design spec**:

```
TENANT_CATEGORIES = {
    "read": ("📖 Read (Always Safe)", forest_green, [
        ("list", "List all tenants"),
        ("lookup", "Look up a tenant"),
        ("stats", "Show tenant statistics"),
    ]),
    "write": ("✏️  Write (Require --write)", leaf_yellow, [
        ("create", "Create a new tenant"),
    ]),
    "destructive": ("🔥 Destructive (--write --force)", "red", [
        ("delete", "Delete a tenant and all data"),
    ]),
}
```

---

### 11. `gw flag` — Feature Flags

**Design spec**:

```
FLAG_CATEGORIES = {
    "read": ("📖 Read (Always Safe)", forest_green, [
        ("list", "List all feature flags"),
        ("get", "Get a flag value"),
    ]),
    "write": ("✏️  Write (Require --write)", leaf_yellow, [
        ("enable", "Enable a feature flag"),
        ("disable", "Disable a feature flag"),
        ("delete", "Delete a feature flag"),
    ]),
}
```

---

### 12. `gw email` — Email Routing

**Design spec**: Only 3 commands. Single read panel + write.

```
EMAIL_CATEGORIES = {
    "read": ("📖 Read (Always Safe)", forest_green, [
        ("status", "Check email routing status"),
        ("rules", "List email routing rules"),
    ]),
    "write": ("✏️  Write (Require --write)", leaf_yellow, [
        ("test", "Send a test email"),
    ]),
}
```

---

### 13. `gw auth` — Authentication

**Design spec**: Has a `client` subgroup. Flatten for discoverability.

```
AUTH_CATEGORIES = {
    "read": ("📖 Read (Always Safe)", forest_green, [
        ("check", "Check Cloudflare auth status"),
        ("client list", "List OAuth clients"),
        ("client info", "Show client details"),
    ]),
    "write": ("✏️  Write (Require --write)", leaf_yellow, [
        ("login", "Log in to Cloudflare"),
        ("client create", "Create OAuth client"),
        ("client rotate", "Rotate client secret"),
        ("client delete", "Delete OAuth client"),
    ]),
}
```

---

### 14. `gw social` — Social Broadcasting

**Broken**: `\b` escape is `\\b` (double-escaped), showing literal `\b` in help.

**Design spec**:

```
SOCIAL_CATEGORIES = {
    "read": ("📖 Read (Always Safe)", forest_green, [
        ("status", "Platform health and status"),
        ("history", "Recent broadcast history"),
        ("setup", "Show setup instructions"),
    ]),
    "write": ("✏️  Write (Require --write)", leaf_yellow, [
        ("post", "Post to social platforms"),
    ]),
}
```

**Fix**: Change `\\b` to `\b` in the docstring.

---

### 15. `gw cache` — Cache Management

**Design spec**:

```
CACHE_CATEGORIES = {
    "read": ("📖 Read (Always Safe)", forest_green, [
        ("list", "List cache keys from KV"),
        ("stats", "Show cache statistics"),
    ]),
    "write": ("✏️  Write (Require --write)", leaf_yellow, [
        ("purge", "Purge cache entries"),
    ]),
}
```

---

### 16. `gw metrics` — Usage Metrics

**Design spec**:

```
METRICS_CATEGORIES = {
    "read": ("📖 Read (Always Safe)", forest_green, [
        ("summary", "Usage summary dashboard"),
        ("errors", "Error report"),
        ("export", "Export metrics data"),
    ]),
    "write": ("✏️  Write (Require --write)", leaf_yellow, [
        ("clear", "Clear metrics data"),
    ]),
    "tools": ("🔧 Tools", bark_brown, [
        ("ui", "Open metrics dashboard"),
    ]),
}
```

---

### 17. `gw history` — Command History

**Design spec**:

```
HISTORY_CATEGORIES = {
    "read": ("📖 Read (Always Safe)", forest_green, [
        ("list", "List recent commands"),
        ("search", "Search command history"),
        ("show", "Show command details"),
    ]),
    "write": ("✏️  Write", leaf_yellow, [
        ("run", "Re-run a command"),
        ("clear", "Clear command history"),
    ]),
}
```

---

### 18. `gw mcp` — MCP Server

**Design spec**:

```
MCP_CATEGORIES = {
    "server": ("🤖 Server", river_cyan, [
        ("serve", "Start MCP server (stdio)"),
        ("tools", "List available MCP tools"),
        ("config", "Show Claude Code config snippet"),
    ]),
}
```

---

### 19. `gw publish` — Package Publishing

**Broken**: `\\b` double-escape + creates its own `Console()`.

**Design spec**: Only 1 command (`npm`). Probably doesn't need categories — just a clean single-panel display. But fix the broken formatting and remove the duplicate Console.

```
PUBLISH_CATEGORIES = {
    "publish": ("📦 Publish", blossom_pink, [
        ("npm", "Publish to npm with registry swap"),
    ]),
}
```

**Fixes**:

- [ ] Remove `from rich.console import Console` and `console = Console()` — import from `..ui`
- [ ] Fix `\\b` to `\b` in docstring

---

### 20. `gw completion` — Shell Completions

**Design spec**:

```
COMPLETION_CATEGORIES = {
    "install": ("⚡ Setup", river_cyan, [
        ("install", "Auto-detect and install"),
        ("uninstall", "Remove installed completions"),
    ]),
    "generate": ("📄 Generate", forest_green, [
        ("bash", "Generate bash script"),
        ("zsh", "Generate zsh script"),
        ("fish", "Generate fish script"),
    ]),
}
```

---

## Expedition Summary

### By the numbers

| Metric                         | Count               |
| ------------------------------ | ------------------- |
| Total command groups           | 22                  |
| Already cozy (root + git)      | 2                   |
| Need cozy treatment            | 20                  |
| Broken formatting              | 2 (publish, social) |
| Stale own Console()            | 1 (publish)         |
| Total category dicts to define | 20                  |

### Cross-cutting themes

1. **Every group is a plain `@click.group()`** — no custom classes, no `format_help()` overrides
2. **Read/Write safety tiers apply everywhere** — the same pattern repeats across d1, kv, r2, backup, export, flag, tenant, auth, secret, cache, email, social
3. **Some groups have nested subgroups** — gh (pr, issue, run, project), auth (client). The help should flatten commonly-used subcommands for discoverability
4. **Two files have broken `\b` escapes** — `publish.py` and `social.py` use `\\b` instead of `\b`
5. **One file still creates its own Console()** — `publish.py`

### The implementation plan

#### Phase 0: Build `CozyGroup` (foundation)

Create `CozyGroup(click.Group)` in `tools/gw/src/gw/cozy_group.py`:

- Accepts `cozy_title`, `cozy_categories`, `cozy_footer` kwargs
- Renders Rich panels identical to `GitGroup` pattern
- Handles edge case of single-category groups (just one panel, no footer)
- Includes a built-in safety tiers footer that can be toggled

Refactor `GitGroup` to use `CozyGroup` — delete the bespoke class, just pass `GIT_CATEGORIES`.

**Files**: `cozy_group.py` (new), `git/__init__.py` (simplify)

#### Phase 1: High-traffic groups (gh, d1, dev)

These get the most eyes. Do them first.

**Files**: `gh/__init__.py`, `db.py`, `dev/__init__.py`

#### Phase 2: Medium groups (secret, kv, r2, backup, export, tenant, flag)

The Cloudflare infrastructure family — all follow the same read/write/destructive pattern.

**Files**: `secret.py`, `kv.py`, `r2.py`, `backup.py`, `export.py`, `tenant.py`, `flag.py`

#### Phase 3: Small groups (auth, cache, do, email, social, metrics, history, mcp, publish, completion)

Quick wins — most have 3-5 commands. Also fix the broken files.

**Files**: `auth.py`, `cache.py`, `do.py`, `email.py`, `social.py`, `metrics.py`, `history.py`, `mcp.py`, `publish.py`, `completion.py`

#### Phase 4: Nested subgroups (gh pr, gh issue, gh run, gh project, auth client)

These are secondary — users usually see the parent group help first. But for completeness, give them panels too.

**Files**: `gh/pr.py`, `gh/issue.py`, `gh/run.py`, `gh/project.py`, `auth.py` (client subgroup)

#### Phase 5: Verification

Reinstall, run every `gw <group>` help screen, verify panels render correctly.

### Recommended trek order

1. **CozyGroup foundation first** — everything depends on this
2. **gh, dev, d1** — highest traffic, biggest visual impact
3. **secret, kv, r2** — the next most-used Cloudflare groups
4. **Everything else** — sweep through in a single pass
5. **Fix broken files** — publish.py Console + broken \b in publish + social
6. **Nested subgroups** — last, lowest priority

---

_The fire dies to embers. The journal is full — 22 stops, 20 needing the cozy treatment, 1 reusable CozyGroup class to rule them all. The biggest insight: this isn't 20 separate problems, it's one problem solved once. Tomorrow, the animals go to work. But tonight? Tonight was the drive. And it was glorious._ 🚙
