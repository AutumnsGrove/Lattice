# Scripts

Utility scripts organized by purpose.

## Directories

### `db/`
SQL scripts for database seeding and data fixes.

```bash
# Run via wrangler
wrangler d1 execute grove-engine-db --file=scripts/db/seed-midnight-bloom.sql

# Files:
# - seed-midnight-bloom.sql    - Initial seed data for Midnight Bloom tenant
# - add-midnight-bloom-pages.sql - Add pages to Midnight Bloom
# - fix-midnight-bloom-content.sql - Content fixes
```

### `deploy/`
Deployment and operational scripts.

```bash
# Files:
# - backfill-history.sh    - Backfill historical data
# - backfill-summaries.sh  - Generate missing summaries
# - get-subscribers.sh     - Export subscriber list
# - wisp-setup.sh          - Set up Wisp service
```

### `generate/`
Asset and documentation generation.

```bash
# Files:
# - generate-logo-pngs.mjs      - Generate logo assets (requires Node)
# - generate-release-summary.sh - Generate release notes
```

### `repo/`
Repository management tools.

```bash
# Files:
# - repo-snapshot.sh   - Create repository snapshot
# - with-secrets.js    - Run commands with secrets loaded
#
# NOTE: grove-find has moved to tools/grove-find/ (Python CLI via UV)
# Usage: uv run --project tools/grove-find gf --agent search "pattern"
# Old bash version archived at: archive/grove-find-bash/
```

## Usage Notes

- SQL scripts should be run via `wrangler d1 execute`
- Shell scripts may need `chmod +x` before first use
- Check script headers for required environment variables
