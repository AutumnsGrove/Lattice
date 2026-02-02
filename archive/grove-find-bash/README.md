# Archived: Grove Find (Bash Version)

**Archived:** 2026-02-02
**Replaced by:** `tools/grove-find` (Python CLI)

## Why Archived

The original bash implementation had UX issues:

- Required `source`-ing to load functions into the shell
- Needed `GF_AGENT=1` flag for agent-friendly output
- Functions polluted the shell namespace
- BATS tests were brittle and hard to maintain

## Replacement

The new Python `gf` CLI (`tools/grove-find/`) provides:

- Proper CLI invocation (no sourcing needed)
- Built-in `--agent` and `--json` flags
- Type-safe Python with rich terminal output
- Pytest-based testing

Install with: `uv tool install tools/grove-find`

## Contents

- `grove-find.sh` - Original 45+ function bash toolkit
- `bats-tests/` - BATS test suite

## Historical Note

This was a good first attempt! The bash functions worked well for quick searches, but the requirement to source the script and manage shell state made it awkward for both humans and agents. The Python rewrite keeps the same command semantics while being much more portable.
