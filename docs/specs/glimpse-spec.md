---
aliases: []
date created: Friday, February 7th 2026
date modified: Tuesday, February 25th 2026
lastUpdated: '2026-02-25'
tags:
  - tooling
  - screenshots
  - playwright
  - developer-tools
  - ai-vision
  - verification
  - console-logs
  - dev-server
type: tech-spec
---

# Glimpse — Verification Loops for the Grove

```
                      🌲         🌲
                       \    👁    /
                        \   |   /
                         \  |  /
                    ╭─────╲─┼─╱─────╮
                    │      ╲│╱      │
                    │   ┌───────┐   │
                    │   │ 📸 📋 │   │
                    │   │  ···  │   │
                    │   │  ···  │   │
                    │   └───────┘   │
                    │               │
                    ╰───────┬───────╯
                            │
                    ╭───────┴───────╮
                    │  peek · check │
                    │  walk · tend  │
                    │  see  · know  │
                    ╰───────────────╯

          A quick peek through the trees.
          Then step inside and look around.
```

> *A quick peek through the trees. Then step inside and look around.*

Glimpse is the development verification companion for the Grove ecosystem. Point it at a page and it hands you a screenshot. Add `--logs` and it captures every console error alongside that screenshot. Add `--auto` and it starts the dev server for you. Tell it to `browse` and it walks through the page, clicking links and filling forms, reporting what it finds.

One tool. Five capabilities. One loop: change, look, fix, repeat.

**Public Name:** Glimpse
**Internal Name:** GroveGlimpse
**Package:** `tools/glimpse/` (Python + UV)
**CLI Name:** `glimpse`
**Last Updated:** February 2026

In a forest, a glimpse is what you catch between the branches. A flash of color. A shape half-hidden. Glimpse started as a field naturalist's camera, capturing those moments on demand in any season and light. Now it goes further. It steps inside the grove, checks the soil, listens for broken branches, and walks the paths. It sees what you see, and tells you what you missed.

---

## Overview

### What This Is

Glimpse is the tool that closes the feedback loop in AI-assisted development. It gives Claude Code (and human developers) the ability to see pages, read browser errors, interact with UI, and verify that changes actually work. The bottleneck in AI-assisted development is not idea quality. It is feedback loop quality.

### Why This Exists

Without Glimpse, development looks like this:

```
Code change → typecheck → lint → unit test → commit → deploy → look at it → "oh no"
```

With Glimpse:

```
Code change → glimpse capture --logs → see it + read errors → fix → repeat → commit
```

The difference is catching a broken sidebar before it reaches production, not after.

### Goals

1. **See the page** — Screenshot any Grove page, local or production, in any season and theme
2. **Read the errors** — Capture browser console output (errors, warnings, logs) alongside screenshots
3. **Walk the grove** — Browse interactively with natural language ("click the Posts tab, screenshot")
4. **Tend the data** — Bootstrap local D1 databases with migrations and seed data so pages render content
5. **Manage the server** — Detect running dev servers, optionally start them, wait for readiness
6. **Full theme matrix** — Generate all season + theme combinations automatically
7. **Element targeting** — Capture specific components by CSS selector or natural language
8. **Batch operations** — YAML config files for repeatable screenshot runs
9. **Agent-friendly** — Clean output mode for automated pipelines
10. **Smart detection** — Optional AI-powered element finding via Lumen Gateway

### Non-Goals

- Video capture or screen recording
- Live site monitoring or uptime checks
- Full browser DevTools replacement (Glimpse captures console output, not network traces or memory profiles)
- Running unit tests or typechecks (that is `gw dev ci`, not Glimpse)
- Deploying code (that is `gw git ship`, not Glimpse)

---

## The Verification Loop

This is the core concept. Everything in Glimpse exists to serve this loop.

```
    ╭──────────────────────────────────────────────────────╮
    │                  THE VERIFICATION LOOP                │
    │                                                      │
    │   ┌─────────┐    ┌─────────┐    ┌─────────┐         │
    │   │  CHANGE │───→│  PEEK   │───→│  CHECK  │         │
    │   │         │    │         │    │         │         │
    │   │ Edit    │    │ Screenshot  │ Console │         │
    │   │ code    │    │ the page │    │ errors? │         │
    │   └─────────┘    └─────────┘    └────┬────┘         │
    │       ▲                              │              │
    │       │          ╭───────╮           │              │
    │       │     NO   │       │   YES     │              │
    │       ╰──────────│ GOOD? │◀──────────╯              │
    │                  │       │                          │
    │                  ╰───┬───╯                          │
    │                      │ YES                          │
    │                      ▼                              │
    │                 ┌─────────┐                         │
    │                 │ COMMIT  │                         │
    │                 └─────────┘                         │
    ╰──────────────────────────────────────────────────────╯
```

### The Four Tiers

Each tier builds on the last. Tier 1 alone catches the majority of visual bugs.

| Tier | Name | What It Does | Command |
|------|------|-------------|---------|
| **1. Peek** | See the page | Screenshot + console logs from a local or live page | `glimpse capture --logs` |
| **2. Walk** | Browse the grove | Navigate, click, fill forms, screenshot at each step | `glimpse browse --do "..."` |
| **3. Tend** | Prepare the soil | Seed local D1 with migrations and test data | `glimpse seed` |
| **4. Know** | Check readiness | Report whether dev server, DB, and browser are ready | `glimpse status` |

### In Practice (Agent Workflow)

Here is what a verification cycle looks like when Claude Code is working on the arbor page:

```bash
# 1. Claude edits libs/engine/src/routes/arbor/+page.svelte
# 2. Claude runs verification
glimpse capture http://localhost:5173/arbor?subdomain=autumn \
  --logs --auto --season autumn --theme dark \
  -o /tmp/arbor-check.png

# 3. Claude reads the screenshot (vision) and console output
#    "The sidebar is overlapping content. Console: TypeError at +page.svelte:28"

# 4. Claude fixes the issues and runs again
glimpse capture http://localhost:5173/arbor?subdomain=autumn \
  --logs -o /tmp/arbor-check-2.png

# 5. Screenshot looks correct, no console errors. Commit.
```

### In Practice (Interactive Browsing)

```bash
# Claude needs to verify a multi-step flow
glimpse browse http://localhost:5173/arbor?subdomain=autumn \
  --do "click the Posts navigation link, then click the first post title" \
  --logs --auto

# Glimpse returns: screenshots at each step + console output
# Claude sees the navigation worked, the post rendered correctly
```

---

## Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              glimpse CLI                                 │
│                                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ capture  │ │ browse   │ │ seed     │ │ status   │ │ matrix   │      │
│  │ (screenshot│ (interact)│ │ (data)   │ │ (ready?) │ │ (combos) │      │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘      │
│       │             │            │             │            │            │
│  ┌────┴─────┐ ┌─────┴────┐ ┌────┴─────┐      │            │            │
│  │ batch    │ │ detect   │ │ install  │      │            │            │
│  │ (YAML)   │ │ (AI)     │ │ (browser)│      │            │            │
│  └────┬─────┘ └────┬─────┘ └──────────┘      │            │            │
│       │             │                         │            │            │
│       └──────┬──────┘                         │            │            │
│              │                                │            │            │
│              ▼                                ▼            │            │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │            │
│  │    Playwright Engine    │  │    Server Manager       │  │            │
│  │                         │  │                         │  │            │
│  │  Navigate · Inject      │  │  Detect · Start · Wait  │  │            │
│  │  Screenshot · Listen    │  │  Health check · Stop    │  │            │
│  │  Click · Fill · Browse  │  │                         │  │            │
│  └──────────┬──────────────┘  └─────────────────────────┘  │            │
│             │                                              │            │
│             ▼                                              │            │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │            │
│  │    Theme Injector       │  │    Data Bootstrapper    │◀─┘            │
│  │                         │  │                         │               │
│  │  Season · Theme · Grove │  │  Migrate · Seed · Reset │               │
│  │  localStorage pre-seed  │  │  Local D1 / KV / R2     │               │
│  └─────────────────────────┘  └─────────────────────────┘               │
│             │                                                           │
│             ▼                                                           │
│  ┌─────────────────────────┐  ┌─────────────────────────┐               │
│  │    Console Collector    │  │    Smart Detector       │               │
│  │                         │  │                         │               │
│  │  Errors · Warnings      │  │  A11y tree → CSS match  │               │
│  │  Logs · Uncaught exn    │  │  → Vision AI (Lumen)    │               │
│  └─────────────────────────┘  └─────────────────────────┘               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Output               │
              │  ├─ screenshots/*.png  │
              │  ├─ console.log       │
              │  └─ status.json       │
              └───────────────────────┘
```

### Layer 1: Playwright Engine

The foundation. One browser instance with multiple contexts for parallel captures.

```python
async with async_playwright() as p:
    browser = await p.chromium.launch(headless=True)

    # Each capture gets its own context (isolated cookies/storage)
    context = await browser.new_context(
        viewport={"width": 1920, "height": 1080},
        device_scale_factor=2,  # Retina
    )
    page = await context.new_page()
```

**Why Playwright over shot-scraper:** We need Grove-specific theme injection, console log capture, interactive browsing, the accessibility tree for smart detection, and parallel capture via asyncio. shot-scraper is a great general tool, but Glimpse needs to understand Grove's internals.

### Layer 2: Theme Injector

Before capturing, Glimpse pre-seeds localStorage so Svelte stores pick up the correct values on first render. No flash of default theme.

```python
# Pre-seed localStorage before any page loads
await context.add_init_script("""
    localStorage.setItem('grove-season', 'winter');
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
""")
await page.goto(url)
await page.wait_for_timeout(wait_ms)
```

Two approaches, chosen based on timing:

- **Pre-navigation seeding** (preferred): Set localStorage via `context.add_init_script()` before `page.goto()`. Page loads with correct state already set.
- **Post-navigation injection**: For when the page is already loaded. Inject JS, dispatch StorageEvent, wait for CSS transitions.

### Layer 3: Console Collector

The key insight from the verification loop: screenshots show what looks wrong, console logs show *why* it is wrong. When `--logs` is passed, Glimpse hooks into Playwright's console event listener before navigation.

```python
console_messages: list[ConsoleMessage] = []

def on_console(msg):
    console_messages.append(ConsoleMessage(
        level=msg.type,           # "error", "warning", "log", "info", "debug"
        text=msg.text,
        url=msg.location.get("url", ""),
        line=msg.location.get("lineNumber", 0),
        col=msg.location.get("columnNumber", 0),
    ))

page.on("console", on_console)
page.on("pageerror", lambda exc: console_messages.append(
    ConsoleMessage(level="error", text=f"Uncaught: {exc.message}")
))
```

**What gets captured:**

| Event | Source | Example |
|-------|--------|---------|
| `console` with type `error` | `console.error()` calls | `"Failed to load resource: 404"` |
| `console` with type `warning` | `console.warn()` calls | `"Deprecation: use seasonStore.set()"` |
| `console` with type `log`/`info` | `console.log()` calls | `"[HMR] updated /arbor/+page.svelte"` |
| `pageerror` | Uncaught exceptions | `"TypeError: Cannot read 'name' of undefined"` |

**Output format (agent mode):**

```
screenshots/arbor-autumn-dark.png
[ERROR] Uncaught TypeError: Cannot read property 'name' of undefined (arbor/+page.svelte:42:15)
[ERROR] Failed to load resource: /api/curios/timeline (404)
[WARN] Missing alt text on img.hero-banner
```

**Output format (JSON mode):**

```json
{
  "output": "screenshots/arbor-autumn-dark.png",
  "console": [
    {
      "level": "error",
      "text": "Uncaught TypeError: Cannot read property 'name' of undefined",
      "url": "arbor/+page.svelte",
      "line": 42,
      "col": 15
    }
  ],
  "error_count": 2,
  "warning_count": 1
}
```

### Layer 4: Server Manager

Glimpse needs a page to look at. The Server Manager handles the lifecycle of local dev servers so the agent does not have to manage background processes manually.

```
glimpse capture http://localhost:5173/arbor --auto
    │
    ▼
Port 5173 reachable? ── YES ──→ Proceed to capture
    │
    NO
    │
    ▼
Detect project type
    │
    ├─ libs/engine/package.json has "dev:wrangler" → pnpm dev:wrangler
    ├─ apps/*/package.json has "dev" → vite dev
    └─ Unknown → error: "Cannot auto-start, run your dev server manually"
    │
    ▼
Start process (background, stdout/stderr to log file)
    │
    ▼
Health poll: GET http://localhost:{port}/ every 500ms
    │
    ├─ 200 within 30s → Proceed to capture
    └─ Timeout → error: "Dev server failed to start within 30s"
```

**Behavior:**

- Without `--auto`: Glimpse checks if the target URL is reachable. If not, it reports the error and exits. The caller starts the server.
- With `--auto`: Glimpse starts the appropriate dev server, waits for it, captures, and leaves the server running. Subsequent calls reuse the running server.
- `glimpse stop`: Tears down any server Glimpse started. Useful for cleanup.

**Process tracking:** Glimpse writes a PID file to `.glimpse/server.pid` so it can detect and stop servers it started. It never kills servers it did not start.

### Layer 5: Data Bootstrapper

Pages with no data render empty shells. The Data Bootstrapper ensures local D1 databases have migrations applied and test content seeded.

```
glimpse seed
    │
    ▼
Detect GROVE_ROOT (or cwd)
    │
    ▼
Apply migrations (all three databases)
    ├─ wrangler d1 migrations apply grove-engine-db --local
    ├─ wrangler d1 migrations apply grove-curios-db --local
    └─ wrangler d1 migrations apply grove-observability-db --local
    │
    ▼
Apply seed scripts
    ├─ scripts/db/seed-midnight-bloom.sql (default test tenant)
    └─ scripts/db/add-midnight-bloom-pages.sql (additional content)
    │
    ▼
Verify: query tenant count, post count, page count
    │
    ▼
Report: "Seeded 1 tenant, 5 pages, 3 posts"
```

**Seed data targets:**

| Database | Binding | What Gets Seeded |
|----------|---------|-----------------|
| `grove-engine-db` | `DB` | Test tenant (subdomain: `autumn`), pages, posts, site settings |
| `grove-curios-db` | `CURIO_DB` | Timeline entries, gallery items (if seed scripts exist) |
| `grove-observability-db` | `OBS_DB` | Empty (migrations only, no seed data needed) |

**The test tenant:** Subdomain `autumn`, display name "The Midnight Bloom", a tea-shop themed blog with home page, about page, and sample posts. Access locally at `http://localhost:5173/?subdomain=autumn`.

### Layer 6: Interactive Browser

Beyond screenshots, Glimpse can walk through pages. The `browse` command accepts natural language instructions and translates them into Playwright actions.

```
glimpse browse http://localhost:5173/arbor?subdomain=autumn \
  --do "click the Posts link in the navigation, then click the first post"
    │
    ▼
Parse instructions into action steps
    │
    ▼
For each step:
    ├─ 1. Resolve target element (a11y tree → CSS heuristics → Lumen)
    ├─ 2. Execute action (click, fill, hover, scroll)
    ├─ 3. Wait for navigation/render settle
    ├─ 4. Capture screenshot (if --screenshot-each)
    └─ 5. Collect console messages
    │
    ▼
Final screenshot + all console output
```

**Action interpretation pipeline:**

1. **Local heuristics first.** Common patterns are parsed without AI: "click X" → find element matching X and click it. "fill Y with Z" → find input matching Y and type Z. "scroll down" → page scroll. "wait" → pause.

2. **A11y tree matching.** The instruction mentions "the Posts link" — Glimpse snapshots the accessibility tree and finds the link with name matching "Posts". This handles the majority of cases.

3. **Lumen fallback.** If the a11y tree and heuristics cannot resolve the target, Glimpse sends the current screenshot + accessibility tree + instruction to Lumen Gateway. The LLM returns a specific selector or coordinates.

**Why natural language over scripts:** Claude Code thinks in natural language. Forcing it to write Playwright selectors adds friction and introduces selector-brittleness. "Click the Posts link" works even if the CSS class changes.

**Screenshot behavior:**

- Default: screenshot after the final step only
- `--screenshot-each`: screenshot after every step (returns multiple images)
- Screenshots are numbered: `browse-step-1.png`, `browse-step-2.png`, etc.

### Layer 7: Smart Detector

For natural-language element targeting ("capture the hero section"), Glimpse uses a three-step fallback chain. This is the same resolution pipeline used by the Interactive Browser for finding click targets.

```
┌─────────────────────────────────────────────────────────┐
│                   Smart Detection                        │
│                                                          │
│   Step 1: Accessibility Tree (instant, free)             │
│   ┌─────────────────────────────────┐                    │
│   │ page.accessibility.snapshot()   │                    │
│   │ → Search for matching role/name │                    │
│   │ → Get element bounds            │                    │
│   └────────────────┬────────────────┘                    │
│                    │ Not found?                           │
│                    ▼                                      │
│   Step 2: CSS Heuristics (instant, free)                 │
│   ┌─────────────────────────────────┐                    │
│   │ Map natural language → selectors│                    │
│   │ "hero" → [role=banner], .hero   │                    │
│   │ "footer" → footer, [role=foot]  │                    │
│   │ "nav" → nav, [role=navigation]  │                    │
│   └────────────────┬────────────────┘                    │
│                    │ Not found?                           │
│                    ▼                                      │
│   Step 3: Vision AI via Lumen (slow, costs $)            │
│   ┌─────────────────────────────────┐                    │
│   │ Screenshot + a11y tree          │                    │
│   │ → Send to Lumen Gateway         │                    │
│   │ → LLM returns selector/coords   │                    │
│   │ → Resolve to element            │                    │
│   └─────────────────────────────────┘                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Lumen Gateway integration:** Glimpse calls the Lumen API with the screenshot, the accessibility tree, and a text prompt. The gateway routes to the configured model (recommended: Gemini 2.5 Flash for bounding boxes, or OmniParser V2 for UI-specific parsing).

**Why the fallback chain matters:** The accessibility tree handles 90% of well-structured pages instantly and for free. CSS heuristics catch common patterns. Vision AI is the expensive last resort for pages where the DOM does not tell the story.

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Language | Python 3.12+ | Async-native, Playwright has excellent Python bindings |
| Browser automation | Playwright | Console capture, a11y tree, multi-context, async |
| CLI framework | Click | Lazy loading, context objects, matches gw/gf pattern |
| Terminal output | Rich | Progress bars, panels, tables, colored output |
| Config parsing | tomli | TOML for `.glimpse.toml` project config |
| Batch config | PyYAML | YAML for batch screenshot configs |
| AI integration | httpx | Async HTTP for Lumen Gateway calls |
| Package manager | UV | Fast Python packaging, matches existing tools |

---

## CLI Interface

### Installation

```bash
uv tool install --editable tools/glimpse
```

Installs the `glimpse` command globally. Follows the same pattern as `gw` and `gf`.

### Global Options

These apply to all commands:

| Flag | Default | Description |
|------|---------|-------------|
| `--agent` | false | Agent-friendly output (bare paths, errors on stderr) |
| `--json` | false | Machine-readable JSON output |
| `--verbose` | false | Debug-level output |
| `--auto` | false | Auto-start dev server if target URL is unreachable |
| `--logs` | false | Capture browser console output alongside screenshots |

### Commands

#### `glimpse capture` — Screenshot with Verification

The core command. Takes a screenshot and optionally captures console output.

```bash
# Basic capture (production URL)
glimpse capture https://grove.place

# Local dev with theme control
glimpse capture http://localhost:5173/?subdomain=autumn \
  --season autumn --theme dark

# Verification mode: screenshot + console logs + auto-start server
glimpse capture http://localhost:5173/arbor?subdomain=autumn \
  --logs --auto -o /tmp/arbor-check.png

# Specific element
glimpse capture http://localhost:5173/?subdomain=autumn \
  --selector ".hero-section" --logs

# Full-page scroll capture
glimpse capture https://grove.place --full-page

# JPEG output with quality
glimpse capture https://grove.place -o hero.jpg --quality 85
```

**Options:**

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--season` | `-s` | (site default) | Season: spring, summer, autumn, winter, midnight |
| `--theme` | `-t` | (site default) | Theme: light, dark, system |
| `--grove-mode` | `-g` | (site default) | Enable/disable grove terminology |
| `--selector` | `-S` | (full page) | CSS selector to capture |
| `--output` | `-o` | auto-generated | Output file path |
| `--width` | `-w` | 1920 | Viewport width |
| `--height` | `-h` | 1080 | Viewport height |
| `--scale` | | 2 | Device scale factor (1 for 1x, 2 for retina) |
| `--full-page` | `-f` | false | Capture entire scrollable page |
| `--wait` | | 500 | Wait time (ms) after theme injection |
| `--quality` | `-q` | 90 | JPEG quality (1-100, ignored for PNG) |
| `--format` | | png | Output format: png, jpeg |
| `--no-inject` | | false | Skip theme injection (capture as-is) |

#### `glimpse browse` — Interactive Verification

Navigate pages, click elements, fill forms. Takes natural language instructions and executes them as Playwright actions, capturing screenshots and console output along the way.

```bash
# Single interaction
glimpse browse http://localhost:5173/arbor?subdomain=autumn \
  --do "click the Posts link in the sidebar"

# Multi-step flow
glimpse browse http://localhost:5173/arbor?subdomain=autumn \
  --do "click Posts, then click the first post title, then scroll down" \
  --logs --auto

# Screenshot at every step (not just the final state)
glimpse browse http://localhost:5173/arbor?subdomain=autumn \
  --do "click Settings, toggle dark mode, scroll to the bottom" \
  --screenshot-each --logs

# With theme control
glimpse browse http://localhost:5173/?subdomain=autumn \
  --do "click the About link in the navigation" \
  --season autumn --theme dark
```

**Options:**

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--do` | `-d` | (required) | Natural language instruction string |
| `--screenshot-each` | | false | Screenshot after every action step |
| `--timeout` | | 5000 | Per-action timeout in ms |

Plus all `capture` options (season, theme, viewport, output, etc.)

**Action vocabulary:**

| Instruction pattern | Playwright action |
|-------------------|-------------------|
| "click X" | Resolve X via smart detection, `locator.click()` |
| "fill X with Y" | Resolve input X, `locator.fill(Y)` |
| "type Y into X" | Same as fill |
| "hover over X" | `locator.hover()` |
| "scroll down/up" | `page.mouse.wheel()` |
| "wait" / "wait 2s" | `page.wait_for_timeout()` |
| "press Enter/Tab/Escape" | `page.keyboard.press()` |
| "go to /path" | `page.goto()` |

Unrecognized patterns fall through to the Lumen Gateway for LLM interpretation.

#### `glimpse seed` — Bootstrap Local Data

Ensures local D1 databases have migrations applied and test content seeded.

```bash
# Apply migrations + default seed data
glimpse seed

# Reset everything (drop and recreate)
glimpse seed --reset

# Seed a specific test tenant only
glimpse seed --tenant midnight-bloom

# Dry run (show what would be executed)
glimpse seed --dry-run

# Specific database only
glimpse seed --db engine
glimpse seed --db curios
```

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `--reset` | false | Drop all local D1 data and recreate from scratch (requires `--yes` or interactive confirmation) |
| `--yes` | false | Skip confirmation prompt for destructive operations (`--reset`) |
| `--tenant` | all | Seed only a specific test tenant |
| `--dry-run` | false | Show SQL that would be executed |
| `--db` | all | Target specific database: engine, curios, observability |

**Destructive-action safety:** `--reset` is destructive — it drops all local D1 tables and re-seeds from scratch. When invoked without `--yes`, Glimpse prints a summary of what will be destroyed and prompts:

```
⚠ This will drop all local D1 data and recreate from scratch.
  Databases: engine, curios, observability
  Are you sure? [y/N]
```

In agent mode (`--agent`) or non-interactive shells where stdin is not a TTY, `--reset` without `--yes` exits with code 1 and the message: `[FAIL] --reset requires --yes in non-interactive mode`.

**Seed scripts directory:** `scripts/db/` in the monorepo root. Glimpse discovers scripts by convention:

```
scripts/db/
├── seed-midnight-bloom.sql       # Default test tenant
├── add-midnight-bloom-pages.sql  # Additional pages
├── seed-curios-timeline.sql      # Timeline entries (future)
└── seed-curios-gallery.sql       # Gallery items (future)
```

#### `glimpse status` — Readiness Check

Reports whether the development environment is ready for verification.

```bash
glimpse status
```

**D1 database check mechanism:** Glimpse reads the local D1 SQLite files directly from `.wrangler/state/v3/d1/` rather than shelling out to `wrangler d1 execute --local`. Direct SQLite reads are faster (~5ms vs ~2s), have no dependency on wrangler being installed, and avoid wrangler's stdout formatting. Glimpse runs `SELECT count(*) FROM sqlite_master WHERE type='table'` to verify migrations and `SELECT count(*) FROM tenants` (etc.) for seed counts. If the SQLite file does not exist, the database is reported as "not seeded."

**Output (human mode):**

```
  Glimpse Status

  Browser:    ✓ Chromium installed (playwright 1.42)
  Dev server: ✓ Running on localhost:5173
  Database:   ✓ Local D1 seeded (1 tenant, 5 pages, 3 posts)
  Config:     ✓ .glimpse.toml found

  Ready for verification.
```

```
  Glimpse Status

  Browser:    ✓ Chromium installed (playwright 1.42)
  Dev server: ✗ Not running on localhost:5173
  Database:   ✗ Local D1 not seeded (run: glimpse seed)
  Config:     ─ No .glimpse.toml (using defaults)

  Run: glimpse seed && bun run dev (in libs/engine/)
```

**Output (JSON mode):**

```json
{
  "browser": { "installed": true, "version": "1.42" },
  "server": { "running": false, "port": 5173 },
  "database": { "seeded": false, "tenants": 0, "posts": 0 },
  "config": { "found": false, "path": null },
  "ready": false,
  "suggestions": ["glimpse seed", "cd libs/engine && pnpm dev:wrangler"]
}
```

#### `glimpse matrix` — All Theme Combinations

```bash
# Generate all 10 combinations (5 seasons x 2 themes)
glimpse matrix https://grove.place

# Specific seasons only
glimpse matrix https://grove.place --seasons autumn,winter,midnight

# With console log capture
glimpse matrix http://localhost:5173/?subdomain=autumn --logs

# Custom output directory
glimpse matrix https://grove.place -o screenshots/matrix/
```

**Output naming:** `{slug}-{season}-{theme}.png`

**Parallel execution:** Uses `asyncio.gather()` to capture multiple combinations simultaneously. Configurable concurrency limit (default: 4).

#### `glimpse batch` — Batch from Config

```bash
# Run batch config
glimpse batch screenshots.yaml

# Dry run (show what would be captured)
glimpse batch screenshots.yaml --dry-run
```

**Config format:**

```yaml
# screenshots.yaml
defaults:
  viewport:
    width: 1920
    height: 1080
  scale: 2
  wait: 500
  format: png
  output_dir: screenshots/
  logs: true  # Capture console for all captures

captures:
  - url: http://localhost:5173/?subdomain=autumn
    name: homepage
    season: autumn
    theme: dark

  - url: http://localhost:5173/arbor?subdomain=autumn
    name: arbor-dashboard
    season: autumn
    theme: dark

  - url: http://localhost:5173/about?subdomain=autumn
    name: about
    matrix: true  # All season x theme combos

  - url: http://localhost:5173/?subdomain=autumn
    name: homepage-mobile
    viewport:
      width: 390
      height: 844  # iPhone 14 Pro
    season: autumn
    theme: dark
```

#### `glimpse detect` — AI-Powered Element Detection

```bash
# Natural language element targeting
glimpse detect https://grove.place "the hero section with the forest background"

# With theme control
glimpse detect https://grove.place "navigation bar" --season winter --theme dark

# Show detection overlay (draws bounding box on image)
glimpse detect https://grove.place "pricing cards" --overlay

# Just return coordinates (for scripting)
glimpse detect https://grove.place "footer" --coords-only
```

**Requires:** Lumen Gateway access (configured via environment variable or `.glimpse.toml`).

#### `glimpse install` — Install Browser

```bash
# Install Playwright's Chromium (first-time setup)
glimpse install
```

Wraps `playwright install chromium` with a friendly message and progress bar.

#### `glimpse stop` — Stop Managed Server

```bash
# Stop any dev server that Glimpse started via --auto
glimpse stop
```

Only stops servers that Glimpse itself started (tracked via `.glimpse/server.pid`). Never kills servers started by the developer directly.

---

## Configuration

### `.glimpse.toml`

Optional project-level config file. Checked in the current directory, then `GROVE_ROOT`.

```toml
[defaults]
viewport_width = 1920
viewport_height = 1080
scale = 2
wait = 500
format = "png"
output_dir = "screenshots/"
logs = false             # Default --logs behavior

[theme]
# Default theme state for captures
season = "autumn"
theme = "light"
grove_mode = false

[server]
# Dev server management
port = 5173
start_command = "pnpm dev:wrangler"
start_cwd = "libs/engine"         # Relative to GROVE_ROOT
health_url = "http://localhost:5173"
health_timeout = 30000            # ms to wait for server startup
pid_file = ".glimpse/server.pid"

[seed]
# Data bootstrapping
scripts_dir = "scripts/db"
default_tenant = "midnight-bloom"
migrations_dir = "libs/engine/migrations"

[lumen]
# Lumen Gateway for smart detection + browse intent parsing
gateway_url = "https://lumen.grove.place/api"
model = "gemini-flash"  # or "omniparser", "grounding-dino"
# API key loaded from LUMEN_API_KEY env var

[browser]
# Playwright browser settings
headless = true
browser = "chromium"  # chromium, firefox, webkit
timeout = 30000       # Navigation timeout in ms
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `LUMEN_API_KEY` | API key for Lumen Gateway (smart detection + browse) |
| `GLIMPSE_OUTPUT_DIR` | Override default output directory |
| `GLIMPSE_AGENT` | Set to "1" for agent-friendly output |
| `GROVE_ROOT` | Grove monorepo root (for config discovery, seed scripts) |

---

## Output Modes

Following the gw/gf pattern, Glimpse supports three output modes.

### Human Mode (default)

```
  Glimpse — localhost:5173/arbor?subdomain=autumn

  Season:  autumn 🍂
  Theme:   dark 🌙
  Size:    1920×1080 @2x

  ✓ Captured → screenshots/arbor-autumn-dark.png (1.2 MB)
```

With `--logs`:

```
  Glimpse — localhost:5173/arbor?subdomain=autumn

  Season:  autumn 🍂
  Theme:   dark 🌙
  Size:    1920×1080 @2x

  ✓ Captured → screenshots/arbor-autumn-dark.png (1.2 MB)

  Console (2 errors, 1 warning):
  ✗ [ERROR] Uncaught TypeError: Cannot read 'name' of undefined
            arbor/+page.svelte:42:15
  ✗ [ERROR] Failed to load resource: /api/curios/timeline (404)
  ⚠ [WARN]  Missing alt text on img.hero-banner
```

### Agent Mode (`--agent`)

```
screenshots/arbor-autumn-dark.png
```

With `--logs`, errors and warnings appear on subsequent lines:

```
screenshots/arbor-autumn-dark.png
[ERROR] Uncaught TypeError: Cannot read 'name' of undefined (arbor/+page.svelte:42:15)
[ERROR] Failed to load resource: /api/curios/timeline (404)
[WARN] Missing alt text on img.hero-banner
```

This format is designed for Claude Code: the first line is the screenshot path (read it with vision), subsequent lines are parseable diagnostics.

**Failure contract (agent mode):**

When a capture or browse fails, Glimpse writes a `[FAIL]` line to stdout and exits with a non-zero code. The consumer (Claude Code) can rely on this stable format:

```
[FAIL] Server not reachable: localhost:5173 (connection refused)
```

```
[FAIL] Screenshot not written: navigation timeout after 30000ms
```

```
[FAIL] Browse action failed at step 2: element not found (selector: .sidebar-posts)
```

The pattern is always `[FAIL] <category>: <detail>`. Exit codes: `1` for operational failures (server down, timeout, element not found), `2` for configuration errors (invalid URL, missing browser).

### JSON Mode (`--json`)

```json
{
  "url": "http://localhost:5173/arbor?subdomain=autumn",
  "output": "screenshots/arbor-autumn-dark.png",
  "season": "autumn",
  "theme": "dark",
  "viewport": { "width": 1920, "height": 1080 },
  "scale": 2,
  "size_bytes": 1258291,
  "duration_ms": 4250,
  "console": [
    {
      "level": "error",
      "text": "Uncaught TypeError: Cannot read 'name' of undefined",
      "url": "arbor/+page.svelte",
      "line": 42,
      "col": 15
    },
    {
      "level": "error",
      "text": "Failed to load resource: /api/curios/timeline",
      "url": "",
      "line": 0,
      "col": 0
    },
    {
      "level": "warning",
      "text": "Missing alt text on img.hero-banner",
      "url": "",
      "line": 0,
      "col": 0
    }
  ],
  "error_count": 2,
  "warning_count": 1,
  "log_count": 0
}
```

The `console` array is only populated when `--logs` is used. Without it, the field is omitted.

---

## Theme Injection Details

### How the Stores Work

Grove's visual state is controlled by three Svelte 5 stores that persist to localStorage:

| Store | localStorage Key | Values | Effect |
|-------|-----------------|--------|--------|
| `seasonStore` | `grove-season` | spring, summer, autumn, winter, midnight | Nature component colors, seasonal decorations |
| `themeStore` | `theme` | light, dark, system | `.dark` class on `<html>`, CSS variable swap |
| `groveModeStore` | `grove-mode` | true, false | Terminology (Grove terms vs standard terms) |

See **Layer 2: Theme Injector** in the Architecture section for injection strategy and code examples.

### Wait Strategies

```
Page Load ──→ Theme Inject ──→ Wait ──→ Capture
                                │
                         ┌──────┴──────┐
                         │  Strategy   │
                         ├─────────────┤
                         │ fixed       │  wait N ms (default)
                         │ networkidle │  wait for no network activity
                         │ selector    │  wait for element to appear
                         │ animation   │  wait for CSS animations to end
                         └─────────────┘
```

Default: `fixed` at 500ms. Configurable per-capture in batch configs.

---

## Smart Detection API

See **Layer 7: Smart Detector** in the Architecture section for the fallback chain (a11y → heuristics → Lumen). This section documents the Lumen Gateway wire format.

### Request to Lumen Gateway

```json
{
  "model": "gemini-flash",
  "task": "bounding_box",
  "image": "<base64 screenshot>",
  "prompt": "Find the hero section with the forest background",
  "format": "normalized"
}
```

### Response from Lumen Gateway

```json
{
  "boxes": [
    {
      "label": "hero section",
      "confidence": 0.92,
      "bounds": {
        "x": 0.0,
        "y": 0.05,
        "width": 1.0,
        "height": 0.45
      }
    }
  ],
  "model": "gemini-2.5-flash",
  "latency_ms": 8500
}
```

Bounds are normalized 0-1 coordinates. Glimpse converts these to pixel coordinates based on viewport size, then uses Playwright's `page.screenshot(clip={...})` to capture just that region.

### Model Recommendations

| Model | Speed | Cost | Best For |
|-------|-------|------|----------|
| **Gemini 2.5 Flash** | 8-12s | ~$0.002/detection | General element finding, native bbox support |
| **OmniParser V2** | 0.6-0.8s | ~$0.0004/run | UI-specific parsing, structured element maps |
| **Grounding DINO** | 100-500ms | Free (self-hosted) | Fastest, needs GPU, open vocabulary |

---

## File Structure

```
tools/glimpse/
├── src/glimpse/
│   ├── __init__.py
│   ├── __main__.py              # python -m glimpse
│   ├── cli.py                   # Click app, command registration
│   ├── config.py                # TOML config loading, defaults
│   │
│   ├── capture/
│   │   ├── __init__.py
│   │   ├── engine.py            # Playwright wrapper, browser management
│   │   ├── injector.py          # Theme/season localStorage pre-seeding
│   │   ├── screenshot.py        # Screenshot capture logic
│   │   └── console.py           # Console message collection + formatting
│   │
│   ├── browse/
│   │   ├── __init__.py
│   │   ├── interpreter.py       # Natural language → action steps
│   │   ├── executor.py          # Execute action steps via Playwright
│   │   └── resolver.py          # Resolve targets (a11y → heuristics → Lumen)
│   │
│   ├── server/
│   │   ├── __init__.py
│   │   ├── manager.py           # Dev server lifecycle (start/stop/detect)
│   │   └── health.py            # Health polling, readiness checks
│   │
│   ├── seed/
│   │   ├── __init__.py
│   │   ├── bootstrap.py         # Migration + seed orchestration
│   │   └── discovery.py         # Find seed scripts, detect databases
│   │
│   ├── commands/
│   │   ├── __init__.py
│   │   ├── capture.py           # glimpse capture
│   │   ├── browse.py            # glimpse browse
│   │   ├── seed.py              # glimpse seed
│   │   ├── status.py            # glimpse status
│   │   ├── batch.py             # glimpse batch
│   │   ├── matrix.py            # glimpse matrix
│   │   ├── detect.py            # glimpse detect
│   │   ├── install.py           # glimpse install
│   │   └── stop.py              # glimpse stop
│   │
│   ├── detection/
│   │   ├── __init__.py
│   │   ├── a11y.py              # Accessibility tree detection
│   │   ├── heuristics.py        # CSS selector heuristics
│   │   └── vision.py            # Lumen Gateway AI detection
│   │
│   ├── output/
│   │   ├── __init__.py
│   │   └── formatter.py         # Human/agent/JSON output formatting
│   │
│   └── utils/
│       ├── __init__.py
│       ├── naming.py            # Auto-generate output filenames
│       └── validation.py        # URL validation, config validation
│
├── tests/
│   ├── test_injector.py
│   ├── test_capture.py
│   ├── test_console.py
│   ├── test_interpreter.py
│   ├── test_detection.py
│   ├── test_server.py
│   ├── test_seed.py
│   └── test_naming.py
│
├── pyproject.toml
├── uv.lock
└── README.md
```

### Dependencies

```toml
[project]
name = "grove-glimpse"
requires-python = ">=3.12"
dependencies = [
    "click>=8.1",
    "rich>=13.0",
    "playwright>=1.42",
    "tomli>=2.0",
    "pyyaml>=6.0",
    "httpx>=0.27",       # For Lumen Gateway API calls
    "psutil>=5.9",       # For process detection (server manager)
]

[project.scripts]
glimpse = "glimpse.cli:main"
```

---

## Security Considerations

- **URL validation:** Only allow http/https schemes. No `file://` or `javascript:` URLs.
- **JS injection scope:** Only inject Grove-specific store values. Never execute arbitrary user JS.
- **Lumen API key:** Loaded from environment variable, never stored in config files or committed to git.
- **Output paths:** Sanitize output filenames to prevent directory traversal.
- **Browser sandbox:** Playwright runs Chromium in sandboxed mode by default. Do not disable.
- **Timeout limits:** All navigation and capture operations have timeouts (default 30s) to prevent hangs.
- **Server management:** Glimpse only stops processes it started (PID file tracking). It never kills developer-started servers.
- **Seed data scope:** `glimpse seed` only operates on `--local` D1 databases. It never touches remote or production data.
- **Browse action scope:** The `browse` command only executes UI interactions (click, fill, scroll). It does not inject arbitrary JavaScript or modify page state beyond what a user could do manually.
- **Credentials in `--do` strings:** Arguments passed via `--do` appear in shell history, `ps aux` output, and CI logs. Never pass real credentials in `--do` strings — use fixture accounts with throwaway passwords only. For automated flows needing auth, prefer environment variables or seed data with known test accounts.
- **Console capture privacy:** Console output may contain sensitive data (API keys logged accidentally, user data in error messages). Glimpse writes this to local files only; it is never sent to external services unless the caller explicitly pipes it somewhere.

---

## Usage Examples

### Verification Loop (The Main Use Case)

```bash
# You just edited the arbor page. Check your work:
glimpse capture http://localhost:5173/arbor?subdomain=autumn \
  --logs --auto --season autumn --theme dark -o /tmp/check.png

# Output:
# /tmp/check.png
# [ERROR] Cannot read property 'title' of undefined (+page.svelte:31:8)

# Fix the bug, check again:
glimpse capture http://localhost:5173/arbor?subdomain=autumn \
  --logs -o /tmp/check-2.png

# Output:
# /tmp/check-2.png
# (no errors)

# Looks good. Ship it.
```

### First-Time Setup

```bash
# Install browser
glimpse install

# Seed local databases
glimpse seed

# Check everything is ready
glimpse status

# Take your first screenshot
glimpse capture http://localhost:5173/?subdomain=autumn --auto --logs
```

### Multi-Step Flow Verification

```bash
# Verify that the auth flow works end-to-end
glimpse browse http://localhost:5173/?subdomain=autumn \
  --do "click Sign In, fill email with test@grove.place, fill password with test123, click Submit" \
  --screenshot-each --logs --auto

# Returns: browse-step-1.png through browse-step-4.png + console output
```

### Documentation Screenshots

```bash
# Capture the landing page in all seasons, light mode
glimpse matrix https://grove.place --themes light -o docs/screenshots/

# Capture a specific component
glimpse capture https://grove.place --selector ".glass-card-demo" \
  --season autumn --theme dark -o docs/components/glass-card.png
```

### Agent-Driven Workflow

```bash
# Claude Code uses agent mode for clean parsing
glimpse capture http://localhost:5173/arbor?subdomain=autumn \
  --season autumn --theme dark --agent --logs \
  -o /tmp/settings-page.png

# stdout (line 1 = image path, rest = diagnostics):
# /tmp/settings-page.png
# [ERROR] Failed to load resource: /api/curios/timeline (404)
```

### Marketing Asset Pipeline

```yaml
# marketing-shots.yaml
defaults:
  viewport: { width: 1920, height: 1080 }
  scale: 2
  season: autumn
  theme: dark
  output_dir: marketing/assets/
  logs: true

captures:
  - url: https://grove.place
    name: hero-desktop

  - url: https://grove.place
    name: hero-mobile
    viewport: { width: 390, height: 844 }

  - url: https://grove.place
    name: hero-tablet
    viewport: { width: 768, height: 1024 }

  - url: https://grove.place/about
    name: about-midnight
    season: midnight
    theme: dark
```

```bash
glimpse batch marketing-shots.yaml
```

### Visual QA Across Themes

```bash
# Quick check: does the page look right in all themes?
glimpse matrix http://localhost:5173/?subdomain=autumn \
  --selector "main" --logs \
  -o qa/homepage/
```

Produces:
```
qa/homepage/
├── homepage-spring-light.png
├── homepage-spring-dark.png
├── homepage-summer-light.png
├── homepage-summer-dark.png
├── homepage-autumn-light.png
├── homepage-autumn-dark.png
├── homepage-winter-light.png
├── homepage-winter-dark.png
├── homepage-midnight-light.png
└── homepage-midnight-dark.png
```

---

## Implementation Phases

### Phase 1: Peek (Core Capture + Console)

The minimum viable verification loop. Screenshot a page, capture console errors, report both.

- [ ] Project scaffolding (`tools/glimpse/`, pyproject.toml, Click CLI)
- [ ] `glimpse install` command (wraps `playwright install chromium`)
- [ ] Basic `glimpse capture` with URL and output path
- [ ] Viewport control (width, height, scale)
- [ ] CSS selector targeting
- [ ] Full-page capture mode
- [ ] PNG and JPEG output with quality control
- [ ] Human, agent, and JSON output modes
- [ ] Auto-generated filenames from URL slug
- [ ] Console collector (`--logs` flag)
- [ ] Uncaught exception capture (`pageerror` event)
- [ ] Console output formatting (human / agent / JSON)

**After Phase 1:** Claude Code can change code, screenshot a page, read console errors, and fix issues in a loop.

### Phase 2: Theme System + Matrix

Theme injection so verification works across all visual states.

- [ ] Theme injector (localStorage pre-seeding via `add_init_script`)
- [ ] Season control (`--season` flag)
- [ ] Dark/light control (`--theme` flag)
- [ ] Grove mode control (`--grove-mode` flag)
- [ ] Wait strategies (fixed, networkidle)
- [ ] `glimpse matrix` command (all combinations)
- [ ] Parallel capture with asyncio (configurable concurrency)

### Phase 3: Server + Seed

Remove the "start the dev server manually" friction.

- [ ] Server manager: detect running server on target port
- [ ] Server manager: auto-start dev server (`--auto` flag)
- [ ] Health polling with configurable timeout
- [ ] PID file tracking (`.glimpse/server.pid`)
- [ ] `glimpse stop` command
- [ ] Data bootstrapper: apply D1 migrations
- [ ] Data bootstrapper: apply seed SQL scripts
- [ ] `glimpse seed` command with `--reset` and `--dry-run`
- [ ] `glimpse status` command (browser + server + database readiness)

**After Phase 3:** Full self-service. Claude Code can set up a complete local dev environment from scratch and verify pages with real data.

### Phase 4: Batch + Config

Repeatable screenshot sets for documentation and QA.

- [ ] YAML batch config file parsing
- [ ] `glimpse batch` command
- [ ] Per-capture overrides in config
- [ ] Dry-run mode
- [ ] `.glimpse.toml` project config loading
- [ ] Default inheritance in batch configs
- [ ] Console capture in batch mode

### Phase 5: Walk (Interactive Browsing)

Multi-step flow verification.

- [ ] Natural language instruction parser
- [ ] Action vocabulary (click, fill, hover, scroll, wait, press, go to)
- [ ] Target resolution via a11y tree
- [ ] Target resolution via CSS heuristics
- [ ] `glimpse browse` command
- [ ] `--screenshot-each` mode
- [ ] Console collection across navigation events

**After Phase 5:** Claude Code can verify multi-step user flows (sign in, navigate, submit forms) without writing Playwright scripts.

### Phase 6: Smart Detection + Lumen

AI-powered element finding for when the DOM is not enough.

- [ ] Lumen Gateway integration (`vision.py`)
- [ ] Fallback chain orchestration (a11y → heuristics → Lumen)
- [ ] `glimpse detect` command
- [ ] Bounding box overlay mode (`--overlay`)
- [ ] Coordinates-only output (`--coords-only`)
- [ ] Lumen fallback in `browse` for unresolvable targets

### Phase 7: Polish

Developer experience refinements.

- [ ] Shell completions (bash/zsh/fish)
- [ ] Rich progress bars for batch/matrix operations
- [ ] Error recovery (retry failed captures)
- [ ] Browser context reuse for same-domain captures
- [ ] `.glimpse/` directory for cached state and logs
- [ ] `--diff` flag to highlight visual differences between captures

---

*A glimpse is all you need. The forest does the rest.*
