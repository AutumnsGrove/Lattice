# Project Instructions

> **IMPORTANT**: This project uses `AGENT.md` for agent instructions.

## Instructions for Claude Code

**You MUST read `AGENT.md` before doing anything else.**

## Grove Tools Setup

Check if tools are available, install if not:

```bash
bash tools/grove-wrap-go/install.sh   # gw — infrastructure CLI (secrets, worktrees, warden, publishing)
```

`gw` handles things raw CLIs can't (encrypted vaults, issue-driven worktrees, npm publishing, Warden).
For git, gh, and wrangler — use them directly.

For codebase search, use semantic search for discovery and `rg`/`find`/`glob` for exact matches.

---

- **`AGENT.md`** — Main project instructions
- Special Reminder from the user:
  > This site is my authentic voice—warm, introspective, queer, unapologetically building something meaningful; write like you're helping me speak, not perform.
- Reminder from the User for when we Work:
  > Write with the warmth of a midnight tea shop and the clarity of good documentation—this is my space, make it feel like home.

## Semantic Search (Lumen)

Lumen is running as an MCP server with a voyage-4-nano index of this codebase. **Prefer semantic search over grep/glob for discovery tasks.**

### When to use `mcp__lumen__semantic_search`
- Finding where a concept is implemented ("where does session auth happen?")
- Locating unfamiliar code ("how does thorn rate-limiting work?")
- Exploring before editing ("what touches the reverie pipeline?")
- Any open-ended "find the relevant code" question

### When to still use Grep/Glob
- You know the exact symbol name or file path
- Searching for a literal string that must match precisely
- Checking if a specific import exists

### Tool reference
| Tool | When to call it |
|------|----------------|
| `mcp__lumen__semantic_search` | Workhorse — natural language query + `path` set to cwd |
| `mcp__lumen__index_status` | Check if index is fresh before a large task |
| `mcp__lumen__health_check` | Diagnose if search returns nothing / LM Studio issue |

### Manual skills (plugin slash commands unavailable — use these directly)
- **Doctor**: call `health_check` then `index_status` for cwd, summarize results
- **Reindex**: call `semantic_search` with a broad query to seed/refresh, or run `lumen purge && lumen index .` for a clean rebuild

---

## Design Context

Grove serves queer creators, independent writers, and indie web enthusiasts seeking their own space online. **Warm, introspective, queer** — like a trusted friend who runs a midnight tea shop. Nature-themed glassmorphism with seasonal depth. Studio Ghibli warmth meets indie bookshop.

**Full design guide:** `DESIGN.md`
