# Archived: Grove Find (Bash Version)

**Archived:** 2026-02-02
**Replaced by:** `tools/grove-find-go/` (Go CLI)

## Why Archived

The original bash implementation had UX issues:

- Required `source`-ing to load functions into the shell
- Needed `GF_AGENT=1` flag for agent-friendly output
- Functions polluted the shell namespace
- BATS tests were brittle and hard to maintain

## Replacement

The Go `gf` CLI (`tools/grove-find-go/`) provides:

- Pre-compiled binaries for 4 platforms — no runtime dependencies
- Sub-10ms startup (vs 300-600ms for the intermediate Python version)
- Built-in `--agent` and `--json` flags
- Parallel subprocess execution via goroutines

Install with: `bash tools/grove-find-go/install.sh`

The intermediate Python version (`tools/grove-find/`) served as the bridge from bash to Go and has been archived to `_deprecated/grove-find-py-deprecated-2026-02-17/`.

## Contents

- `grove-find.sh` - Original 45+ function bash toolkit
- `bats-tests/` - BATS test suite

## Historical Note

This was a good first attempt! The bash functions worked well for quick searches, but the requirement to source the script and manage shell state made it awkward for both humans and agents. The Python rewrite kept the same command semantics while being much more portable, and the Go port completed the journey to a fast, dependency-free binary.
