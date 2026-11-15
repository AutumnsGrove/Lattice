# Verification & Visual Testing

> Extracted from `AGENT.md` — the authoritative reference for verifying code changes and visual output.

---

## MANDATORY: Agent Self-Verification Protocol

**After making ANY code changes, you MUST verify your work before committing.** Do not commit broken code.

```bash
# Step 1: Ensure dependencies are in sync
pnpm install

# Step 2: Run affected-only CI
gw dev ci --affected --fail-fast --diagnose
```

**When verification fails:** Read diagnostics, fix errors, re-run, repeat until clean, THEN commit.

**When to run:** After completing code changes (before commit), after PR review feedback (before push), after multi-file refactoring.

**When to skip:** Documentation-only changes (.md files only), configuration-only changes.

**This is non-negotiable.** Every workflow must end with verification before commit.

---

## Visual Verification (UI Work)

**When you build, modify, or review UI, you MUST look at the result.** CI passing is not the same as looking correct.

`glimpse` is Grove's Playwright screenshot tool. It injects the season and theme before the page renders, serves CDN fonts locally so shots work offline, and writes console output next to the image.

### One-time setup

```bash
pnpm install
pnpm exec playwright install chromium   # uses the workspace Playwright, not npx
```

Use `pnpm exec`, never `npx` — `npx` resolves its own copy and downloads a browser the workspace will never look for.

### Quick start (3 steps from cold start)

```bash
# 1. Seed the local database
./scripts/dev-stack.sh seed blog

# 2. Start the dev server (skip if it's already running)
./scripts/dev-stack.sh fast

# 3. Capture a page and look at it
bun run glimpse capture "http://localhost:5173/?subdomain=midnight-bloom" -s autumn -t dark --logs
```

The output path is printed. **Read the PNG** — that's the whole point. Each capture also writes `<image>.json` with the HTTP status, timings and console messages.

### Local routing

Locally, subdomains are simulated with a query parameter:

- `http://localhost:5173/?subdomain=midnight-bloom` — home
- `http://localhost:5173/garden?subdomain=midnight-bloom` — blog listing
- `http://localhost:5173/garden/some-post?subdomain=midnight-bloom` — blog post
- `http://localhost:5173/about?subdomain=midnight-bloom` — about page

### Data profiles

Seeding lives in `dev-stack.sh`, which was already the documented entry point. Pick the profile that matches what you're checking:

```bash
./scripts/dev-stack.sh seed blog        # curated Midnight Bloom blog (default)
./scripts/dev-stack.sh seed empty       # what a brand-new tenant sees
./scripts/dev-stack.sh seed fake 8      # random faker tenant with 8 posts
./scripts/dev-stack.sh seed fresh       # migrations only, no data
```

| Profile | Subdomain           | Use case                                                    |
| ------- | ------------------- | ----------------------------------------------------------- |
| `blog`  | `midnight-bloom`    | Default. Curated tea shop blog with known content           |
| `empty` | `empty-grove`       | Empty state testing — what does a blank site look like?     |
| `fake`  | _(random each run)_ | Random content — proves rendering works with arbitrary data |
| `fresh` | _(none)_            | Migrations only — no tenant data at all                     |

**Use `fake` to prove the UI handles real-world variation**, not just the one dataset it was designed around.

### Capture commands

```bash
# One page, with theme injection
bun run glimpse capture "http://localhost:5173/?subdomain=midnight-bloom" \
  -s autumn -t dark --logs

# Every season × theme combination
bun run glimpse matrix "http://localhost:5173/?subdomain=midnight-bloom" \
  --seasons autumn,winter --themes light,dark

# One element
bun run glimpse capture "http://localhost:5173/" -S "#hero"

# Mobile, from a device profile
bun run glimpse capture "http://localhost:5173/" --device "iPhone 13"
bun run glimpse devices                 # list the 140+ profiles

# Desktop at a specific width, viewport shot instead of full page
bun run glimpse capture "http://localhost:5173/" --viewport 1440x900 --windowed

# Machine-readable
bun run glimpse capture "http://localhost:5173/" --json
```

Flags: `-s/--season`, `-t/--theme`, `-g/--grove-mode`, `-S/--selector`, `--device`, `--viewport`, `--windowed`, `--logs`, `--wait`, `--timeout`, `--name`, `-o/--out`, `--no-inject`, `--json`.

### What to capture

- **Seasons matter.** A page that reads well in autumn can be unreadable in winter — the season swaps the palette. `matrix` catches that; a single capture does not.
- **Both themes.** Dark and light are separate designs, not an inversion.
- **Both sizes.** Full page desktop _and_ a mobile device profile.
- **Authenticated pages.** With `DEV_AUTH_ENABLED=true` in `apps/aspen/.dev.vars`, aspen honours an `x-grove-dev-auth` JSON header on localhost. That's how you screenshot a logged-in page without Heartwood running.

### The iterate loop

Capture → read the screenshot → fix → capture again. Don't ship UI you haven't seen.

### Component-level work

There is no isolated component audit any more — Showroom was removed in #1654 (30 fixtures for 305 components, nothing enforced it). Instead:

- Capture the page or element where the component actually renders (`-S <selector>` helps).
- Check the component against `DESIGN.md` by hand: colour tokens rather than hardcoded values, spacing on the 4px grid, type from the scale, visible focus styles, no skipped heading levels, alt text on images.
- Pre-commit hooks already enforce the mechanical subset: accent colours, Prism icons, engine barrels.

If isolated component work becomes a real need again, that's a new tool — not a resurrection of a gate nobody passed.
