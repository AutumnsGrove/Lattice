# Deprecated Code

This directory contains deprecated code with expiration dates in filenames.

## Purpose

Items here were once part of the active codebase but have been superseded or are scheduled for removal. They remain temporarily for reference or rollback purposes.

## Naming Convention

Files and directories use the format: `{name}-deprecated-{YYYY-MM-DD}`

The date indicates when the item was deprecated. After a reasonable grace period (typically 30-90 days), items can be safely deleted.

## Current Contents

| Item | Deprecated Date | Notes |
|------|-----------------|-------|
| `example-site-deprecated-2025-12-31` | 2025-12-31 | Example site code |
| `logo-concepts-deprecated-2026-01-13` | 2026-01-13 | Old logo iterations |
| `sst-migration-plan-archived-2026-01-05.md` | 2026-01-05 | SST migration plan |
| `vineyard-standalone-deprecated-2026-01-04` | 2026-01-04 | Standalone vineyard app |

## Cleanup Guidance

- **Before major releases**: Review items past their grace period
- **Safe to delete**: Anything older than 90 days unless marked otherwise
- **Check git history**: Use `git log -- {path}` if you need to recover deleted items

## Related

- `archives/` - Historical reference materials (kept indefinitely)
