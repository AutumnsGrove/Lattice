---
aliases: []
date created: Friday, February 7th 2026
date modified: Friday, February 7th 2026
lastUpdated: '2026-02-07'
tags:
  - tooling
  - screenshots
  - playwright
  - developer-tools
  - ai-vision
type: tech-spec
---

# Glimpse — Automated Screenshot Capture

```
                      🌲         🌲
                       \    👁    /
                        \   |   /
                         \  |  /
                    ╭─────╲─┼─╱─────╮
                    │      ╲│╱      │
                    │   ┌───────┐   │
                    │   │ 📸    │   │
                    │   │  ···  │   │
                    │   │  ···  │   │
                    │   └───────┘   │
                    │               │
                    ╰───────────────╯
                          │
                    ╭─────┴─────╮
                    │  spring   │
                    │  summer   │
                    │  autumn   │
                    │  winter   │
                    │  midnight │
                    ╰───────────╯

             A quick peek through the trees.
```

> *A quick peek through the trees.*

Glimpse is a developer tool for capturing screenshots of Grove sites. Point it at a page, tell it what season and theme you want, and it hands you back a picture. Need all ten combinations? One command. Need just the hero section in midnight mode? One command. Need an agent to grab twenty screenshots while you make tea? One command.

**Public Name:** Glimpse
**Internal Name:** GroveGlimpse
**Package:** `tools/glimpse/` (Python + UV)
**CLI Name:** `glimpse`
**Last Updated:** February 2026

In a forest, a glimpse is what you catch between the branches. A flash of color. A shape half-hidden. Glimpse captures those moments on demand, in any season, in any light. It's the field naturalist's camera for the Grove ecosystem.

---

## Goals

1. **One-command screenshots** — `glimpse capture https://grove.place --season autumn --theme dark`
2. **Full theme matrix** — Generate all season + theme combinations automatically
3. **Element targeting** — Capture specific components by CSS selector or natural language
4. **Batch operations** — YAML config files for repeatable screenshot runs
5. **Agent-friendly** — Clean output mode for automated pipelines
6. **Smart detection** — Optional AI-powered element finding via Lumen Gateway

## Non-Goals

- Visual regression testing (use dedicated tools for that)
- Video capture or screen recording
- Live site monitoring or uptime checks
- Replacing browser DevTools for debugging

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              glimpse CLI                                 │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │   capture     │  │   batch      │  │   matrix     │  │   detect    │  │
│  │   (single)    │  │   (YAML)     │  │   (all combos)│  │   (AI)     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘  │
│         │                 │                 │                  │         │
│         └─────────────────┼─────────────────┘                  │         │
│                           │                                    │         │
│                           ▼                                    ▼         │
│              ┌────────────────────────┐           ┌─────────────────┐    │
│              │    Theme Injector      │           │  Smart Detector │    │
│              │                        │           │                 │    │
│              │  seasonStore.setSeason │           │  1. A11y tree   │    │
│              │  themeStore.setTheme   │           │  2. CSS match   │    │
│              │  groveModeStore.toggle │           │  3. Vision AI   │    │
│              └───────────┬────────────┘           └────────┬────────┘    │
│                          │                                 │            │
│                          ▼                                 ▼            │
│              ┌──────────────────────────────────────────────────┐        │
│              │              Playwright Engine                    │        │
│              │                                                  │        │
│              │  ┌──────────┐  ┌───────────┐  ┌──────────────┐   │        │
│              │  │ Navigate │→ │ Inject JS │→ │  Screenshot  │   │        │
│              │  └──────────┘  └───────────┘  └──────────────┘   │        │
│              │                                                  │        │
│              │  async context pool for parallel captures         │        │
│              └──────────────────────────────────────────────────┘        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │  screenshots/ │
                   │  ├─ page.png  │
                   │  ├─ hero.png  │
                   │  └─ ...       │
                   └──────────────┘
```

### Layer 1: Playwright Engine

The capture engine uses Playwright's async Python API. One browser instance with multiple contexts for parallel captures.

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

**Why Playwright over shot-scraper:** We need Grove-specific theme injection, parallel capture via asyncio, and the accessibility tree for smart detection. shot-scraper is a great general tool, but Glimpse needs to understand Grove's internals.

### Layer 2: Theme Injector

Before capturing, Glimpse injects JavaScript to set the site's visual state:

```javascript
// Injected via page.evaluate() after page load
(function() {
    // Set season
    const seasonKey = 'grove-season';
    localStorage.setItem(seasonKey, '${season}');

    // Set theme
    const themeKey = 'theme';
    localStorage.setItem(themeKey, '${theme}');

    // Apply dark class immediately
    if ('${theme}' === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    // Trigger Svelte store reactivity by dispatching storage event
    window.dispatchEvent(new StorageEvent('storage', {
        key: seasonKey,
        newValue: '${season}'
    }));
    window.dispatchEvent(new StorageEvent('storage', {
        key: themeKey,
        newValue: '${theme}'
    }));
})();
```

**Wait strategy:** After injection, wait for CSS transitions to settle (configurable, default 500ms). Optionally wait for `networkidle` for pages with async data.

### Layer 3: Smart Detector (Optional)

For natural-language element targeting ("capture the hero section"), Glimpse uses a three-step fallback chain:

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
│   │ "hero" → [role=banner], .hero,  │                    │
│   │          section:first-of-type  │                    │
│   │ "footer" → footer, [role=foot]  │                    │
│   │ "nav" → nav, [role=navigation]  │                    │
│   └────────────────┬────────────────┘                    │
│                    │ Not found?                           │
│                    ▼                                      │
│   Step 3: Vision AI via Lumen (slow, costs $)            │
│   ┌─────────────────────────────────┐                    │
│   │ Full-page screenshot            │                    │
│   │ → Send to Lumen Gateway         │                    │
│   │ → Model returns bounding box    │                    │
│   │ → Crop to coordinates           │                    │
│   └─────────────────────────────────┘                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Lumen Gateway integration:** Glimpse calls the Lumen API with the screenshot and a text prompt. The gateway routes to the configured vision model (recommended: Gemini 2.5 Flash for bounding boxes, or OmniParser V2 for UI-specific parsing).

**Why the fallback chain matters:** The accessibility tree handles 90% of well-structured pages instantly and for free. CSS heuristics catch common patterns. Vision AI is the expensive last resort for pages where the DOM doesn't tell the story.

---

## CLI Interface

### Installation

```bash
uv tool install --editable tools/glimpse
```

Installs the `glimpse` command globally. Follows the same pattern as `gw` and `gf`.

### Commands

#### `glimpse capture` — Single Screenshot

```bash
# Basic capture
glimpse capture https://grove.place

# With theme control
glimpse capture https://grove.place --season autumn --theme dark

# Specific element
glimpse capture https://grove.place --selector ".hero-section"

# Custom viewport
glimpse capture https://grove.place --width 1440 --height 900

# Custom output path
glimpse capture https://grove.place -o screenshots/homepage.png

# Full-page (scroll entire page)
glimpse capture https://grove.place --full-page

# With delay (wait for animations)
glimpse capture https://grove.place --wait 2000

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

#### `glimpse matrix` — All Theme Combinations

```bash
# Generate all 10 combinations (5 seasons x 2 themes)
glimpse matrix https://grove.place

# Specific seasons only
glimpse matrix https://grove.place --seasons autumn,winter,midnight

# Specific element across all combos
glimpse matrix https://grove.place --selector ".hero-section"

# Custom output directory
glimpse matrix https://grove.place -o screenshots/matrix/
```

**Output naming:** `{slug}-{season}-{theme}.png`
- `grove-place-autumn-dark.png`
- `grove-place-spring-light.png`
- `grove-place-midnight-dark.png`

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

captures:
  - url: https://grove.place
    name: homepage
    season: autumn
    theme: dark

  - url: https://grove.place
    name: homepage-hero
    selector: ".hero-section"
    season: autumn
    theme: light

  - url: https://grove.place/about
    name: about
    matrix: true  # Generate all season x theme combos

  - url: https://plant.grove.place/blog
    name: blog-feed
    season: summer
    theme: dark
    viewport:
      width: 768
      height: 1024  # Tablet view

  - url: https://grove.place
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

[theme]
# Default theme state for captures
season = "autumn"
theme = "light"
grove_mode = false

[lumen]
# Lumen Gateway configuration for smart detection
gateway_url = "https://lumen.grove.place/api"
model = "gemini-flash"  # or "omniparser", "grounding-dino"
# API key loaded from LUMEN_API_KEY env var

[browser]
# Playwright browser settings
headless = true
browser = "chromium"  # chromium, firefox, webkit
timeout = 30000  # Navigation timeout in ms
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `LUMEN_API_KEY` | API key for Lumen Gateway (smart detection) |
| `GLIMPSE_OUTPUT_DIR` | Override default output directory |
| `GLIMPSE_AGENT` | Set to "1" for agent-friendly output |
| `GROVE_ROOT` | Grove monorepo root (for config discovery) |

---

## Output Modes

Following the gw/gf pattern, Glimpse supports three output modes:

### Human Mode (default)

```
  Glimpse — grove.place

  Season:  autumn 🍂
  Theme:   dark 🌙
  Size:    1920×1080 @2x

  ✓ Captured → screenshots/grove-place-autumn-dark.png (1.2 MB)
```

### Agent Mode (`--agent`)

```
screenshots/grove-place-autumn-dark.png
```

Clean path only. Parseable by other tools.

### JSON Mode (`--json`)

```json
{
  "url": "https://grove.place",
  "output": "screenshots/grove-place-autumn-dark.png",
  "season": "autumn",
  "theme": "dark",
  "viewport": { "width": 1920, "height": 1080 },
  "scale": 2,
  "size_bytes": 1258291,
  "duration_ms": 4250
}
```

---

## Theme Injection Details

### How the Stores Work

Grove's visual state is controlled by three Svelte 5 stores that persist to localStorage:

| Store | localStorage Key | Values | Effect |
|-------|-----------------|--------|--------|
| `seasonStore` | `grove-season` | spring, summer, autumn, winter, midnight | Nature component colors, seasonal decorations |
| `themeStore` | `theme` | light, dark, system | `.dark` class on `<html>`, CSS variable swap |
| `groveModeStore` | `grove-mode` | true, false | Terminology (Grove terms vs standard terms) |

### Injection Strategy

Two approaches, chosen based on timing:

**Pre-navigation seeding** (faster, for fresh page loads):
1. Create browser context
2. Set localStorage values via `context.add_init_script()`
3. Navigate to URL
4. Page loads with correct state already set
5. Wait for render settle
6. Capture

```python
# Pre-seed localStorage before any page loads
await context.add_init_script("""
    localStorage.setItem('grove-season', 'winter');
    localStorage.setItem('theme', 'dark');
""")
await page.goto(url)
await page.wait_for_timeout(wait_ms)
```

**Post-navigation injection** (for when page is already loaded):
1. Navigate to URL
2. Wait for load
3. Inject JS to update stores
4. Wait for CSS transitions (500ms default)
5. Capture

The pre-navigation approach is preferred because it avoids any flash of the default theme before the target theme applies.

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
│   │   ├── injector.py          # Theme/season JS injection
│   │   └── screenshot.py        # Screenshot capture logic
│   │
│   ├── commands/
│   │   ├── __init__.py
│   │   ├── capture.py           # glimpse capture
│   │   ├── batch.py             # glimpse batch
│   │   ├── matrix.py            # glimpse matrix
│   │   ├── detect.py            # glimpse detect
│   │   └── install.py           # glimpse install
│   │
│   ├── detection/
│   │   ├── __init__.py
│   │   ├── a11y.py              # Accessibility tree detection
│   │   ├── heuristics.py        # CSS selector heuristics
│   │   └── vision.py            # Lumen Gateway AI detection
│   │
│   ├── output/
│   │   ├── __init__.py
│   │   └── console.py           # Human/agent/JSON output modes
│   │
│   └── utils/
│       ├── __init__.py
│       ├── naming.py            # Auto-generate output filenames
│       └── validation.py        # URL validation, config validation
│
├── tests/
│   ├── test_injector.py
│   ├── test_capture.py
│   ├── test_detection.py
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
requires-python = ">=3.11"
dependencies = [
    "click>=8.1",
    "rich>=13.0",
    "playwright>=1.40",
    "tomli>=2.0",
    "pyyaml>=6.0",
    "httpx>=0.27",       # For Lumen Gateway API calls
]

[project.scripts]
glimpse = "glimpse.cli:main"
```

---

## Security Considerations

- **URL validation:** Only allow http/https schemes. No `file://` or `javascript:` URLs.
- **JS injection scope:** Only inject Grove-specific store values. Never execute arbitrary user JS.
- **Lumen API key:** Loaded from environment variable, never stored in config files.
- **Output paths:** Sanitize output filenames to prevent directory traversal.
- **Browser sandbox:** Playwright runs Chromium in sandboxed mode by default. Do not disable.
- **Timeout limits:** All navigation and capture operations have timeouts (default 30s) to prevent hangs.

---

## Usage Examples

### Documentation Screenshots

```bash
# Capture the landing page in all seasons, light mode
glimpse matrix https://grove.place --themes light -o docs/screenshots/

# Capture a specific component for the storybook
glimpse capture https://grove.place --selector ".glass-card-demo" \
  --season autumn --theme dark -o docs/components/glass-card.png
```

### Agent-Driven Captures

```bash
# An agent can grab exactly what it needs
glimpse capture https://plant.grove.place/settings \
  --season autumn --theme dark --agent \
  -o /tmp/settings-page.png

# Then analyze the screenshot with Claude
# (the agent reads the output path from stdout)
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

captures:
  - url: https://grove.place
    name: hero-desktop

  - url: https://grove.place
    name: hero-mobile
    viewport: { width: 390, height: 844 }

  - url: https://grove.place
    name: hero-tablet
    viewport: { width: 768, height: 1024 }

  - url: https://plant.grove.place
    name: plant-dashboard
    selector: ".dashboard-main"

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
glimpse matrix https://grove.place/pricing \
  --selector "main" \
  -o qa/pricing/
```

Produces:
```
qa/pricing/
├── pricing-spring-light.png
├── pricing-spring-dark.png
├── pricing-summer-light.png
├── pricing-summer-dark.png
├── pricing-autumn-light.png
├── pricing-autumn-dark.png
├── pricing-winter-light.png
├── pricing-winter-dark.png
├── pricing-midnight-light.png
└── pricing-midnight-dark.png
```

---

## Implementation Checklist

### Phase 1: Core Capture (MVP)

- [ ] Project scaffolding (`tools/glimpse/`, pyproject.toml, Click CLI)
- [ ] `glimpse install` command (wraps `playwright install chromium`)
- [ ] Basic `glimpse capture` with URL and output path
- [ ] Viewport control (width, height, scale)
- [ ] CSS selector targeting
- [ ] Full-page capture mode
- [ ] PNG and JPEG output with quality control
- [ ] Human, agent, and JSON output modes
- [ ] Auto-generated filenames from URL slug

### Phase 2: Theme System

- [ ] Theme injector (localStorage pre-seeding)
- [ ] Season control (`--season` flag)
- [ ] Dark/light control (`--theme` flag)
- [ ] Grove mode control (`--grove-mode` flag)
- [ ] Wait strategies (fixed, networkidle)
- [ ] `glimpse matrix` command (all combinations)
- [ ] Parallel capture with asyncio (configurable concurrency)

### Phase 3: Batch Operations

- [ ] YAML config file parsing
- [ ] `glimpse batch` command
- [ ] Per-capture overrides in config
- [ ] Dry-run mode
- [ ] `.glimpse.toml` project config loading
- [ ] Default inheritance in batch configs

### Phase 4: Smart Detection

- [ ] Playwright accessibility tree detection (`a11y.py`)
- [ ] CSS heuristic mapping (`heuristics.py`)
- [ ] Lumen Gateway integration (`vision.py`)
- [ ] Fallback chain orchestration
- [ ] `glimpse detect` command
- [ ] Bounding box overlay mode (`--overlay`)
- [ ] Coordinates-only output (`--coords-only`)

### Phase 5: Polish

- [ ] Shell completions (bash/zsh/fish)
- [ ] Rich progress bars for batch/matrix operations
- [ ] Error recovery (retry failed captures)
- [ ] Browser context reuse for same-domain captures
- [ ] Caching (skip captures if output file exists and is recent)
- [ ] `--diff` flag to highlight visual differences between captures

---

*A glimpse is all you need. The forest does the rest.*
