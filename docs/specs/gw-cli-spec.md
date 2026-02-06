---
aliases: []
date created: Sunday, February 2nd 2026
date modified: Sunday, February 2nd 2026
lastUpdated: 2026-02-02
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

> *A friendly fence around Wrangler's garden. Safe enough for agents, fast enough for humans.*

**Public Name:** Grove Wrap (gw)
**Internal Name:** GroveWrap
**Package:** `tools/gw/` (Python + UV)
**Issue:** [#348](https://github.com/AutumnsGrove/GroveEngine/issues/348)
**Last Updated:** February 2026

Grove Wrap (`gw`) is a CLI abstraction over Wrangler that provides:
- **Safety guards** for database operations (read-only by default)
- **Grove-aware shortcuts** (knows database IDs, table names, common queries)
- **Agent integration** (MCP server mode for Claude Code)
- **Cache management** (the most-requested feature)
- **Human-friendly output** (Rich terminal UI)

This tool exists because fighting Wrangler is a daily occurrence. 116 `wrangler d1 execute` calls in our conversation history. Memorizing UUIDs. Getting column names wrong. Accidentally running DELETEs. This ends now.

---

## Goals

1. **Never type a database UUID again** - `gw` knows them all
2. **Read-only by default** - Write operations require explicit `--write` flag
3. **Agent-safe** - Can be auto-approved in Claude Code without fear
4. **Fast iteration** - Common operations as one-liners
5. **Cache busting** - Finally solve issue #527 from the CLI
6. **Extensible** - Add new commands without Wrangler's complexity

## Non-Goals

- Replacing Wrangler entirely (we still need it for deployments)
- Supporting non-Grove Cloudflare accounts
- Being a general-purpose database tool

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                      gw CLI                                          │
│                                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   gw db     │  │   gw kv     │  │   gw r2     │  │  gw cache   │                 │
│  │             │  │             │  │             │  │             │                 │
│  │ • query     │  │ • get       │  │ • list      │  │ • list      │                 │
│  │ • tables    │  │ • put       │  │ • get       │  │ • purge     │                 │
│  │ • schema    │  │ • delete    │  │ • put       │  │ • stats     │                 │
│  │ • tenant    │  │ • list      │  │ • delete    │  │             │                 │
│  │ • migrate   │  │             │  │             │  │             │                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
│         │                │                │                │                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   gw git    │  │   gw gh     │  │   gw dev    │  │  gw test    │                 │
│  │             │  │             │  │             │  │             │                 │
│  │ • status    │  │ • pr        │  │ • start     │  │ • run       │                 │
│  │ • log       │  │ • issue     │  │ • stop      │  │ • watch     │                 │
│  │ • commit    │  │ • run       │  │ • restart   │  │ • coverage  │                 │
│  │ • push      │  │ • project   │  │ • logs      │  │             │                 │
│  │ • save      │  │ • api       │  │             │  │             │                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
│         │                │                │                │                        │
│         └────────────────┴────────────────┴────────────────┘                        │
│                                      │                                              │
│                    ┌─────────────────┴─────────────────┐                            │
│                    │          Safety Layer             │                            │
│                    │  • Read-only default              │                            │
│                    │  • Row limits on DELETE           │                            │
│                    │  • Protected tables               │                            │
│                    │  • Git force-push protection      │                            │
│                    │  • GitHub rate limit awareness    │                            │
│                    │  • Audit logging                  │                            │
│                    └─────────────────┬─────────────────┘                            │
│                                      │                                              │
└──────────────────────────────────────┼──────────────────────────────────────────────┘
                                       │
                           ┌───────────┼───────────┐
                           ▼           ▼           ▼
            ┌──────────────────┐ ┌──────────┐ ┌──────────┐
            │   Wrangler CLI   │ │   git    │ │    gh    │
            │   (subprocess)   │ │  (exec)  │ │  (exec)  │
            └──────────────────┘ └──────────┘ └──────────┘
```

---

## Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | Python 3.11+ | Rich terminal UI, fast iteration with UV |
| Package Manager | UV | Already used in Grove, instant startup |
| CLI Framework | Click | Battle-tested, good for subcommands |
| Terminal UI | Rich | Tables, panels, progress bars |
| Config | TOML | Matches wrangler.toml pattern |
| Wrangler Integration | Subprocess | Wraps existing commands |

---

## Command Reference

### Database Commands (`gw db`)

The most-used commands based on our usage analysis.

```bash
# List all databases (no more wrangler d1 list)
gw db list

# Query the main database (read-only by default)
gw db query "SELECT * FROM tenants WHERE subdomain = 'autumn'"

# Query with a named database alias
gw db query --db lattice "SELECT * FROM feature_flags"

# Show tables in a database
gw db tables
gw db tables --db groveauth

# Show schema for a table
gw db schema tenants
gw db schema --db lattice posts

# Get tenant info (common operation)
gw db tenant autumn           # By subdomain
gw db tenant --email user@example.com

# Run migrations
gw db migrate --file migrations/042_new_table.sql
gw db migrate --file migrations/042_new_table.sql --write  # Actually apply
```

### Write Operations (Require `--write` flag)

```bash
# DELETE with safety checks
gw db query --write "DELETE FROM sessions WHERE tenant_id = 'abc'"

# INSERT/UPDATE
gw db query --write "UPDATE tenants SET plan = 'oak' WHERE id = 'abc'"

# Bypass row limit (dangerous, requires confirmation)
gw db query --write --no-limit "DELETE FROM old_logs WHERE created_at < '2025-01-01'"
```

### Cache Commands (`gw cache`) — Issue #527

```bash
# List cached keys for a tenant
gw cache list autumn

# List all cache keys (paginated)
gw cache list --all

# Purge specific key
gw cache purge "cache:autumn:homepage"

# Purge all keys for a tenant
gw cache purge --tenant autumn

# Purge CDN edge cache (Cloudflare API)
gw cache purge --cdn autumn.grove.place
gw cache purge --cdn --all  # Full zone purge (requires confirmation)

# Show cache stats
gw cache stats
```

### KV Commands (`gw kv`)

```bash
# List keys in a namespace
gw kv list              # Default: CACHE_KV
gw kv list --ns FLAGS_KV

# Get a value
gw kv get "config:autumn"

# Set a value (requires --write)
gw kv put --write "config:autumn" '{"theme": "dark"}'

# Delete a key (requires --write)
gw kv delete --write "config:autumn"
```

### R2 Commands (`gw r2`)

```bash
# List buckets
gw r2 list

# List objects in a bucket
gw r2 ls grove-media
gw r2 ls grove-media --prefix "autumn/"

# Get object info
gw r2 info grove-media autumn/avatar.png

# Download object
gw r2 get grove-media autumn/avatar.png ./avatar.png

# Upload object (requires --write)
gw r2 put --write grove-media autumn/new-image.png ./local.png

# Delete object (requires --write)
gw r2 rm --write grove-media autumn/old-image.png
```

### Durable Objects Commands (`gw do`)

```bash
# List Durable Objects classes
gw do list

# Get DO status/info
gw do info TenantDO
gw do info PostMetaDO

# List active instances
gw do instances TenantDO
gw do instances TenantDO --limit 10

# Wake/ping a specific DO
gw do ping TenantDO autumn

# List alarms (scheduled work)
gw do alarms TenantDO

# Delete DO storage (dangerous! requires --write --force)
gw do reset --write --force TenantDO autumn
```

### Secrets Management (`gw secret`) — Agent-Safe!

This is the **killer feature** for agent safety. Secrets are stored in a local vault
and can be applied to Wrangler without the agent ever seeing the actual value.

```bash
# === HUMAN-ONLY COMMANDS (require interactive input) ===

# Set a secret (prompts for value, NEVER echoes it)
gw secret set TAVILI_API_KEY
# > Enter value for TAVILI_API_KEY: ********
# > ✓ Secret stored in ~/.grove/secrets.enc

# Set from stdin (for scripts)
echo "sk_live_xxx" | gw secret set STRIPE_SECRET_KEY

# List secret NAMES (never values)
gw secret list
# > TAVILI_API_KEY      (set 2026-02-01)
# > STRIPE_SECRET_KEY   (set 2026-01-15)
# > RESEND_API_KEY      (set 2026-01-10)

# Delete a secret
gw secret delete TAVILI_API_KEY


# === AGENT-SAFE COMMANDS (can be auto-approved) ===

# Apply a secret to a worker (agent never sees the value!)
gw secret apply TAVILI_API_KEY --worker grove-lattice
# > ✓ Applied TAVILI_API_KEY to grove-lattice

# Apply multiple secrets
gw secret apply STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET --worker grove-lattice

# Check if a secret exists (returns exit code, no value exposure)
gw secret exists TAVILI_API_KEY
# > ✓ Secret exists

# Sync all secrets to a worker
gw secret sync --worker grove-lattice
# > Syncing 5 secrets to grove-lattice...
# > ✓ TAVILI_API_KEY
# > ✓ STRIPE_SECRET_KEY
# > ✓ RESEND_API_KEY
# > ...
```

**Security Model:**
- Secrets stored encrypted at `~/.grove/secrets.enc`
- Master key derived from system keychain (macOS) or password
- Agent commands NEVER return secret values in output
- Even `gw secret list` only shows names, not values
- Audit log tracks all secret applications

### Deployment Helpers (`gw deploy`)

```bash
# Deploy a specific package
gw deploy engine
gw deploy landing
gw deploy router

# Deploy with preview (dry run)
gw deploy engine --preview

# Deploy all packages
gw deploy --all

# Deploy with specific options
gw deploy engine --message "Fix auth bug"

# Tail logs after deploy
gw deploy engine --tail

# Quick rollback (deploys previous version)
gw deploy engine --rollback
```

### Logs Commands (`gw logs`)

```bash
# Tail logs from a worker
gw logs engine
gw logs engine --follow          # Live tail
gw logs engine --since 1h        # Last hour
gw logs engine --filter error    # Only errors

# Tail multiple workers
gw logs engine router

# JSON output for parsing
gw logs engine --json
```

### Backup Commands (`gw backup`)

```bash
# List existing backups
gw backup list
gw backup list --db lattice

# Create a backup
gw backup create lattice
gw backup create lattice --name "pre-migration-2026-02"
# > ✓ Backup saved to ~/.grove/backups/lattice-2026-02-02-1200.sql

# Restore from backup (requires --write)
gw backup restore --write lattice backup-2026-02-01.sql
gw backup restore --write lattice --latest  # Most recent backup

# Export to file
gw backup export lattice ./my-backup.sql
```

### Feature Flags Commands (`gw flag`)

```bash
# List all flags
gw flag list
gw flag list --tenant autumn

# Get flag status
gw flag get gallery_v2
gw flag get gallery_v2 --tenant autumn

# Enable/disable a flag (requires --write)
gw flag enable --write gallery_v2
gw flag enable --write gallery_v2 --tenant autumn
gw flag disable --write timeline_ai

# Check flag rules
gw flag rules gallery_v2

# Quick toggle (enable if disabled, disable if enabled)
gw flag toggle --write gallery_v2
```

### Health Check Commands (`gw health`)

```bash
# Check all services
gw health
# ┌────────────────┬────────┬──────────┐
# │ Service        │ Status │ Latency  │
# ├────────────────┼────────┼──────────┤
# │ Engine         │ ✓ OK   │ 145ms    │
# │ Router         │ ✓ OK   │ 89ms     │
# │ Heartwood      │ ✓ OK   │ 112ms    │
# │ Meadow         │ ✓ OK   │ 203ms    │
# │ Clearing       │ ✓ OK   │ 156ms    │
# │ CDN            │ ✓ OK   │ 45ms     │
# └────────────────┴────────┴──────────┘

# Check specific service
gw health engine
gw health --deep  # Full health checks (slower, more thorough)

# JSON output for monitoring
gw health --json
```

### Tenant Commands (`gw tenant`)

These commands wrap the logic from the `grove-account-deletion` skill and make it CLI-accessible.

```bash
# Look up tenant info
gw tenant autumn                      # By subdomain
gw tenant --email user@example.com    # By email
gw tenant --id abc-123                # By ID

# Get tenant stats
gw tenant stats autumn
# > Tenant: autumn (autumn.grove.place)
# > Plan: oak
# > Created: 2025-11-24
# > ───────────────────────
# > Posts: 47
# > Pages: 12
# > Media: 234 files (1.2 GB)
# > Sessions: 3 active
# > ───────────────────────
# > Storage used: 1.45 GB of 20 GB

# Create a new tenant (interactive wizard)
gw tenant create
# > Subdomain: newblog
# > Display name: My New Blog
# > Email: user@example.com
# > Plan [seedling/sapling/oak/evergreen]: sapling
# > ✓ Created tenant newblog (id: xxx-xxx)

# Delete a tenant (DANGEROUS - requires --write --force)
gw tenant delete --write --force autumn
# > ⚠️  This will DELETE all data for tenant 'autumn':
# >    - 47 posts
# >    - 12 pages
# >    - 234 media files
# >    - 3 sessions
# >    - All settings, products, orders, subscriptions
# >
# > Type 'DELETE autumn' to confirm: DELETE autumn
# > ✓ Tenant deleted

# Preview deletion (no --write, shows what would be deleted)
gw tenant delete autumn
# > Would delete: 47 posts, 12 pages, 234 media files...
```

### Email Test Commands (`gw email`)

```bash
# Send a test email
gw email test user@example.com
# > ✓ Test email sent to user@example.com via Resend

# Send with specific template
gw email test user@example.com --template welcome
gw email test user@example.com --template password-reset

# Check email config
gw email status
# > Resend API: ✓ Configured
# > Domain: grove.place (verified)
# > Sending from: noreply@grove.place
```

### Heartwood Auth Client Commands (`gw auth client`)

Register and manage OAuth clients with Heartwood. This automates the painful manual process
from the `grove-auth-integration` skill.

```bash
# === CLIENT REGISTRATION ===

# Create a new OAuth client (interactive wizard)
gw auth client create grove-plant
# > Display Name: Grove Plant
# > Production URL: https://plant.grove.place
# > Callback Path [/auth/callback]: /auth/callback
# > Include localhost? [Y/n]: Y
# >
# > Generating client secret...
# > ✓ Client secret generated (stored in vault)
# > ✓ Base64url hash computed
# > ✓ Client registered in Heartwood DB
# >
# > Client ID: grove-plant
# > Redirect URIs:
# >   - https://plant.grove.place/auth/callback
# >   - http://localhost:5173/auth/callback
# >
# > Next steps:
# >   gw secret apply GROVEAUTH_CLIENT_SECRET --worker grove-plant

# Create with all options specified (non-interactive)
gw auth client create arbor-admin \
  --name "Arbor Admin Panel" \
  --url "https://arbor.grove.place" \
  --callback "/auth/callback" \
  --localhost

# === CLIENT MANAGEMENT ===

# List all registered clients
gw auth client list
# ┌──────────────────┬────────────────────────┬─────────────────────────────────────────┐
# │ Client ID        │ Name                   │ Redirect URIs                           │
# ├──────────────────┼────────────────────────┼─────────────────────────────────────────┤
# │ grove-lattice    │ Grove Engine           │ https://grove.place/auth/callback, ...  │
# │ grove-plant      │ Grove Plant            │ https://plant.grove.place/auth/callback │
# │ arbor-admin      │ Arbor Admin Panel      │ https://arbor.grove.place/auth/callback │
# │ grove-domains    │ Domain Search          │ https://domains.grove.place/auth/callb  │
# └──────────────────┴────────────────────────┴─────────────────────────────────────────┘

# Get details for a specific client
gw auth client info grove-plant

# === SECRET ROTATION ===

# Rotate client secret (generates new secret, updates DB)
gw auth client rotate grove-plant
# > ⚠️  This will invalidate the current secret!
# > Proceed? [y/N]: y
# >
# > ✓ New secret generated (stored in vault)
# > ✓ Heartwood DB updated
# >
# > Apply the new secret:
# >   gw secret apply GROVEAUTH_CLIENT_SECRET_GROVE_PLANT --worker grove-plant

# === CLIENT REMOVAL ===

# Delete a client (requires --write)
gw auth client delete --write grove-test
# > ✓ Client 'grove-test' removed from Heartwood

# === FULL SETUP HELPER ===

# Complete setup: create client + apply secrets to worker
gw auth client setup grove-plant --worker grove-plant
# > Creating client 'grove-plant'...
# > ✓ Client registered
# >
# > Applying secrets to worker 'grove-plant'...
# > ✓ GROVEAUTH_CLIENT_ID
# > ✓ GROVEAUTH_CLIENT_SECRET (from vault)
# > ✓ GROVEAUTH_REDIRECT_URI
# > ✓ GROVEAUTH_URL
# >
# > ✓ grove-plant is ready for Heartwood auth!
```

**Why this is a game-changer:**
- No more manual base64url hash generation (gets the encoding wrong 50% of the time)
- No more copy-pasting UUIDs
- No more forgetting localhost in redirect URIs
- Client secret goes straight to the vault (agent-safe!)
- One command to set up an entire auth flow

### Status & Info Commands

```bash
# Show Grove infrastructure status
gw status

# Show database info
gw info db
gw info db --db groveauth

# Show all bindings from wrangler.toml
gw bindings

# Check wrangler authentication
gw auth check
gw auth login  # Re-authenticate if needed
```

### Diagnostics (`gw doctor`)

Like `brew doctor` - diagnoses common issues and suggests fixes.

```bash
gw doctor
# ┌─────────────────────────────────────────────────────────────────┐
# │                     Grove Diagnostics                          │
# ├─────────────────────────────────────────────────────────────────┤
# │ ✓ Wrangler installed (v4.50.0)                                 │
# │ ✓ Wrangler authenticated                                       │
# │ ✓ Config file exists (~/.grove/gw.toml)                        │
# │ ✓ Secrets vault initialized                                    │
# │ ⚠ Wrangler update available (4.50.0 → 4.61.1)                  │
# │ ✓ grove-engine-db accessible                                   │
# │ ✓ groveauth accessible                                         │
# │ ✓ CACHE_KV accessible                                          │
# │ ✓ grove-media bucket accessible                                │
# │ ✓ CF_API_TOKEN set (for CDN purge)                             │
# ├─────────────────────────────────────────────────────────────────┤
# │ 1 warning                                                      │
# │                                                                 │
# │ To fix:                                                         │
# │   npm install -g wrangler@latest                               │
# └─────────────────────────────────────────────────────────────────┘

# Check specific subsystem
gw doctor db      # Database connectivity
gw doctor auth    # Wrangler + Heartwood auth
gw doctor secrets # Vault health
```

### Identity (`gw whoami`)

Show current context and authentication status.

```bash
gw whoami
# ┌─────────────────────────────────────────────────────────────────┐
# │ Cloudflare Account                                             │
# │   Email: autumn@autumnsgrove.com                               │
# │   Account ID: abc123...                                        │
# │   Account Name: Autumn's Grove                                 │
# ├─────────────────────────────────────────────────────────────────┤
# │ Current Project                                                │
# │   Directory: /Users/autumn/Documents/Projects/GroveEngine      │
# │   Wrangler Config: packages/engine/wrangler.toml               │
# │   Default DB: grove-engine-db                                  │
# ├─────────────────────────────────────────────────────────────────┤
# │ Secrets Vault                                                  │
# │   Location: ~/.grove/secrets.enc                               │
# │   Secrets stored: 12                                           │
# │   Last modified: 2026-02-01 14:30                              │
# └─────────────────────────────────────────────────────────────────┘
```

### Command History (`gw history`)

Show recent commands with timestamps for audit trail and easy re-run.

```bash
gw history
# ┌─────┬─────────────────────┬────────────────────────────────────────────┐
# │ ID  │ Timestamp           │ Command                                    │
# ├─────┼─────────────────────┼────────────────────────────────────────────┤
# │ 12  │ 2026-02-01 15:30:42 │ gw db query "SELECT * FROM tenants LIM... │
# │ 11  │ 2026-02-01 15:28:15 │ gw cache purge --tenant autumn            │
# │ 10  │ 2026-02-01 15:25:03 │ gw tenant stats autumn                    │
# │ 9   │ 2026-02-01 14:55:22 │ gw secret apply STRIPE_KEY --worker eng.. │
# │ 8   │ 2026-02-01 14:50:11 │ gw health                                 │
# └─────┴─────────────────────┴────────────────────────────────────────────┘

# Show last N commands
gw history --limit 5

# Show only write operations
gw history --writes

# Re-run a command by ID
gw history run 12

# Search history
gw history search "tenant"

# Clear history
gw history clear
```

### Shell Completions

Tab-complete everything: commands, database names, table names, tenant subdomains.

```bash
# Install completions (one-time setup)
gw completion install
# > Detected shell: zsh
# > Added completion to ~/.zshrc
# > Run 'source ~/.zshrc' or restart your shell

# Generate completion script manually
gw completion bash > /etc/bash_completion.d/gw
gw completion zsh > ~/.zfunc/_gw
gw completion fish > ~/.config/fish/completions/gw.fish

# What gets completed:
gw db <TAB>        → list, tables, schema, query, tenant, migrate
gw db --db <TAB>   → lattice, groveauth, clearing, amber, ...
gw db schema <TAB> → tenants, posts, pages, users, sessions, ...
gw tenant <TAB>    → autumn, mom, test-user, ...
gw cache purge --tenant <TAB> → autumn, mom, ...
gw secret apply <TAB> → STRIPE_KEY, RESEND_API_KEY, TAVILI_KEY, ...
```

---

### Git Commands (`gw git`)

```
┌─────────────────────────────────────────────────────────────────┐
│                    🌿  GIT INTEGRATION  🌿                       │
│                                                                 │
│   Safe defaults for agents. Conventional Commits by default.   │
│   Issue linking. Branch protection. Stash management.          │
│                                                                 │
│         ┌──────────┐    ┌──────────┐    ┌──────────┐           │
│         │  READ    │    │  WRITE   │    │ DANGER   │           │
│         │  (safe)  │    │  (--write)│   │ (--force)│           │
│         └────┬─────┘    └────┬─────┘    └────┬─────┘           │
│              │               │               │                  │
│         status          commit          force-push              │
│         log             push            reset --hard            │
│         diff            add             rebase                  │
│         blame           branch          merge                   │
│         show            stash                                   │
│                                                                 │
╰─────────────────────────────────────────────────────────────────╯
```

Grove-aware git operations with safety guards. Conventional Commits enforced by default.
Issue auto-linking for Grove repository conventions.

#### Read-Only Operations (Always Safe)

```bash
# Status with Rich formatting
gw git status
gw git status --short              # Compact output
gw git status --porcelain          # Machine-readable

# Log with Grove-aware formatting
gw git log                          # Last 10 commits, formatted
gw git log --limit 25               # More commits
gw git log --oneline                # Compact
gw git log --author autumn          # Filter by author
gw git log --since "3 days ago"     # Recent commits
gw git log --file src/routes/+page.svelte  # File history

# Diff operations
gw git diff                         # Unstaged changes
gw git diff --staged                # Staged changes
gw git diff main                    # Compare to branch
gw git diff HEAD~3                  # Last 3 commits
gw git diff --stat                  # Summary only

# Blame (who wrote this?)
gw git blame src/lib/auth.ts
gw git blame src/lib/auth.ts --line 50-75

# Show commit details
gw git show abc123
gw git show HEAD~2
gw git show abc123 --stat           # Just file changes
```

#### Write Operations (Require `--write`)

```bash
# === STAGING ===

# Add files (requires --write)
gw git add --write src/lib/auth.ts
gw git add --write .                # All changes (with confirmation)
gw git add --write --interactive    # Interactive staging

# Unstage
gw git unstage --write src/lib/auth.ts
gw git unstage --write --all


# === COMMITS ===

# Commit with Conventional Commits format (auto-enforced)
gw git commit --write -m "feat(auth): add OAuth2 PKCE flow"
gw git commit --write -m "fix(ui): correct button alignment on mobile"
gw git commit --write -m "docs: update API reference"

# Commit with issue linking (auto-detects from branch name)
gw git commit --write -m "feat(api): add rate limiting"
# > Detected branch: feature/348-rate-limiting
# > Auto-linking to #348
# > Commit message: feat(api): add rate limiting (#348)

# Commit with explicit issue
gw git commit --write -m "fix: resolve cache invalidation" --issue 527

# Interactive commit (prompts for type, scope, message)
gw git commit --write --interactive
# > Type: feat, fix, docs, style, refactor, test, chore
# > Scope (optional): auth
# > Message: add session refresh
# > Link issue? [#348]:
# >
# > ✓ Committed: feat(auth): add session refresh (#348)


# === PUSH ===

# Push to remote
gw git push --write
gw git push --write --set-upstream origin feature/new-thing

# Push with lease (safer than force)
gw git push --write --force-with-lease


# === BRANCHES ===

# Create and switch to branch
gw git branch --write feature/348-rate-limiting
gw git branch --write --from main feature/349-caching

# Delete branch (local only, safe)
gw git branch --write --delete feature/old-branch

# Switch branch (no --write needed, read-only operation)
gw git switch main
gw git switch feature/348-rate-limiting


# === STASH ===

# Save work in progress
gw git stash --write
gw git stash --write --message "WIP: auth flow"

# List stashes
gw git stash list

# Apply stash
gw git stash pop --write
gw git stash apply --write stash@{2}

# Drop stash
gw git stash drop --write stash@{0}
```

#### Dangerous Operations (Require `--write --force`)

These operations can destroy work. Blocked in agent mode entirely.

```bash
# Force push (DANGEROUS - rewrites remote history)
gw git push --write --force origin main
# > ⚠️  Force push to 'main' is BLOCKED
# > Protected branches cannot be force-pushed
# > Use a feature branch instead

gw git push --write --force origin feature/my-branch
# > ⚠️  Force push will overwrite remote history!
# > Remote has 3 commits not in local
# > Type 'FORCE PUSH feature/my-branch' to confirm:


# Reset (DANGEROUS - discards commits)
gw git reset --write --force --hard HEAD~3
# > ⚠️  This will DISCARD 3 commits:
# >   abc123 feat(auth): add session refresh
# >   def456 fix(ui): button alignment
# >   ghi789 docs: update readme
# > Type 'RESET HARD' to confirm:


# Rebase (DANGEROUS - rewrites history)
gw git rebase --write --force main
# > ⚠️  Rebasing rewrites commit history
# > 5 commits will be replayed
# > Type 'REBASE' to confirm:


# Merge (requires --write, not --force, but warns on conflicts)
gw git merge --write feature/other-branch
# > Merge would create conflicts in 3 files:
# >   - src/lib/auth.ts
# >   - src/routes/+page.svelte
# >   - package.json
# > Proceed anyway? [y/N]:
```

#### Grove Shortcuts

```bash
# Quick save: add all + commit with WIP message
gw git save --write
# > ✓ Staged 5 files
# > ✓ Committed: wip: work in progress (2026-02-02 15:30)

gw git save --write -m "checkpoint before refactor"


# Sync: fetch + rebase on main + push
gw git sync --write
# > Fetching from origin...
# > Rebasing on main...
# > Pushing to origin...
# > ✓ Branch is up to date with main


# WIP commit (doesn't trigger pre-commit hooks)
gw git wip --write
# > ✓ Committed: wip: 2026-02-02 15:30 [skip ci]


# Undo last commit (keeps changes staged)
gw git undo --write
# > ✓ Undid commit: feat(auth): add session refresh
# > Changes are staged, ready to recommit


# Amend last commit message
gw git amend --write -m "feat(auth): add OAuth2 session refresh"
```

#### Agent Mode Restrictions

```bash
# In agent mode (GW_AGENT_MODE=1), these are BLOCKED entirely:
# - gw git push --force
# - gw git reset --hard
# - gw git rebase
# - gw git merge (on protected branches)

# These require explicit --write but are allowed:
# - gw git commit
# - gw git push
# - gw git add
# - gw git stash
```

---

### GitHub Commands (`gw gh`)

```
┌─────────────────────────────────────────────────────────────────┐
│                    🌿  GITHUB INTEGRATION  🌿                    │
│                                                                 │
│     Pull requests. Issues. Workflows. Project boards.          │
│     Agent-safe by default. Rate-limit aware.                   │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │    PR    │  │  ISSUE   │  │   RUN    │  │ PROJECT  │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │               │
│    list          list          list          move               │
│    view          view          view          field              │
│    create        create        rerun         status             │
│    comment       comment       cancel                           │
│    merge         close                                          │
│                                                                 │
╰─────────────────────────────────────────────────────────────────╯
```

Wraps `gh` CLI with Grove-aware defaults. Knows the repo, project board field IDs,
and integrates with the badger-triage workflow.

#### Pull Request Commands (`gw gh pr`)

```bash
# === READ OPERATIONS (always safe) ===

# List open PRs
gw gh pr list
gw gh pr list --author @me
gw gh pr list --label bug
gw gh pr list --state merged --limit 20

# View PR details
gw gh pr view 123
gw gh pr view 123 --comments           # Include comments
gw gh pr view 123 --files              # Show changed files
gw gh pr view 123 --diff               # Show full diff

# Check PR status
gw gh pr status                        # Status of your PRs
gw gh pr checks 123                    # CI status for PR


# === WRITE OPERATIONS (require --write) ===

# Create a PR
gw gh pr create --write
# > Creating PR for branch: feature/348-rate-limiting
# >
# > Title: Add rate limiting to API
# > Base branch [main]:
# >
# > ## Summary
# > [cursor for description]
# >
# > ✓ Created PR #124: Add rate limiting to API

# Create with all options
gw gh pr create --write \
  --title "feat(api): add rate limiting" \
  --body "Implements #348" \
  --label enhancement \
  --assignee @me \
  --reviewer team-grove

# Create from template
gw gh pr create --write --template feature

# Add comment to PR
gw gh pr comment --write 123 --body "LGTM! Ready for merge."
gw gh pr comment --write 123 --body-file review-notes.md

# Request review
gw gh pr review --write 123 --request @autumn

# Approve PR
gw gh pr review --write 123 --approve
gw gh pr review --write 123 --approve --body "Looks great!"

# Request changes
gw gh pr review --write 123 --request-changes --body "See inline comments"

# Edit PR
gw gh pr edit --write 123 --title "New title"
gw gh pr edit --write 123 --add-label priority:high
gw gh pr edit --write 123 --remove-label wip

# Merge PR (requires checks to pass)
gw gh pr merge --write 123
gw gh pr merge --write 123 --squash
gw gh pr merge --write 123 --rebase
gw gh pr merge --write 123 --auto         # Merge when checks pass

# Close without merging
gw gh pr close --write 123
gw gh pr close --write 123 --comment "Superseded by #125"
```

#### Issue Commands (`gw gh issue`)

```bash
# === READ OPERATIONS ===

# List issues
gw gh issue list
gw gh issue list --label bug
gw gh issue list --assignee @me
gw gh issue list --milestone "February 2026"
gw gh issue list --state closed --since "2026-01-01"

# View issue
gw gh issue view 348
gw gh issue view 348 --comments

# Search issues
gw gh issue search "cache invalidation"
gw gh issue search "label:bug label:priority:high"


# === WRITE OPERATIONS ===

# Create issue
gw gh issue create --write \
  --title "Cache not invalidating on tenant update" \
  --body "When a tenant updates their settings..."

# Create with labels and assignment
gw gh issue create --write \
  --title "Add dark mode support" \
  --label enhancement \
  --label "priority:medium" \
  --assignee @me \
  --milestone "March 2026"

# Create from template
gw gh issue create --write --template bug_report

# Add comment
gw gh issue comment --write 348 --body "Reproduced on staging. Investigating..."

# Edit issue
gw gh issue edit --write 348 --add-label "in-progress"
gw gh issue edit --write 348 --assignee @autumn
gw gh issue edit --write 348 --milestone "February 2026"

# Close issue
gw gh issue close --write 348
gw gh issue close --write 348 --reason completed
gw gh issue close --write 348 --comment "Fixed in #124"

# Reopen issue
gw gh issue reopen --write 348
```

#### Workflow Run Commands (`gw gh run`)

```bash
# === READ OPERATIONS ===

# List recent runs
gw gh run list
gw gh run list --workflow ci.yml
gw gh run list --branch main --limit 10
gw gh run list --status failure

# View run details
gw gh run view 12345678
gw gh run view 12345678 --log              # Full logs
gw gh run view 12345678 --log-failed       # Only failed job logs

# Watch a run in progress
gw gh run watch 12345678


# === WRITE OPERATIONS ===

# Rerun failed jobs
gw gh run rerun --write 12345678
gw gh run rerun --write 12345678 --failed  # Only failed jobs

# Cancel a run
gw gh run cancel --write 12345678

# Trigger a workflow manually
gw gh workflow run --write ci.yml
gw gh workflow run --write ci.yml --ref feature/my-branch
gw gh workflow run --write deploy.yml -f environment=staging
```

#### Project Board Commands (`gw gh project`)

Integration with GitHub Projects for the badger-triage workflow.
These commands know the Grove project board field IDs.

```bash
# === READ OPERATIONS ===

# List project items
gw gh project list
gw gh project list --status "In Progress"
gw gh project list --assignee @me

# View item details
gw gh project view 348                     # By issue number
gw gh project view --item PVTI_xxx         # By project item ID


# === WRITE OPERATIONS (for badger-triage) ===

# Move item to different status
gw gh project move --write 348 --status "In Progress"
gw gh project move --write 348 --status "Done"
gw gh project move --write 348 --status "Backlog"

# Set custom fields (knows Grove field IDs)
gw gh project field --write 348 --size "M"
gw gh project field --write 348 --priority "High"
gw gh project field --write 348 --sprint "February Week 1"

# Bulk operations (common in triage)
gw gh project bulk --write \
  --issues 348,349,350 \
  --status "Ready" \
  --priority "Medium"

# Add issue to project
gw gh project add --write 348

# Remove from project
gw gh project remove --write 348
```

#### Raw API Access (`gw gh api`)

For advanced operations not covered by specific commands.
Uses tiered safety based on HTTP method.

```bash
# === GET requests (always safe) ===
gw gh api repos/AutumnsGrove/GroveEngine
gw gh api repos/AutumnsGrove/GroveEngine/contributors
gw gh api user

# === POST/PATCH/DELETE (require --write) ===
gw gh api --write repos/AutumnsGrove/GroveEngine/labels \
  -f name="priority:critical" \
  -f color="FF0000"

gw gh api --write repos/AutumnsGrove/GroveEngine/issues/348/labels \
  --method POST \
  -f labels[]="in-progress"

# === Dangerous mutations (require --write --force) ===
# DELETE operations on non-trivial resources
gw gh api --write --force repos/AutumnsGrove/GroveEngine/labels/old-label \
  --method DELETE
```

#### Rate Limit Awareness

```bash
# Check rate limit status
gw gh rate-limit
# ┌──────────────────┬───────┬───────────┬─────────────────────┐
# │ Resource         │ Used  │ Remaining │ Resets              │
# ├──────────────────┼───────┼───────────┼─────────────────────┤
# │ Core             │ 847   │ 4153      │ 2026-02-02 16:00:00 │
# │ Search           │ 12    │ 18        │ 2026-02-02 15:31:00 │
# │ GraphQL          │ 234   │ 4766      │ 2026-02-02 16:00:00 │
# └──────────────────┴───────┴───────────┴─────────────────────┘

# In agent mode, operations are throttled when approaching limits
# Commands will warn or wait when < 100 requests remaining
```

---

### Development Commands (`gw dev`, `gw test`, `gw build`, `gw check`, `gw ci`)

```
┌─────────────────────────────────────────────────────────────────┐
│                    🌿  DEV TOOLS  🌿                             │
│                                                                 │
│     Monorepo-aware development. Package-scoped commands.       │
│     CI parity. One command to rule them all.                   │
│                                                                 │
│         packages/                                               │
│         ├── engine/     →  gw dev engine                        │
│         ├── landing/    →  gw test landing                      │
│         ├── router/     →  gw build router                      │
│         └── greenhouse/ →  gw check greenhouse                  │
│                                                                 │
╰─────────────────────────────────────────────────────────────────╯
```

Monorepo-aware development commands. Automatically detects package context
from current directory or accepts explicit package names.

#### Dev Server Commands (`gw dev`)

```bash
# Start dev server for current package (auto-detected)
gw dev
# > Detected package: engine (from cwd)
# > Starting wrangler dev...
# > ✓ Server running at http://localhost:8787

# Start specific package
gw dev engine
gw dev landing
gw dev router

# Start with options
gw dev engine --port 8080
gw dev engine --local                  # Local mode (no Cloudflare)
gw dev engine --remote                 # Remote mode (uses Cloudflare)
gw dev engine --persist                # Persist D1/KV/R2 data

# Start multiple packages (separate terminals)
gw dev engine landing
# > Starting engine on :8787
# > Starting landing on :5173

# Stop dev servers
gw dev stop
gw dev stop engine

# Restart (stop + start)
gw dev restart engine

# View dev server logs
gw dev logs engine
gw dev logs engine --follow

# List running dev servers
gw dev status
# ┌──────────────┬──────────┬─────────┬────────────────────┐
# │ Package      │ Port     │ PID     │ Uptime             │
# ├──────────────┼──────────┼─────────┼────────────────────┤
# │ engine       │ 8787     │ 12345   │ 2h 15m             │
# │ landing      │ 5173     │ 12346   │ 45m                │
# └──────────────┴──────────┴─────────┴────────────────────┘
```

#### Test Commands (`gw test`)

```bash
# Run tests for current package
gw test
# > Detected package: engine
# > Running: vitest run

# Run tests for specific package
gw test engine
gw test landing
gw test greenhouse

# Run all tests (entire monorepo)
gw test --all
gw test --all --parallel              # Parallel execution

# Test options
gw test engine --watch                # Watch mode
gw test engine --coverage             # With coverage
gw test engine --ui                   # Vitest UI
gw test engine --update               # Update snapshots

# Filter tests
gw test engine --filter "auth"        # Run tests matching "auth"
gw test engine --file "auth.test.ts"  # Specific file

# Run a single test file
gw test engine src/lib/auth.test.ts

# Verbose output
gw test engine --verbose

# CI mode (stricter, no watch)
gw test engine --ci
```

#### Build Commands (`gw build`)

```bash
# Build current package
gw build
# > Detected package: engine
# > Running: wrangler deploy --dry-run

# Build specific package
gw build engine
gw build landing
gw build greenhouse

# Build all packages
gw build --all
gw build --all --parallel

# Build options
gw build engine --minify              # Minified output
gw build engine --sourcemap           # Include source maps
gw build engine --analyze             # Bundle analysis

# Build for specific environment
gw build engine --env production
gw build engine --env staging

# Clean build (removes previous artifacts)
gw build engine --clean

# Show build output without building
gw build engine --dry-run
```

#### Type Check Commands (`gw check`)

```bash
# Type check current package
gw check
# > Detected package: engine
# > Running: tsc --noEmit

# Check specific package
gw check engine
gw check landing
gw check greenhouse

# Check all packages
gw check --all

# Check with options
gw check engine --watch               # Watch mode
gw check engine --strict              # Extra strict

# Check and show stats
gw check engine --stats
# > Files checked: 147
# > Time: 2.3s
# > ✓ No type errors

# Svelte-specific check
gw check greenhouse --svelte          # svelte-check
```

#### Lint Commands (`gw lint`)

```bash
# Lint current package
gw lint
# > Detected package: engine
# > Running: eslint .

# Lint specific package
gw lint engine
gw lint landing

# Lint all packages
gw lint --all

# Lint with auto-fix
gw lint engine --fix

# Lint specific files
gw lint src/lib/auth.ts

# Format check (prettier)
gw lint engine --format
gw lint engine --format --fix
```

#### CI Parity Commands (`gw ci`)

Run exactly what CI runs, locally. No more "works on my machine."

```bash
# Run full CI pipeline locally
gw ci
# ┌─────────────────────────────────────────────────────────────────┐
# │                     Running CI Pipeline                         │
# ├─────────────────────────────────────────────────────────────────┤
# │ ▶ Checking dependencies...                              [done]  │
# │ ▶ Type checking all packages...                         [done]  │
# │ ▶ Linting all packages...                               [done]  │
# │ ▶ Running tests (engine)...                             [done]  │
# │ ▶ Running tests (landing)...                            [done]  │
# │ ▶ Running tests (greenhouse)...                         [done]  │
# │ ▶ Building all packages...                              [done]  │
# ├─────────────────────────────────────────────────────────────────┤
# │ ✓ CI pipeline passed (2m 34s)                                   │
# └─────────────────────────────────────────────────────────────────┘

# Run specific CI jobs
gw ci lint                            # Just linting
gw ci test                            # Just tests
gw ci build                           # Just build
gw ci typecheck                       # Just types

# Run CI for specific package
gw ci engine

# Show what CI would run (dry run)
gw ci --dry-run

# Match CI environment exactly
gw ci --strict                        # Fail on warnings too

# Continue on error (see all failures)
gw ci --continue-on-error
```

#### Package Context Detection

```bash
# gw automatically detects package from current directory:

cd packages/engine
gw test                               # Runs engine tests

cd packages/landing
gw dev                                # Starts landing dev server

cd packages/greenhouse/src/lib
gw check                              # Checks greenhouse types

# Or specify explicitly from anywhere:
gw test engine
gw dev landing
gw check greenhouse

# Use package aliases from config:
gw test eng                           # Alias for engine
gw dev land                           # Alias for landing
```

---

## Configuration

### Database Aliases (`~/.grove/gw.toml`)

```toml
[databases]
# Default database for `gw db` commands
default = "grove-engine-db"

# Named aliases (no more UUIDs!)
[databases.lattice]
name = "grove-engine-db"
id = "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68"

[databases.groveauth]
name = "groveauth"
id = "45eae4c7-8ae7-4078-9218-8e1677a4360f"

[databases.clearing]
name = "daily-clearing-db"
id = "1fb94ac6-53c6-49d6-9388-a6f585f86196"

[databases.amber]
name = "amber"
id = "f688021b-a986-495a-94bb-352354768a22"

[kv_namespaces]
default = "CACHE_KV"

[kv_namespaces.cache]
title = "CACHE_KV"
id = "514e91e81cc44d128a82ec6f668303e4"

[kv_namespaces.flags]
title = "FLAGS_KV"
id = "65a600876aa14e9cbec8f8acd7d53b5f"

[r2_buckets]
default = "grove-media"

[safety]
# Default safety settings
max_delete_rows = 100
max_update_rows = 500
protected_tables = ["users", "tenants", "subscriptions", "payments"]

[cache]
# Cloudflare API for CDN purge
zone_id = "your-zone-id"  # Set via: gw config set cache.zone_id VALUE


# ─────────────────────────────────────────────────────────────────
#                    GIT & GITHUB CONFIGURATION
# ─────────────────────────────────────────────────────────────────

[git]
# Default commit format (conventional commits)
commit_format = "conventional"  # conventional, simple, or custom
conventional_types = ["feat", "fix", "docs", "style", "refactor", "test", "chore", "perf", "ci"]
default_scope = ""              # Optional default scope

# Protected branches (cannot force-push or reset)
protected_branches = ["main", "production", "staging"]

# Auto-link issues from branch names (feature/348-description → #348)
auto_link_issues = true
issue_pattern = "(?:^|/)(?P<num>\\d+)[-_]"  # Regex to extract issue number

# Pre-commit behavior
skip_hooks_on_wip = true        # --no-verify for wip commits


[github]
# Repository context (auto-detected, but can override)
owner = "AutumnsGrove"
repo = "GroveEngine"

# Default labels to apply
default_pr_labels = []
default_issue_labels = []

# Project board configuration (for badger-triage)
project_number = 1              # GitHub project number
[github.project_fields]
# Field IDs for the Grove project board (find via: gh api graphql)
status = "PVTSSF_xxx"           # Status field ID
priority = "PVTSSF_yyy"         # Priority field ID
size = "PVTSSF_zzz"             # Size field ID
sprint = "PVTSSF_aaa"           # Sprint field ID

[github.project_values]
# Status field option IDs
status_backlog = "bbb"
status_ready = "ccc"
status_in_progress = "ddd"
status_in_review = "eee"
status_done = "fff"

# Priority field option IDs
priority_critical = "ggg"
priority_high = "hhh"
priority_medium = "iii"
priority_low = "jjj"

# Size field option IDs
size_xs = "kkk"
size_s = "lll"
size_m = "mmm"
size_l = "nnn"
size_xl = "ooo"


# ─────────────────────────────────────────────────────────────────
#                    MONOREPO & DEV CONFIGURATION
# ─────────────────────────────────────────────────────────────────

[packages]
# Default package when not in a package directory
default = "engine"

# Package root directory
root = "packages"

# Package aliases for quick access
[packages.aliases]
eng = "engine"
land = "landing"
route = "router"
green = "greenhouse"
heart = "heartwood"
clear = "clearing"
amber = "amber"

# Package-specific settings
[packages.engine]
path = "packages/engine"
dev_port = 8787
dev_command = "wrangler dev"
test_command = "vitest run"
build_command = "wrangler deploy --dry-run"
type_check_command = "tsc --noEmit"

[packages.landing]
path = "packages/landing"
dev_port = 5173
dev_command = "npm run dev"
test_command = "vitest run"
build_command = "npm run build"
type_check_command = "svelte-check"

[packages.greenhouse]
path = "packages/greenhouse"
dev_port = 5174
dev_command = "npm run dev"
test_command = "vitest run"
build_command = "npm run build"
type_check_command = "svelte-check"


[dev]
# Runtime preferences
preferred_runtime = "wrangler"  # wrangler, node, bun

# Port allocation strategy
port_allocation = "sequential"  # sequential, random, fixed
base_port = 8787

# Persist local data between dev sessions
persist_data = true
persist_path = ".wrangler/state"

# Auto-open browser on dev start
auto_open = false

# Log level for dev servers
log_level = "info"              # debug, info, warn, error


[ci]
# Commands to run in CI pipeline (in order)
pipeline = [
    "typecheck",
    "lint",
    "test",
    "build"
]

# Packages to include in CI (empty = all)
packages = []

# Fail on warnings
strict = false

# Continue even if a step fails
continue_on_error = false
```

### Protected Tables

These tables cannot be modified without explicit `--force` flag:

| Table | Reason |
|-------|--------|
| `tenants` | Core identity data |
| `users` | User accounts |
| `subscriptions` | Billing data |
| `payments` | Financial records |
| `sessions` | Auth state (use Heartwood) |

---

## Safety Model

### Read-Only by Default

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
│  │ Protected     │──────────▶ │ Require --force │              │
│  │ table?        │            └─────────────────┘              │
│  └───────┬───────┘                                              │
│          │ NO                                                   │
│          ▼                                                      │
│  ┌───────────────┐     YES    ┌─────────────────┐              │
│  │ Row limit     │──────────▶ │ Block + show    │              │
│  │ exceeded?     │            │ affected count  │              │
│  └───────┬───────┘            └─────────────────┘              │
│          │ NO                                                   │
│          ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ Execute + log   │                                            │
│  └─────────────────┘                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Git Safety Tiers

```
┌─────────────────────────────────────────────────────────────────┐
│                    GIT COMMAND SAFETY TIERS                     │
│                                                                 │
│  ╔═══════════════════════════════════════════════════════════╗  │
│  ║  TIER 1: READ-ONLY (Always Safe)                          ║  │
│  ║  ─────────────────────────────────────────────────────────║  │
│  ║  status, log, diff, blame, show, branch --list            ║  │
│  ║                                                           ║  │
│  ║  • No --write required                                    ║  │
│  ║  • Safe for agent auto-approval                           ║  │
│  ║  • No confirmation prompts                                ║  │
│  ╚═══════════════════════════════════════════════════════════╝  │
│                          │                                      │
│                          ▼                                      │
│  ╔═══════════════════════════════════════════════════════════╗  │
│  ║  TIER 2: SAFE WRITES (Require --write)                    ║  │
│  ║  ─────────────────────────────────────────────────────────║  │
│  ║  add, commit, push, branch, stash, switch                 ║  │
│  ║                                                           ║  │
│  ║  • Require --write flag                                   ║  │
│  ║  • Allowed in agent mode with explicit flag               ║  │
│  ║  • Logged to audit trail                                  ║  │
│  ╚═══════════════════════════════════════════════════════════╝  │
│                          │                                      │
│                          ▼                                      │
│  ╔═══════════════════════════════════════════════════════════╗  │
│  ║  TIER 3: DANGEROUS (Require --write --force)              ║  │
│  ║  ─────────────────────────────────────────────────────────║  │
│  ║  force-push, reset --hard, rebase, clean -f               ║  │
│  ║                                                           ║  │
│  ║  • Require both --write and --force                       ║  │
│  ║  • Interactive confirmation required                      ║  │
│  ║  • BLOCKED in agent mode entirely                         ║  │
│  ╚═══════════════════════════════════════════════════════════╝  │
│                          │                                      │
│                          ▼                                      │
│  ╔═══════════════════════════════════════════════════════════╗  │
│  ║  TIER 4: PROTECTED BRANCHES (Never Allowed)               ║  │
│  ║  ─────────────────────────────────────────────────────────║  │
│  ║  Force-push to: main, production, staging                 ║  │
│  ║                                                           ║  │
│  ║  • Always blocked, even with --force                      ║  │
│  ║  • Suggests creating a feature branch instead             ║  │
│  ║  • Cannot be overridden                                   ║  │
│  ╚═══════════════════════════════════════════════════════════╝  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### GitHub Safety Tiers

```
┌─────────────────────────────────────────────────────────────────┐
│                  GITHUB COMMAND SAFETY TIERS                    │
│                                                                 │
│  ╔═══════════════════════════════════════════════════════════╗  │
│  ║  TIER 1: READ-ONLY (Always Safe)                          ║  │
│  ║  ─────────────────────────────────────────────────────────║  │
│  ║  pr list/view, issue list/view, run list/view             ║  │
│  ║  project list/view, api GET, rate-limit                   ║  │
│  ║                                                           ║  │
│  ║  • No --write required                                    ║  │
│  ║  • Rate-limit aware (warns when low)                      ║  │
│  ╚═══════════════════════════════════════════════════════════╝  │
│                          │                                      │
│                          ▼                                      │
│  ╔═══════════════════════════════════════════════════════════╗  │
│  ║  TIER 2: SAFE WRITES (Require --write)                    ║  │
│  ║  ─────────────────────────────────────────────────────────║  │
│  ║  pr create/comment/review, issue create/comment           ║  │
│  ║  run rerun, project move/field, api POST/PATCH            ║  │
│  ║                                                           ║  │
│  ║  • Require --write flag                                   ║  │
│  ║  • Allowed in agent mode                                  ║  │
│  ║  • Throttled when rate limit < 100                        ║  │
│  ╚═══════════════════════════════════════════════════════════╝  │
│                          │                                      │
│                          ▼                                      │
│  ╔═══════════════════════════════════════════════════════════╗  │
│  ║  TIER 3: DESTRUCTIVE (Require --write --force)            ║  │
│  ║  ─────────────────────────────────────────────────────────║  │
│  ║  pr close/merge, issue close, api DELETE                  ║  │
│  ║                                                           ║  │
│  ║  • Confirmation prompt required                           ║  │
│  ║  • Blocked in agent mode unless explicitly allowed        ║  │
│  ╚═══════════════════════════════════════════════════════════╝  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Mode

When called from Claude Code (detected via environment), additional safety:

```bash
# Agent mode restrictions:
# - max_delete_rows = 50 (not 100)
# - max_update_rows = 200 (not 500)
# - All writes logged to ~/.grove/audit.log
# - No --force allowed (must use human mode)

GW_AGENT_MODE=1 gw db query --write "DELETE FROM posts WHERE id = 'abc'"
```

---

## MCP Server Mode

For Claude Code integration, `gw` can run as an MCP server:

```bash
# Start MCP server
gw mcp serve

# In Claude Code settings.json:
{
  "mcpServers": {
    "grove-wrap": {
      "command": "gw",
      "args": ["mcp", "serve"]
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| **Cloudflare** | |
| `grove_db_query` | Execute read-only SQL |
| `grove_db_tables` | List tables |
| `grove_db_schema` | Get table schema |
| `grove_db_tenant` | Look up tenant info |
| `grove_cache_list` | List cache keys |
| `grove_cache_purge` | Purge cache (with confirmation) |
| `grove_kv_get` | Get KV value |
| `grove_r2_list` | List R2 objects |
| `grove_status` | Infrastructure status |
| **Git** | |
| `grove_git_status` | Get repository status |
| `grove_git_log` | Get commit history |
| `grove_git_diff` | Get file diffs |
| `grove_git_commit` | Create commit (requires confirmation) |
| `grove_git_push` | Push to remote (requires confirmation) |
| **GitHub** | |
| `grove_gh_pr_list` | List pull requests |
| `grove_gh_pr_view` | View PR details |
| `grove_gh_pr_create` | Create PR (requires confirmation) |
| `grove_gh_issue_list` | List issues |
| `grove_gh_issue_view` | View issue details |
| `grove_gh_run_list` | List workflow runs |
| `grove_gh_project_move` | Move item on project board |
| **Dev Tools** | |
| `grove_dev_start` | Start dev server |
| `grove_dev_stop` | Stop dev server |
| `grove_dev_status` | Dev server status |
| `grove_test_run` | Run tests for package |
| `grove_build` | Build package |
| `grove_ci` | Run CI pipeline locally |

---

## Integration with grove-find

> **Note:** grove-find has been rewritten as a Python CLI (`tools/grove-find/`).
> The bash version (`grove-find.sh`) is archived at `archive/grove-find-bash/`.
> Use `uv run --project tools/grove-find gf --agent <command>` instead.

The `gw` CLI integrates with the grove-find toolkit. These shell aliases are available locally:

```bash
# Shell aliases (local dev only — not available in remote/web sessions)

# ─── Cloudflare Shortcuts ───
gwd                    # Alias for: gw db
gwq "sql"              # Quick query: gw db query "sql"
gwt                    # Tables: gw db tables
gwc tenant             # Cache purge: gw cache purge --tenant
gws                    # Status: gw status

# ─── Git Shortcuts ───
gwgs                   # Git status: gw git status
gwgl                   # Git log: gw git log
gwgd                   # Git diff: gw git diff
gwgc "msg"             # Git commit: gw git commit --write -m "msg"
gwgp                   # Git push: gw git push --write
gwgsave                # Quick save: gw git save --write
gwgsync                # Sync with main: gw git sync --write

# ─── GitHub Shortcuts ───
gwpr                   # PR list: gw gh pr list
gwprc                  # PR create: gw gh pr create --write
gwprv 123              # PR view: gw gh pr view 123
gwiss                  # Issue list: gw gh issue list
gwissv 348             # Issue view: gw gh issue view 348

# ─── Dev Shortcuts ───
gwdev                  # Start dev: gw dev
gwtest                 # Run tests: gw test
gwbuild                # Build: gw build
gwci                   # Run CI locally: gw ci
```

---

## Directory Structure

```
tools/gw/
├── pyproject.toml          # UV project config
├── src/
│   └── gw/
│       ├── __init__.py
│       ├── cli.py          # Main CLI entry point (Click)
│       ├── commands/
│       │   ├── __init__.py
│       │   │
│       │   │ # ─── Cloudflare Commands ───
│       │   ├── db.py       # Database commands
│       │   ├── kv.py       # KV commands
│       │   ├── r2.py       # R2 commands
│       │   ├── cache.py    # Cache commands
│       │   ├── do.py       # Durable Objects commands
│       │   ├── secret.py   # Secrets management (agent-safe!)
│       │   ├── deploy.py   # Deployment helpers
│       │   ├── logs.py     # Worker log tailing
│       │   ├── backup.py   # D1 backup/restore
│       │   ├── flag.py     # Feature flag management
│       │   ├── health.py   # Service health checks
│       │   ├── tenant.py   # Tenant CRUD operations
│       │   ├── email.py    # Email testing
│       │   ├── auth.py     # Heartwood client management
│       │   ├── doctor.py   # Diagnostic checks
│       │   ├── whoami.py   # Identity display
│       │   ├── history.py  # Command history
│       │   ├── status.py   # Status commands
│       │   │
│       │   │ # ─── Git Commands ───
│       │   ├── git/
│       │   │   ├── __init__.py
│       │   │   ├── read.py     # status, log, diff, blame, show
│       │   │   ├── write.py    # add, commit, push, branch, stash
│       │   │   ├── danger.py   # force-push, reset, rebase, merge
│       │   │   └── shortcuts.py # save, sync, wip, undo, amend
│       │   │
│       │   │ # ─── GitHub Commands ───
│       │   ├── gh/
│       │   │   ├── __init__.py
│       │   │   ├── pr.py       # Pull request operations
│       │   │   ├── issue.py    # Issue operations
│       │   │   ├── run.py      # Workflow run operations
│       │   │   ├── project.py  # Project board operations
│       │   │   └── api.py      # Raw API access
│       │   │
│       │   │ # ─── Dev Tool Commands ───
│       │   ├── dev/
│       │   │   ├── __init__.py
│       │   │   ├── server.py   # Dev server management
│       │   │   ├── test.py     # Test runner
│       │   │   ├── build.py    # Build commands
│       │   │   ├── check.py    # Type checking
│       │   │   ├── lint.py     # Linting
│       │   │   └── ci.py       # CI parity runner
│       │   │
│       │   └── README.md       # Command module docs
│       │
│       ├── completions/
│       │   ├── __init__.py
│       │   ├── bash.py     # Bash completion generator
│       │   ├── zsh.py      # Zsh completion generator
│       │   └── fish.py     # Fish completion generator
│       │
│       ├── safety/
│       │   ├── __init__.py
│       │   ├── database.py # DB safety (ports database-safety.ts)
│       │   ├── git.py      # Git safety tiers
│       │   └── github.py   # GitHub safety tiers
│       │
│       ├── config.py       # Configuration loading
│       ├── wrangler.py     # Wrangler subprocess wrapper
│       ├── git_wrapper.py  # Git subprocess wrapper
│       ├── gh_wrapper.py   # GitHub CLI wrapper
│       ├── packages.py     # Monorepo package detection
│       ├── secrets_vault.py # Encrypted secrets storage
│       ├── cloudflare.py   # Cloudflare API client
│       ├── mcp_server.py   # MCP server implementation
│       └── ui.py           # Rich terminal output
│
├── tests/
│   ├── test_safety.py
│   ├── test_db.py
│   ├── test_secrets.py
│   ├── test_tenant.py
│   ├── test_config.py
│   ├── test_git.py         # Git command tests
│   ├── test_gh.py          # GitHub command tests
│   ├── test_dev.py         # Dev tool tests
│   └── test_packages.py    # Package detection tests
│
└── README.md
```

---

## Security Considerations

1. **No secrets in config** - Zone ID/API keys stored via `wrangler secret` or env vars
2. **Audit logging** - All write operations logged with timestamp, user, query
3. **Row limits** - Prevent accidental mass deletion
4. **Protected tables** - Extra confirmation for sensitive data
5. **No --force in agent mode** - Humans must approve destructive operations

---

## Implementation Phases

### Phase 1: Foundation & Status (Week 1) ✨ START HERE

- [ ] Project setup (UV, Click, Rich)
- [ ] Config loading from `~/.grove/gw.toml`
- [ ] Wrangler subprocess wrapper
- [ ] `gw status` - Infrastructure overview (FIRST COMMAND)
- [ ] `gw health` - Service health checks
- [ ] `gw bindings` - Show all bindings from wrangler.toml
- [ ] `gw auth check/login` - Authentication helpers
- [ ] Basic Rich UI patterns established

### Phase 2: Core DB & Tenant (Week 2)

- [ ] `gw db list` - List databases
- [ ] `gw db tables` - List tables
- [ ] `gw db schema` - Show table schema
- [ ] `gw db query` - Read-only queries
- [ ] Safety layer for writes (port database-safety.ts)
- [ ] `gw tenant` - Tenant lookup (by subdomain/email/id)
- [ ] `gw tenant stats` - Tenant statistics
- [ ] Basic tests

### Phase 3: Secrets & Cache (Week 3) 🔐 SECURITY MILESTONE

- [ ] Encrypted secrets vault (`~/.grove/secrets.enc`)
- [ ] System keychain integration (macOS Keychain)
- [ ] `gw secret set/list/delete` - Human-only commands
- [ ] `gw secret apply/sync` - Agent-safe commands
- [ ] `gw cache list` - List cached keys
- [ ] `gw cache purge` - Purge keys (tenant/CDN)
- [ ] Cloudflare API integration (CF_API_TOKEN env var)

### Phase 4: Logs, Backup, Flags (Week 4)

- [ ] `gw logs` - Tail worker logs with filtering
- [ ] `gw backup create/list` - D1 backups
- [ ] `gw backup restore` - Restore from backup
- [ ] `gw flag list/get` - Feature flag queries
- [ ] `gw flag enable/disable` - Flag management

### Phase 5: KV, R2, DOs (Week 5)

- [ ] `gw kv get/list` - KV read operations
- [ ] `gw kv put/delete` - KV write operations
- [ ] `gw r2 list/ls` - List buckets and objects
- [ ] `gw r2 get/put/rm` - Object operations
- [ ] `gw do list/info` - DO introspection
- [ ] `gw do instances/alarms` - Instance management

### Phase 6: Tenant Management & Email (Week 6)

- [ ] `gw tenant create` - Interactive creation wizard
- [ ] `gw tenant delete` - Safe deletion with CASCADE preview
- [ ] `gw email test` - Test email sending
- [ ] `gw email status` - Email config check
- [ ] `gw deploy` - Deployment helpers

### Phase 6.5: Heartwood Client Management (Week 6-7) 🔐

- [ ] `gw auth client create` - Interactive client registration
- [ ] `gw auth client list` - List all registered clients
- [ ] `gw auth client info` - Get client details
- [ ] `gw auth client rotate` - Rotate client secret
- [ ] `gw auth client delete` - Remove a client
- [ ] `gw auth client setup` - Full setup wizard (create + apply secrets)
- [ ] Base64url hash generation (critical - gets encoding right!)
- [ ] Integration with `gw secret` vault

### Phase 7: Agent Integration (Week 7) 🤖 MCP MILESTONE

- [ ] MCP server implementation
- [ ] Agent mode safety restrictions
- [ ] grove-find Python CLI integration (`gwq`, `gwc`, `gws`, etc.)
- [ ] Claude Code settings documentation
- [ ] Full test coverage

### Phase 7.5: Quality of Life (Week 7-8)

- [ ] `gw doctor` - Diagnostic checks
- [ ] `gw whoami` - Identity and context display
- [ ] `gw history` - Command history with re-run
- [ ] Shell completions (bash, zsh, fish)
- [ ] Dynamic completion for db names, tables, tenants

### Phase 8 (v2): Advanced Features

- [ ] `gw shell` - Interactive REPL mode
- [ ] `gw ai quota` - AI Gateway usage/limits
- [ ] `gw inspect <request-id>` - Debug specific requests
- [ ] `gw replay` - Replay webhooks for debugging
- [ ] `gw metrics` - Quick metrics dashboard
- [ ] `gw tunnel` - Quick cloudflared tunnel for local dev


# ═══════════════════════════════════════════════════════════════════
#                    GIT & GITHUB PHASES (9-14)
# ═══════════════════════════════════════════════════════════════════

### Phase 9: Git Read Operations (Week 8) 🌿 GIT FOUNDATION

- [ ] Git subprocess wrapper with output parsing
- [ ] `gw git status` - Rich formatted status
- [ ] `gw git log` - Filtered log with Grove formatting
- [ ] `gw git diff` - Diff with syntax highlighting
- [ ] `gw git blame` - Blame with line range support
- [ ] `gw git show` - Show commit details
- [ ] Branch detection and context awareness
- [ ] Protected branches configuration

### Phase 10: Git Write Operations (Week 9)

- [ ] `gw git add` - Stage files with --write
- [ ] `gw git commit` - Commit with Conventional Commits enforcement
- [ ] `gw git push` - Push with safety checks
- [ ] `gw git branch` - Create/delete branches
- [ ] `gw git stash` - Stash management
- [ ] `gw git switch` - Branch switching (read-only, no flag needed)
- [ ] Issue auto-linking from branch names
- [ ] Audit logging for all writes

### Phase 11: Git Dangerous Operations & Shortcuts (Week 10)

- [ ] `gw git push --force` - Force push with --force requirement
- [ ] `gw git reset` - Reset with safety prompts
- [ ] `gw git rebase` - Rebase with confirmation
- [ ] `gw git merge` - Merge with conflict detection
- [ ] `gw git save` - Quick save shortcut (add all + wip commit)
- [ ] `gw git sync` - Fetch + rebase + push
- [ ] `gw git wip` - WIP commit (skips hooks)
- [ ] `gw git undo` - Undo last commit
- [ ] `gw git amend` - Amend last commit message
- [ ] Agent mode blocking for dangerous operations
- [ ] Protected branch enforcement (block force-push to main)


### Phase 12: GitHub Read Operations (Week 11) 🐙 GITHUB FOUNDATION

- [ ] GitHub CLI wrapper with JSON output parsing
- [ ] `gw gh pr list` - List PRs with filters
- [ ] `gw gh pr view` - View PR details
- [ ] `gw gh pr status` - Status of your PRs
- [ ] `gw gh pr checks` - CI status for PR
- [ ] `gw gh issue list` - List issues with filters
- [ ] `gw gh issue view` - View issue details
- [ ] `gw gh run list` - List workflow runs
- [ ] `gw gh run view` - View run details
- [ ] `gw gh rate-limit` - Rate limit status display
- [ ] Rate limit awareness (warn when low)

### Phase 13: GitHub Write Operations (Week 12)

- [ ] `gw gh pr create` - Create PR with templates
- [ ] `gw gh pr comment` - Add comments
- [ ] `gw gh pr review` - Review with approve/request changes
- [ ] `gw gh pr edit` - Edit labels, assignees, etc.
- [ ] `gw gh issue create` - Create issues
- [ ] `gw gh issue comment` - Add comments
- [ ] `gw gh issue edit` - Edit labels, assignees, milestones
- [ ] `gw gh run rerun` - Rerun failed jobs
- [ ] `gw gh run cancel` - Cancel running workflows
- [ ] `gw gh workflow run` - Trigger workflows manually

### Phase 14: GitHub Destructive & Project Board (Week 13) 🦡 BADGER INTEGRATION

- [ ] `gw gh pr merge` - Merge with squash/rebase options
- [ ] `gw gh pr close` - Close without merging
- [ ] `gw gh issue close` - Close issues
- [ ] `gw gh issue reopen` - Reopen issues
- [ ] `gw gh project list` - List project items
- [ ] `gw gh project view` - View item details
- [ ] `gw gh project move` - Move items between columns
- [ ] `gw gh project field` - Set custom fields (size, priority, sprint)
- [ ] `gw gh project bulk` - Bulk operations for triage
- [ ] `gw gh project add/remove` - Add/remove from project
- [ ] `gw gh api` - Raw API access with tiered safety
- [ ] Configuration for project field IDs
- [ ] Integration with badger-triage skill


# ═══════════════════════════════════════════════════════════════════
#                    DEV TOOLS PHASES (15-18)
# ═══════════════════════════════════════════════════════════════════

### Phase 15: Dev Server Management (Week 14) 🔧 DEV FOUNDATION

- [ ] Package detection from current directory
- [ ] Package configuration loading
- [ ] `gw dev` - Start dev server (auto-detect package)
- [ ] `gw dev <package>` - Start specific package
- [ ] `gw dev --port` - Custom port
- [ ] `gw dev --local/--remote` - Mode selection
- [ ] `gw dev stop` - Stop dev servers
- [ ] `gw dev restart` - Restart servers
- [ ] `gw dev status` - Show running servers
- [ ] `gw dev logs` - View server logs
- [ ] Multi-package dev (start multiple)
- [ ] Process management (PID tracking, cleanup)

### Phase 16: Test & Build Commands (Week 15)

- [ ] `gw test` - Run tests for current package
- [ ] `gw test <package>` - Run tests for specific package
- [ ] `gw test --all` - Run all package tests
- [ ] `gw test --watch` - Watch mode
- [ ] `gw test --coverage` - Coverage reports
- [ ] `gw test --filter` - Filter tests
- [ ] `gw build` - Build current package
- [ ] `gw build <package>` - Build specific package
- [ ] `gw build --all` - Build all packages
- [ ] `gw build --analyze` - Bundle analysis
- [ ] `gw build --dry-run` - Show what would be built

### Phase 17: Check & Lint Commands (Week 16)

- [ ] `gw check` - Type check current package
- [ ] `gw check <package>` - Type check specific package
- [ ] `gw check --all` - Type check all packages
- [ ] `gw check --watch` - Watch mode
- [ ] `gw check --svelte` - Svelte-specific checks
- [ ] `gw lint` - Lint current package
- [ ] `gw lint <package>` - Lint specific package
- [ ] `gw lint --fix` - Auto-fix issues
- [ ] `gw lint --format` - Prettier check
- [ ] Package aliases support (eng → engine)

### Phase 18: CI Parity (Week 17) 🤖 CI MILESTONE

- [ ] `gw ci` - Run full CI pipeline locally
- [ ] `gw ci lint` - Run just linting
- [ ] `gw ci test` - Run just tests
- [ ] `gw ci build` - Run just build
- [ ] `gw ci typecheck` - Run just type checking
- [ ] `gw ci <package>` - CI for specific package
- [ ] `gw ci --dry-run` - Show what would run
- [ ] `gw ci --strict` - Fail on warnings
- [ ] `gw ci --continue-on-error` - See all failures
- [ ] Rich progress UI with step timing
- [ ] CI pipeline configuration from gw.toml
- [ ] Exit code parity with actual CI

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to query a table | < 3 seconds (vs 10+ with wrangler) |
| Commands memorized | 0 UUIDs needed |
| Accidental deletes | 0 (safety layer) |
| Agent auto-approval | Safe for all read operations |

---

## Related

- **Issue #348**: Database safety layer integration (parent issue)
- **Issue #527**: Cache management admin tool (CLI implementation)
- **database-safety.ts**: TypeScript safety layer (pattern to port)
- **tools/grove-find/**: Python CLI search toolkit (integration target)

---

*The best CLI is the one you don't have to think about. Just type `gw` and go.*
