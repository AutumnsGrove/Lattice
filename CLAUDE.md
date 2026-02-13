# Project Instructions

> **IMPORTANT**: This project uses `AGENT.md` for agent instructions.

## Instructions for Claude Code

**You MUST read `AGENT.md` before doing anything else.**

The `AGENT.md` file contains all project-specific instructions, workflows, and guidelines. Read it first to keep the full context in memory for this session.

## Grove Tools Setup

**After reading AGENT.md**, install the core CLI tools. Check if they're already available:

```bash
gf --help && gw --help
```

If either command is not found, install them:

```bash
# gf — Go binary (primary, fast startup)
cd tools/grove-find-go && go build -o ~/.local/bin/gf . && cd -

# gf-py — Python fallback (if Go isn't available)
uv tool install --editable tools/grove-find

# gw — Infrastructure CLI
uv tool install --editable tools/gw
```

`gf` is the Go version (sub-10ms startup). `gf-py` is the Python fallback. `gw` is the infrastructure CLI. All available directly — no prefixes needed.

### Codebase Search (gf)

`gf` is a fast codebase search tool. Use `--agent` for clean output (no colors/emoji).

**Key commands:**

- `gf --agent search "pattern"` — Search entire codebase
- `gf --agent usage "Name"` — Find where a component is used
- `gf --agent func "name"` — Find function definitions
- `gf --agent class "Name"` — Find class/component definitions
- `gf --agent recent 1` — Files changed today
- `gf --agent changed` — Files changed on current branch
- `gf --agent engine` — Find engine imports
- `gf --agent todo` — Find TODO/FIXME/HACK comments
- `gf --agent git churn` — Most frequently changed files
- `gf impact src/lib/auth.ts` — Impact analysis (importers, tests, routes, packages)
- `gf test-for src/lib/auth.ts` — Find tests covering a file
- `gf diff-summary` — Structured diff with per-file stats and categories

Run `gf --help` for full command list.

All `gf` commands work in any environment — when `fd` is not installed, file-type searches automatically fall back to `rg --files`.

### Infrastructure CLI (gw)

`gw` wraps git, GitHub, Cloudflare, and dev tools with safety guards. Write operations require `--write`.

**Key commands:**

- `gw context` — Session snapshot (start every session here)
- `gw git status` / `gw git log` / `gw git diff` — Safe git reads
- `gw git commit --write -m "feat: ..."` — Commit (requires `--write`)
- `gw git push --write` — Push (requires `--write`)
- `gw git ship --write -a -m "feat: ..."` — Auto-stage + format + check + commit + push
- `gw git pr-prep` — Full PR readiness report
- `gw ci --affected --fail-fast` — CI only for changed packages
- `gw ci --diagnose` — Structured error diagnostics on failure
- `gw packages list` — List all monorepo packages
- `gw bindings` — Show all Cloudflare bindings (D1, KV, R2, DO)
- `gw doctor` — Diagnose environment issues
- `gw whoami` — Show current auth context
- `gw d1 tables` / `gw d1 schema <table>` — Database introspection
- `gw gh pr list` / `gw gh issue list` — GitHub reads
- `gw gh issue batch --write --from-json f` — Batch create issues from JSON

Run `gw --help` for full command list, `gw <command> --help` for details.

**Web/remote note:** `wrangler` and `gh` are not installed, so Cloudflare operations (`gw d1`, `gw deploy`) and GitHub operations (`gw gh`) won't work. Git commands, package listing, bindings scan, and doctor all work fine.

---

All project instructions, tech stack details, architecture notes, and workflow guidelines are in:

- **`AGENT.md`** - Main project instructions (read this first)
- **`AgentUsage/`** - Detailed workflow guides and best practices
- Special Reminder from the user:
  > This site is my authentic voice—warm, introspective, queer, unapologetically building something meaningful; write like you're helping me speak, not perform.
- Reminder from the User for when we Work:
  > Write with the warmth of a midnight tea shop and the clarity of good documentation—this is my space, make it feel like home.

---

## Design Context

### Users

Grove serves friends, queer creators, independent writers, and indie web enthusiasts who want their own space online—away from big tech algorithms and extractive platforms. Users arrive seeking refuge: a cozy, authentic place to write, share, and belong. They value ownership, community, and spaces that feel _genuinely_ theirs.

### Brand Personality

**Warm, introspective, queer.** Grove speaks like a trusted friend who runs a midnight tea shop—never performative, always sincere. The voice is:

- **Welcoming** — Every visitor should feel they've found somewhere safe
- **Grounded** — Confident without being loud, capable without being corporate
- **Authentic** — This is your space; we help you speak, not perform

### Emotional Goals

When someone lands on Grove, they should feel:

1. **Safe refuge** — A cozy shelter from the hostile internet
2. **Creative sanctuary** — An inspiring space to express freely
3. **Community belonging** — Part of something bigger, not alone

### Aesthetic Direction

**Nature-themed glassmorphism with seasonal depth.** The visual language evokes a forest clearing where digital and organic coexist peacefully.

**Core palette:** Grove greens, warm bark browns, soft cream neutrals
**Signature elements:** Randomized forests, falling petals/leaves/snow, glass surfaces over nature
**Seasons:** Spring (renewal), Summer (growth), Autumn (harvest/default), Winter (rest), Midnight (dreams)

**Reference feel:** Studio Ghibli's lived-in warmth meets a well-organized indie bookshop
**Anti-references:** Corporate SaaS sterility, social media engagement-bait, generic website builders

### Design Principles

1. **Content-first, decoration-second** — Nature elements enhance readability, never obstruct it. Glass surfaces create hierarchy while hinting at beauty beneath.

2. **Alive but not distracting** — Subtle animations, seasonal changes, and randomization create a living world. Everything respects `prefers-reduced-motion`.

3. **Accessible by design** — WCAG AA minimum, with special attention to reduced motion (all animation optional), screen reader excellence, and low vision support. Touch targets 44×44px minimum.

4. **Organic over rigid** — Soft corners (grove border radius), natural color progressions, hand-drawn-feeling nature components. Never sharp or corporate.

5. **Warm in dark mode too** — Dark mode isn't just inverted colors; it's "nature at night" with maintained warmth and character.

---

_This structure aligns with industry-standard agentic coding practices._
