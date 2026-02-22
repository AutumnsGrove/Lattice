# gw + gf Test Drive Safari

> "You don't know a tool until you've driven it through rough terrain."
> **Aesthetic principle**: Grove tooling should feel like a warm, competent friend — not a cold Unix pipe
> **Scope**: Both tools installed fresh, driven through every major command, observed top-to-bottom

---

## The Mission

Install `gw` and `gf` fresh, drive every major command, document what it's actually like to use these
tools as daily Grove infrastructure. No preconceptions. Just binoculars and honest notes.

---

## 1. Installation

**Character**: The on-ramp. First impressions matter.

### Safari findings: What exists today

**gf (grove-find-go):**
- [x] Pre-built binaries for all four platforms: `linux-x86_64`, `linux-arm64`, `darwin-arm64`, `windows-x86_64`
- [x] Install script auto-detects platform and copies binary to `~/.local/bin`
- [x] Install completes in under 1 second
- [x] Helpful post-install output: size, path, PATH tip
- [x] Built on ripgrep + fd + git + gh — leverages fast existing tools

**gw (grove-wrap-go):**
- [ ] **NO pre-built binaries** — `dist/` directory doesn't exist
- [ ] Falls back to `go build` which requires Go to be installed
- [ ] Takes 30+ seconds on first build (downloading modules + compiling)
- [x] Install script handles the fallback gracefully
- [x] Build output is clean and informative
- [ ] Version shows `dev` when built from source — cosmetically awkward

### Design spec (safari-approved)

The gap between gf and gw installation is stark. gf is frictionless. gw is a Go project setup.

**Fix**: Build gw binaries in CI for all four platforms just like gf does. The Makefile likely
already has the build targets — it's a CI/release pipeline gap, not a code gap.

---

## 2. Speed

**Character**: The engine. You feel it on every command.

### Safari findings: Raw timings from `gw history list`

| Command | Time | Verdict |
|---|---|---|
| `gw version` | 1ms | Instant |
| `gw git log` | 22ms | Lightning |
| `gw git status` | 567–573ms | Fast |
| `gw context` | 589–608ms | Good |
| `gw monorepo-size` | 776ms | Fine |
| `gw packages` | 28ms | Fast |
| `gw metrics` | 4490ms | **Slow** |
| `gw status` | 3989ms | **Slow** |
| `gw whoami` | 4161ms | **Slow** |
| `gw doctor` | 9762ms | **Painful** |

**The smoking gun** — from `gw metrics`:
```
✓ wrangler check  3906.88 ms
✓ git status       573.84 ms
```

Every command that touches Cloudflare state calls `wrangler` as a subprocess.
Wrangler takes ~4 seconds to start and check auth. Commands that call it more than once
pay the tax twice (doctor calls it twice → ~9.7s).

**gf speed:**
- `gf version`: 13ms — excellent
- `gf routes`: 13ms — instant
- `gf glass`: returns ~670 results very fast
- `gf workers`: instant comprehensive inventory
- `gf search "GlassCard"`: generates 182KB of output but delivers it fast

### Design spec (safari-approved)

**Wrangler caching**: Cache the `wrangler whoami` result in a temp file with a 60-second TTL.
A fresh subprocess call is only needed when the cache is stale. This turns 4-second commands
into 1ms lookups for the common case. Pattern:

```
~/.grove/wrangler-auth-cache.json  (TTL: 60s)
{ "authenticated": true, "email": "...", "timestamp": 1708644000 }
```

**Progressive disclosure**: Commands like `gw doctor` could run the fast checks first
(git, config file) and make the slow Cloudflare check optional (`--cloud` flag).

---

## 3. gf — The Search Engine

**Character**: The bloodhound. Fast, thorough, no-nonsense. Knows the codebase cold.

### Safari findings: What exists today

**Strengths — what genuinely works:**
- [x] 60+ commands covering every codebase concern: routes, workers, migrations, todos, orphans, glass, engine imports
- [x] `gf workers` — instant inventory of all 31 workers with binding types `[D1, KV, R2, cron, AI]`
- [x] `gf migrations` — 129 migrations across 11 databases, grouped with ranges
- [x] `gf glass` — full Glass component usage tree (670+ matches)
- [x] `gf todo` — finds every TODO/FIXME/HACK with file:line precision
- [x] `gf engine` — maps all `@autumnsgrove/lattice/*` imports by module category
- [x] `gf routes` — page routes, API routes, layouts, error pages all grouped
- [x] `gf config-diff` — detects the CSRF inconsistency across 15 svelte configs (a real bug catch!)
- [x] `gf orphaned` — 118 unused components found
- [x] `--agent` flag strips ANSI for machine-readable output
- [x] `--json` flag for scripting
- [x] `--root` flag for project root override
- [x] Grove-specific commands that raw ripgrep could never provide

**Gaps — what needs work:**
- [ ] `gf briefing` truncates TODO text at ~10 characters (rendering cut-off bug)
- [ ] `gf deps` shows "7 packages with workspace dependencies" — no actual graph
- [ ] `gf changed` fails with `exit status 128` when base branch isn't fetched
- [ ] `gf search "GlassCard"` dumps 182KB to terminal without pagination — firehose
- [ ] `gf orphaned` includes `_archived/` components — creates noise; should be excludable
- [ ] Colors are functional but utilitarian: bold cyan headers, magenta paths — not Grove-warm

### Look and Feel

gf's visual language is "ripgrep with colored section headers":
```
--- Section Title ---         ← bold cyan
/path/to/file:42:  match     ← magenta path, green line number, bold red match
```

It gets the job done. It's readable. But it doesn't feel like it belongs to the same design
system as gw's beautiful Lipgloss panels. The two tools look like they were built by different
teams with different philosophies — because the Python-to-Go rewrite happened at different times.

### Design spec (safari-approved)

**gf briefing TODO truncation fix**: The truncation is happening in the grep output display —
likely a max-width or column constraint that's too narrow. TODO descriptions should show at
minimum 60 characters.

**gf deps full graph**: The dependency graph should show actual edges:
```
libs/engine → apps/ivy, apps/landing, apps/clearing, ...
libs/foliage → apps/plant, apps/landing
```

**gf changed fallback**: When `main` isn't available, try `origin/main`, then the most recent
common ancestor. Fail gracefully with a useful message rather than `exit status 128`.

**Output pagination**: `gf search` should detect when output exceeds a threshold (e.g., 10,000
chars) and either paginate or suggest using `--agent` mode for piping.

**`_archived` exclusion**: Add a `--no-archived` flag (or make it default) to exclude
`_archived/` from `gf orphaned` and `gf search`.

---

## 4. gw — The Infrastructure Operator

**Character**: The grove keeper. Wraps git, wrangler, gh, and the dev toolchain behind a
safety-tiered interface. The one you trust with real operations.

### Safari findings: What exists today

**Help system:**
- [x] Custom `RenderCozyHelp()` replaces Cobra's default — great instinct
- [x] Safety tiers (READ / WRITE / DANGER) clearly color-coded in help output
- [x] Emoji category icons: 📖 Read, ✏️ Write, 🔥 Dangerous, ⚡ Shortcuts, 🚀 Workflows
- [x] Bordered header box: `╭────╮ │ gw │ ╰────╯ — tend the grove with safety and warmth`
- [ ] `gw git ship --help` routes to the parent git group help, not ship-specific help
- [ ] Subcommands without custom help functions fall back to Cobra default (visually inconsistent)

**Git operations:**
- [x] `gw git log` — beautiful Charm table with rounded corners, proper alignment, dates
- [x] `gw context` — clean branch/status/commits summary at session start
- [x] `gw git ship` — genuine workflow: stage → format → typecheck → validate → commit → push
- [x] `gw git pr-prep` — PR readiness analysis with suggested title from branch/commit
- [x] `gw git status` — minimal, clean output (no visual noise)
- [x] Safety tier enforcement: WRITE commands require `--write`, DANGER requires `--write --force`
- [x] History tracking with timing — `gw history list` is genuinely useful

**Infrastructure commands:**
- [x] `gw packages` — beautiful table: 34 packages, type, available scripts
- [x] `gw monorepo-size` — filesystem breakdown by top-level dir with human sizes
- [x] `gw doctor` — health check panel (slow but thorough)
- [x] `gw whoami` — auth state, directory, vault status
- [x] `gw health` — Cloudflare + wrangler check panel
- [x] `gw bindings` — wrangler binding scanner
- [x] `gw d1`, `gw kv`, `gw r2` — infrastructure operations (read/write tiered)

**Design quality of UI components:**
- [x] `RenderInfoPanel` — key-value panel with auto-aligned keys, rounded borders
- [x] `RenderStepList` — pass/fail checklist, border color adapts to all-pass vs any-fail
- [x] `RenderWarningPanel` — yellow border, ⚠ prefix
- [x] `RenderErrorPanel` — red border, ✗ prefix, suggestion line
- [x] `RenderSuccessPanel` — green border, ✓ prefix
- [x] Table rendering with Lipgloss — `gw git log` is the proof it works beautifully
- [ ] `gw context` doesn't use panels — it's bare `fmt.Printf`. Inconsistent with the rest

**Color palette (theme.go):**
```
ForestGreen  #2d5a27  — headers, success, borders (primary)
MossGreen    #4a7c59  — commands, table headers (secondary)
RiverCyan    #3a9d9b  — info messages
SunsetAmber  #e8a838  — write-tier, shortcuts, warnings
DangerRed    #ff4444  — danger-tier, errors
LeafYellow   #b8a924  — write-tier, warning panels
BarkBrown    #8b6914  — (defined but appears less used)
DimGray      #666666  — subtitles, hints, descriptions
```

Nature-named, Grove-aligned. The palette is solid. The gap is application — not all commands
use the full palette consistently.

### Look and Feel

When it's working, `gw` is genuinely delightful. The `gw git log` table:

```
╭─────────┬──────────────────────────────────────────────────────┬──────────────┬────────────╮
│ Hash    │ Message                                              │ Author       │ Date       │
├─────────┼──────────────────────────────────────────────────────┼──────────────┼────────────┤
│ d223191 │ feat(gw): port social and publish commands to Go    │ Autumn brown │ 2026-02-22 │
│ 471f93d │ feat(gw): Charm Glow-Up — full TUI styling         │ Autumn brown │ 2026-02-22 │
╰─────────┴──────────────────────────────────────────────────────┴──────────────┴────────────╯
```

This is exactly right. Warm, readable, structured without being sterile.

When it's slow, the magic breaks. Waiting 10 seconds for `gw doctor` is death to the "warm
companion" feeling. You start thinking of it as a slow tool, not a fast friend.

### Design spec (safari-approved)

**Wrangler auth caching** (critical):
Cache `wrangler whoami` output with a 60-second TTL in `~/.grove/wrangler-cache.json`.
This turns the most common pain point from 4s → 1ms.

**`gw context` panel upgrade**:
Wrap context output in `RenderInfoPanel` to match the established visual language. Currently
it's bare `fmt.Printf` while everything else uses Lipgloss panels.

**`gw git ship --help` fix**:
The ship subcommand needs to show its own flags (`-m`, `-a`, `--no-check`, `--no-format`,
`--issue`). The current routing shows the parent group help instead.

**`gw version` shows "dev"**:
Set version via ldflags at build time even for local builds. Use `git describe --tags --always`
to produce something like `0.2.0-g471f93d` instead of just `dev`.

**Progressive wrangler loading**:
Add a `--no-cloud` flag to skip all wrangler calls. Daily developer workflows (git operations,
context checks, package inspection) should never need to wait for cloud auth.

---

## 5. Cross-Cutting Themes

### Design coherence: gf vs gw

These two tools are visual siblings but not quite twins. gw has Charm Lipgloss panels; gf has
ANSI color codes. They're both readable but they don't feel like one suite. If you ran both
tools in the same terminal session, you'd notice the tonal difference immediately.

**Safari-approved direction**: gf doesn't need to become as panel-heavy as gw — its job is
volume output (search results, file lists). But the section headers could get the Lipgloss
treatment. Replace `[1m[36m--- Section ---[0m` with a proper Lipgloss `TitleStyle.Render()`.
One small change, much more coherent.

### The `--agent` contract

Both tools have agent modes. gf's `--agent` flag strips all ANSI. gw has `--agent` too.
This is the right design — humans get warmth, agents get clean text. The contract is solid.
The gap is that `gf search` in agent mode still dumps enormous output volumes without any
summary or limit. A `--max-results N` flag would help agents avoid context flooding.

### Missing: gw ci

The AGENT.md references `gw ci --affected --fail-fast --diagnose` prominently, but `gw --help`
doesn't show a `ci` command. Either it's not implemented in the Go version yet, or it's hidden.
This is a critical workflow command if agents are expected to use it.

---

## Expedition Summary

### By the numbers

| Metric | gf | gw |
|---|---|---|
| Install friction | Low (pre-built binaries) | High (build from source) |
| Cold start | 13ms | 23ms |
| Average command | <100ms | <600ms (no wrangler) |
| Wrangler commands | N/A | 4–10 seconds |
| Command count | 60+ | 98+ across 7 groups |
| Visual language | ANSI colors | Lipgloss panels + tables |
| Delight factor | Functional | Warm when fast, frustrating when slow |

### Priority fix order

1. **gw pre-built binaries** — critical for install experience (you said it: this needs to happen)
2. **Wrangler auth caching** — 4s → 1ms. The biggest daily pain point by far
3. **`gw git ship --help` routing** — help should show ship's own flags
4. **`gf briefing` TODO truncation** — visible bug, easy fix
5. **`gf deps` full graph** — shows count but no edges
6. **`gf changed` graceful fallback** — fails hard instead of degrading
7. **`gw ci` command** — either implement or document why it's missing from Go port
8. **`gw context` panel upgrade** — use Lipgloss panels like the rest of gw does
9. **`gw version` ldflags** — show real version even for local builds
10. **gf/gw visual coherence** — give gf section headers the Lipgloss treatment

### What's genuinely great

The architectural design is right. Safety tiers are a genuinely good idea and well-executed.
The Grove-specific commands (workers, migrations, glass, engine imports, config-diff) are the
kind of thing that makes you wonder how you ever worked without them. The command history with
timing is a delight. `gw git log`'s table is beautiful.

These tools deserve to be fast. When they are — they feel like the grove.

---

_The fire dies to embers. Journal full. The drive covered both tools from cold install through
daily workflow. The bones are excellent. Fix the wrangler slowness, ship the binaries, and
this becomes infrastructure you reach for by reflex._
