# Archived

Historical materials, deprecated code, and reference documents. Everything here has been superseded or is kept for context only.

## Structure

| Directory  | Contents                                                 |
| ---------- | -------------------------------------------------------- |
| `code/`    | Deprecated code projects (old tools, superseded apps)    |
| `docs/`    | Historical documents, audit reports, design explorations |
| `prompts/` | AI prompts and templates from earlier development phases |

## Code Archives

| Project                  | Deprecated | Notes                                                           |
| ------------------------ | ---------- | --------------------------------------------------------------- |
| `example-site`           | 2025-12-31 | Example site code                                               |
| `grove-find-bash`        | 2026-02-17 | Bash codebase search tool, replaced by `grove-find-go`          |
| `grove-find-py`          | 2026-02-17 | Python codebase search tool, replaced by `grove-find-go`        |
| `GroveDomainTool-python` | 2026-02-19 | Python LLM domain discovery tool, replaced by `services/forage` |
| `gw-python`              | 2026-02-22 | Python infrastructure CLI (30K lines), replaced by `grove-wrap-go` |
| `logo-concepts`          | 2026-01-13 | Old logo iterations                                             |
| `vineyard-standalone`    | 2026-01-04 | Standalone vineyard app, merged into `libs/vineyard`            |

## Cleanup Policy

- Items here are kept for reference and git archaeology
- Safe to delete anything older than 90 days if disk space is needed
- Use `git log -- {path}` to recover deleted items from history
- Active planning docs belong in `docs/plans/`, not here
