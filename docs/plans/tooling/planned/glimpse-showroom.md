# Glimpse Showroom — Implementation Plan

## Overview

A dedicated SvelteKit app at `tools/showroom/` that renders any `.svelte` component from the monorepo in isolation, with live HMR, fixture-driven props, and a full audit capture pipeline integrated into Glimpse.

**Invocation:** `gw glimpse showroom <ComponentPath>`
**Server:** Long-running at `localhost:5188`, Vite HMR for live edits
**Output:** Full audit bundle (screenshot, a11y, design compliance, computed styles, diff)

---

## Step 1: Scaffold `tools/showroom` SvelteKit App

Create a minimal SvelteKit app whose only job is rendering components in isolation.

### Files to create:

- `tools/showroom/package.json` — `grove-showroom`, workspace deps (`@autumnsgrove/lattice`, `@autumnsgrove/prism`), port 5188
- `tools/showroom/svelte.config.js` — adapter-static (no Cloudflare needed, this is dev-only), vitePreprocess
- `tools/showroom/vite.config.ts` — sveltekit plugin, resolve monorepo aliases, `server.port: 5188`, `server.fs.allow: ['../..']` for monorepo access
- `tools/showroom/tsconfig.json` — extend .svelte-kit/tsconfig.json, bundler resolution
- `tools/showroom/tailwind.config.js` — grove preset from prism, scan `./src` + `../../libs/engine/src/lib` + `../../libs/lattice/src/lib`
- `tools/showroom/postcss.config.js` — tailwindcss + autoprefixer
- `tools/showroom/src/app.html` — minimal HTML shell
- `tools/showroom/src/app.css` — import grove tokens + tailwind directives

### Dynamic component mounting:

- `tools/showroom/src/routes/+layout.svelte` — bare layout (no nav, just a clean canvas with grove tokens loaded)
- `tools/showroom/src/routes/+page.svelte` — landing/status page
- `tools/showroom/src/routes/showcase/+page.svelte` — the dynamic mount point

**How dynamic mounting works:**
- The showroom accepts a query param `?component=libs/engine/src/lib/ui/components/Button.svelte`
- A server-side endpoint (`+page.server.ts`) reads the component path, resolves it relative to the grove root
- The page uses Vite's `import.meta.glob` with eager loading to dynamically import the component
- The component is rendered with props from the fixture file (if found) or zero-props default
- Query param `?scenario=disabled` selects a specific scenario from the fixture
- Query param `?props={...}` allows inline JSON props override

**Key: Vite dynamic import strategy:**
```typescript
// +page.svelte
// Use a server endpoint that returns the resolved component path
// Then use dynamic import() which Vite handles natively with HMR
const module = await import(/* @vite-ignore */ componentPath);
const Component = module.default;
```

Since we need to mount ANY component from the monorepo, we'll use a Vite plugin that:
1. Receives the component path via URL query param
2. Creates a virtual module that re-exports the target component
3. The page imports this virtual module — Vite handles HMR natively

---

## Step 2: Fixture System

### Fixture file convention:

Location: `tools/showroom/fixtures/{library}/{ComponentName}.showroom.ts`

```typescript
// tools/showroom/fixtures/engine/Button.showroom.ts
import type { ShowroomFixture } from '../types';

export default {
  // Optional: component-level config
  viewport: { width: 400, height: 200 },
  background: 'surface', // 'surface' | 'accent' | 'dark' | 'transparent'

  scenarios: {
    default: {
      props: { label: 'Plant a seed', variant: 'primary' },
    },
    disabled: {
      props: { label: 'Growing...', disabled: true },
    },
    icon: {
      props: { label: 'Bloom', icon: 'flower' },
    },
    // Each scenario can override viewport/background
    small: {
      props: { label: 'Hi', size: 'sm' },
      viewport: { width: 200, height: 100 },
    },
  },
} satisfies ShowroomFixture;
```

### Files to create:

- `tools/showroom/fixtures/types.ts` — `ShowroomFixture` type definition
- `tools/showroom/fixtures/engine/` — empty dir, starter fixtures for a few core components
- `tools/showroom/src/lib/fixtures.ts` — fixture resolver (given a component path, find its fixture file)

### Fixture resolution:

1. Parse component path → extract library name + component name
2. Look for `tools/showroom/fixtures/{library}/{ComponentName}.showroom.ts`
3. If not found → return empty fixture (zero-props default)
4. If found → import and return scenarios

---

## Step 3: Glimpse `showroom` Command

New file: `tools/glimpse/src/glimpse/commands/showroom.py`

### CLI interface:

```
glimpse showroom <component_path>
  --scenario <name>       # Specific scenario (default: all scenarios)
  --props '{...}'         # Inline JSON props override
  --scaffold              # Generate fixture template
  --theme light|dark      # Override theme (default: both)
  --season <name>         # Override season
  --diff                  # Compare against previous capture (on by default)
  --audit                 # Run design compliance (on by default)
  --output <dir>          # Output directory (default: .glimpse/showroom/)
  --baseline-dir <dir>    # Baseline directory (default: .glimpse/showroom/baselines/)
```

### Command flow:

1. **Resolve component** — validate path exists, extract library/name
2. **Start/reuse showroom server** — via ServerManager with showroom app config
3. **Load fixture** — find `.showroom.ts` file, parse scenarios
4. **Build capture matrix:**
   - Scenarios: all from fixture (or just "default" if no fixture)
   - Themes: light + dark (unless overridden)
   - Apply inline `--props` override if provided
5. **Capture each combination** via CaptureEngine:
   - URL: `http://localhost:5188/showcase?component={path}&scenario={name}`
   - Theme injection via existing injector
6. **Run audit pipeline** on each capture (Step 4)
7. **Run diff** against baselines if they exist (Step 5)
8. **Output audit bundle** — JSON manifest + screenshots + diffs + compliance report

### Register in Glimpse:

- Add to `cli.py` lazy commands: `"showroom": "glimpse.commands.showroom:showroom"`
- Add to `utils/apps.py` APP_REGISTRY: `"showroom": {"cwd": "tools/showroom", "port": 5188, "start_command": "pnpm dev"}`

### Register in gw:

- Update `tools/grove-wrap-go/cmd/glimpse.go` to pass through `showroom` subcommand with appropriate auto-flags

---

## Step 4: Design Compliance Audit

New file: `tools/glimpse/src/glimpse/audit/compliance.py`

### Architecture:

The compliance checker references chameleon's existing rules **by reading the reference files at runtime** — no duplication. It parses the component's rendered HTML/CSS and checks against the rules.

### What it checks:

**Static checks (on rendered HTML/CSS via Playwright):**

1. **Color token compliance** — Extract all computed colors from rendered elements, compare against prism token values from `libs/prism/src/lib/tokens/colors.ts`. Flag any color not in the token palette.

2. **Spacing grid compliance** — Extract computed margins/paddings, verify all are multiples of 4px. Flag violations.

3. **Typography scale compliance** — Extract computed font-sizes, verify against the allowed scale (12, 14, 16, 18, 20, 24, 30, 36px). Flag arbitrary sizes.

4. **Focus ring check** — Tab through interactive elements, verify custom focus styles (not browser-default blue outline).

5. **Heading hierarchy** — Verify heading levels are sequential (no h1→h3 skip).

6. **Images alt text** — Already in a11y summary from CaptureResult.

### Compliance report structure:

```python
@dataclass
class ComplianceResult:
    passed: bool
    score: float  # 0-100
    checks: list[ComplianceCheck]

@dataclass
class ComplianceCheck:
    name: str           # "color-tokens", "spacing-grid", etc.
    passed: bool
    severity: str       # "error" | "warning" | "info"
    violations: list[Violation]

@dataclass
class Violation:
    element: str        # CSS selector or description
    expected: str       # What it should be
    actual: str         # What it is
    rule_ref: str       # Reference to chameleon doc section
```

### Computed styles extraction:

Via Playwright JavaScript evaluation, extract:
- All background-color, color, border-color values
- All margin, padding values
- All font-size, font-family, line-height values
- All box-shadow, backdrop-filter values (glassmorphism check)
- Focus outline styles on interactive elements

Store as structured data in the audit bundle for agent inspection.

---

## Step 5: Visual Diff Pipeline

Reuse existing `diff.py` pixel diff engine.

### Flow:

1. After each capture, check if a baseline exists at `.glimpse/showroom/baselines/{component}_{scenario}_{theme}.png`
2. If yes → run `diff_images()` from existing diff module
3. Generate diff image + similarity score
4. Include in audit bundle

### Baseline management:

- First run with no baselines → captures become the baselines (copy to baselines dir)
- Subsequent runs → diff against baselines
- `gw glimpse showroom <component> --update-baselines` → overwrite baselines with current captures

---

## Step 6: Fixture Scaffolding (`--scaffold`)

When `--scaffold` is passed:

1. Read the component's `.svelte` file
2. Parse the `interface Props` or `$props()` destructuring
3. Generate a `.showroom.ts` template with:
   - All required props with placeholder values
   - All optional props with their defaults shown as comments
   - A `default` scenario and one `empty` scenario
4. Write to `tools/showroom/fixtures/{library}/{ComponentName}.showroom.ts`
5. Print the generated file path

This is lightweight type extraction (just regex parsing of the Props interface), NOT full TypeScript type resolution. It generates a template that the developer/agent fills in — not auto-generated mock data.

---

## Step 7: Audit Bundle Output

The final output for each showroom capture:

```
.glimpse/showroom/
├── manifest.json                           # Full audit results
├── captures/
│   ├── Button_default_light.png
│   ├── Button_default_dark.png
│   ├── Button_disabled_light.png
│   └── Button_disabled_dark.png
├── diffs/
│   ├── Button_default_light_diff.png
│   └── Button_disabled_dark_diff.png
├── baselines/
│   ├── Button_default_light.png
│   └── Button_default_dark.png
└── compliance/
    └── Button_compliance.json              # Per-component compliance report
```

### Manifest structure:

```json
{
  "timestamp": "2026-03-17T...",
  "component": "libs/engine/src/lib/ui/components/Button.svelte",
  "fixture": "tools/showroom/fixtures/engine/Button.showroom.ts",
  "server": "http://localhost:5188",
  "summary": {
    "scenarios": 3,
    "captures": 6,
    "compliance_score": 94.5,
    "diff_identical": 4,
    "diff_changed": 2,
    "a11y_issues": 0
  },
  "scenarios": [
    {
      "name": "default",
      "theme": "light",
      "capture": "captures/Button_default_light.png",
      "baseline": "baselines/Button_default_light.png",
      "diff": "diffs/Button_default_light_diff.png",
      "similarity": 99.2,
      "a11y": { "headings": [], "landmarks": [], "images_missing_alt": 0 },
      "compliance": {
        "score": 95,
        "checks": [
          { "name": "color-tokens", "passed": true, "violations": [] },
          { "name": "spacing-grid", "passed": true, "violations": [] },
          { "name": "typography-scale", "passed": false, "violations": [
            { "element": ".button-label", "expected": "14px or 16px", "actual": "15px" }
          ]}
        ]
      },
      "computed_styles": {
        "colors": ["var(--color-grove-600)", "var(--color-cream-50)"],
        "font_sizes": ["16px"],
        "spacings": ["8px", "16px"],
        "glass": false
      }
    }
  ]
}
```

---

## File Summary

### New files (tools/showroom — SvelteKit app):
- `tools/showroom/package.json`
- `tools/showroom/svelte.config.js`
- `tools/showroom/vite.config.ts`
- `tools/showroom/tsconfig.json`
- `tools/showroom/tailwind.config.js`
- `tools/showroom/postcss.config.js`
- `tools/showroom/src/app.html`
- `tools/showroom/src/app.css`
- `tools/showroom/src/routes/+layout.svelte`
- `tools/showroom/src/routes/+page.svelte`
- `tools/showroom/src/routes/showcase/+page.svelte`
- `tools/showroom/src/routes/showcase/+page.server.ts`
- `tools/showroom/src/lib/mount.ts` (dynamic component loading)
- `tools/showroom/src/lib/vite-plugin-showroom.ts` (virtual module for dynamic imports)
- `tools/showroom/fixtures/types.ts`

### New files (Glimpse — Python):
- `tools/glimpse/src/glimpse/commands/showroom.py`
- `tools/glimpse/src/glimpse/audit/__init__.py`
- `tools/glimpse/src/glimpse/audit/compliance.py`
- `tools/glimpse/src/glimpse/audit/styles.py` (computed styles extraction)

### Modified files:
- `tools/glimpse/src/glimpse/cli.py` — add showroom to lazy commands
- `tools/glimpse/src/glimpse/server/manager.py` or `utils/apps.py` — add showroom to APP_REGISTRY
- `tools/grove-wrap-go/cmd/glimpse.go` — pass through showroom subcommand
- `pnpm-workspace.yaml` — add `tools/showroom` to workspace packages (or verify `tools/*` is already included)

### Not modified (referenced, not duplicated):
- `.claude/skills/chameleon-adapt/references/design-quality.md` — compliance rules source of truth
- `.claude/skills/chameleon-adapt/references/color-palette.md` — color token reference
- `libs/prism/src/lib/tokens/colors.ts` — programmatic token values
- `libs/prism/src/lib/tailwind/preset.js` — spacing/typography scale values
