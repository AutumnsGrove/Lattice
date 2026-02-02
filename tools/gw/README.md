# Grove Wrap (gw)

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
╰──────────────────────────────────╯
```

> *A friendly fence around Wrangler's garden. Safe enough for agents, fast enough for humans.*

Grove Wrap (`gw`) is a CLI abstraction over Wrangler that provides:

- **Safety guards** for database operations (read-only by default)
- **Grove-aware shortcuts** (knows database IDs, table names, common queries)
- **Agent integration** (MCP server mode for Claude Code)
- **Human-friendly output** (Rich terminal UI)

## Installation

```bash
cd tools/gw
uv sync
```

The `gw` command is now available via UV:

```bash
uv run gw --help
```

## Quick Start

```bash
# Check status
uv run gw status

# Check health
uv run gw health

# Check authentication
uv run gw auth check

# Login to Cloudflare
uv run gw auth login
```

## Commands

### Status Commands

```bash
gw status              # Show configuration and Cloudflare account
gw --json status       # Machine-readable JSON output
gw health              # Health check for all components
gw bindings            # Show all Cloudflare bindings from wrangler.toml
```

### Bindings

```bash
gw bindings            # Show all bindings (D1, KV, R2, DOs, Services)
gw bindings -t d1      # Filter by type: d1, kv, r2, do, services, ai
gw bindings -p engine  # Filter by package name
gw --json bindings     # Machine-readable JSON output
```

### Database Commands

```bash
gw db list                              # List all databases
gw db tables                            # List tables in default database
gw db tables --db groveauth             # List tables in specific database
gw db schema tenants                    # Show table schema
gw db query "SELECT * FROM tenants"     # Execute read-only query
gw db query "..." --write               # Execute write query (with safety checks)
```

### Tenant Commands

```bash
gw tenant lookup autumn                 # Look up by subdomain
gw tenant lookup --email user@example.com
gw tenant lookup --id abc-123
gw tenant stats autumn                  # Show tenant statistics
gw tenant list                          # List all tenants
gw tenant list --plan oak               # Filter by plan
```

### Authentication

```bash
gw auth check          # Check if authenticated
gw auth login          # Login via Wrangler
```

## Global Flags

| Flag | Description |
|------|-------------|
| `--json` | Output machine-readable JSON |
| `--verbose` | Enable debug output |
| `--help` | Show help message |

**Note:** Global flags come BEFORE the subcommand:

```bash
gw --json status    # ✓ Correct
gw status --json    # ✗ Wrong
```

## Configuration

Configuration is stored at `~/.grove/gw.toml`:

```toml
[databases]
default = "lattice"

[databases.lattice]
name = "grove-engine-db"
id = "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68"

[databases.groveauth]
name = "groveauth"
id = "45eae4c7-8ae7-4078-9218-8e1677a4360f"

[kv_namespaces.cache]
name = "CACHE_KV"
id = "514e91e81cc44d128a82ec6f668303e4"

[r2_buckets]
default = "grove-media"

[safety]
max_delete_rows = 100
max_update_rows = 500
protected_tables = ["users", "tenants", "subscriptions", "payments", "sessions"]
```

## Safety Layer

The built-in safety layer protects against accidental data loss:

### Blocked Operations

- **DDL** — CREATE, DROP, ALTER, TRUNCATE are blocked
- **Dangerous patterns** — Stacked queries (`;DROP`) and SQL comments (`--`, `/*`)
- **Missing WHERE** — DELETE/UPDATE without WHERE clause
- **Protected tables** — users, tenants, subscriptions, payments, sessions
- **Row limits** — DELETE limited to 100 rows, UPDATE to 500

### Agent Mode

When running with `GW_AGENT_MODE=1`, stricter limits apply:

- DELETE limited to 50 rows (not 100)
- UPDATE limited to 200 rows (not 500)
- All operations are audit-logged

## Development

### Running Tests

```bash
uv sync --extra dev
uv run pytest tests/ -v
```

### Project Structure

```
tools/gw/
├── pyproject.toml          # UV project config
├── src/gw/
│   ├── cli.py              # Main Click CLI
│   ├── config.py           # Configuration loading
│   ├── wrangler.py         # Wrangler subprocess wrapper
│   ├── safety.py           # SQL safety validation
│   ├── ui.py               # Rich terminal helpers
│   └── commands/
│       ├── status.py       # gw status
│       ├── health.py       # gw health
│       ├── auth.py         # gw auth check/login
│       ├── bindings.py     # gw bindings
│       ├── db.py           # gw db list/tables/schema/query
│       └── tenant.py       # gw tenant lookup/stats/list
└── tests/
    └── test_safety.py      # Safety layer tests
```

## Roadmap

### Phase 1 ✅
- [x] Project scaffolding
- [x] Configuration system
- [x] Safety layer
- [x] `gw status`, `gw health`, `gw auth`, `gw bindings`

### Phase 2 ✅ (Current)
- [x] `gw db list` — List databases
- [x] `gw db tables` — List tables
- [x] `gw db schema` — Show table schema
- [x] `gw db query` — Safe SQL queries
- [x] `gw tenant lookup` — Tenant lookup
- [x] `gw tenant stats` — Tenant statistics
- [x] `gw tenant list` — List tenants

### Phase 3 (Next)
- [ ] `gw secret` — Agent-safe secrets management
- [ ] `gw cache` — Cache operations

### Phase 4+
- [ ] `gw kv`, `gw r2`, `gw do` — Full Cloudflare bindings
- [ ] `gw mcp serve` — MCP server for Claude Code
- [ ] Shell completions

## Related

- **Spec:** `docs/specs/gw-cli-spec.md`
- **Issue:** [#348](https://github.com/AutumnsGrove/GroveEngine/issues/348)
- **TypeScript safety layer:** `packages/engine/src/lib/server/services/database-safety.ts`

---

*The best CLI is the one you don't have to think about. Just type `gw` and go.* 🌿
