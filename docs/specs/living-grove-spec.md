---
aliases: []
date created: Wednesday, February 25th 2026
date modified: Wednesday, February 25th 2026
tags:
  - lattice
  - landing
  - engine
  - visualization
  - feature
type: tech-spec
---

```
                    🌲          🌲
               🌳       🌲          🌳
          ·bg·    🌲  🌳    ·bg·     🌲   🌳
        ╭───────────╮    ╭───────────╮    ╭───────────╮
       ╱  engine  ·  ╲  ╱  landing   ╲  ╱  workers   ╲
      ╱  ·  ·  ·  ·  ╲╱  ·  ·  ·  · ╲╱  ·  ·  ·  ·  ╲
     ╱________________╲╱______________╲╱________________╲
    ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
    ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈

          *watch the grove grow from a single seed*
```

# The Living Grove: Cinematic Codebase Visualization

> *Watch the grove grow from a single seed.*

The Living Grove is a cinematic, interactive visualization of the entire Grove codebase growing from its first commit to today. Each package is a floating island in an archipelago, covered in trees that represent the code within. Hit play and watch the forest emerge from nothing.

**Public Name:** The Living Grove
**Internal Name:** GroveCensus (data pipeline), MediaPlayer (engine component)
**Route:** `/grove` (landing app)
**Last Updated:** February 2026

A forest is never planted all at once. It begins with a single seed, then another, then a clearing forms, then a canopy closes overhead. This is the story of Grove told through its own metaphor: code as living things, packages as islands, growth as something you can watch unfold.

---

## Overview

### What This Is

A full-screen, playable visualization on `/grove` that renders the monorepo's directory structure as a forest archipelago. Each major package (engine, landing, meadow, workers, docs) occupies its own floating island. Trees within each island represent significant subfolders, sized by line count. A universal media player component controls playback through daily historical snapshots, letting visitors watch the grove grow from commit zero to today.

### Goals

- Visualize the full history of the Grove codebase as a growing forest
- Build a reusable, engine-first `<MediaPlayer>` component for any sequential content
- Create a standalone data pipeline (separate from journey's `repo-snapshot.sh`)
- Make it beautiful, accessible, and performant
- Link to `/journey` as a sibling view of the same story

### Non-Goals (Out of Scope)

- Replacing or modifying the existing `/journey` page or its data pipeline
- Replacing or modifying the existing `/forest` page
- Real-time live updates (snapshots are daily, not live)
- File-level granularity (we group small files, not one tree per file)
- Interacting with individual trees to view source code

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Data Pipeline (offline)                      │
│                                                                 │
│  git history ──→ grove-census.sh ──→ grove_census.db (SQLite)   │
│  (every day)     walks commits        dir tree + line counts    │
│                  per-day                                        │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                     copied to static/ at build
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Landing App (SvelteKit)                        │
│                                                                 │
│  +page.server.ts ──→ loads grove_census.db                      │
│       │                queries snapshots + dir trees             │
│       │                                                         │
│       ▼                                                         │
│  +page.svelte                                                   │
│       │                                                         │
│       ├── <MediaPlayer>         (engine component)              │
│       │     └── play/pause, scrub, speed, fullscreen, loop      │
│       │                                                         │
│       └── <GroveArchipelago>    (visualization)                 │
│             ├── Island per package cluster                       │
│             │     ├── SVG mound/terrain                         │
│             │     ├── Glass tag label                           │
│             │     └── Trees (TreePine, TreeCherry, etc.)        │
│             ├── Smooth morphing between frames                  │
│             └── Seasonal theming via seasonStore                │
│                                                                 │
│  /grove ←──── sibling link ────→ /journey                       │
└─────────────────────────────────────────────────────────────────┘
```

```
Frame playback flow:

  MediaPlayer          GroveArchipelago         Individual Trees
      │                       │                       │
      │  frame = 42           │                       │
      ├──────────────────────→│                       │
      │                       │  lookup snapshot[42]  │
      │                       │  diff vs snapshot[41] │
      │                       │                       │
      │                       │  new trees: sprout()  │
      │                       ├──────────────────────→│ grow animation
      │                       │                       │
      │                       │  grown trees: morph() │
      │                       ├──────────────────────→│ scale tween
      │                       │                       │
      │                       │  dead trees: wither() │
      │                       ├──────────────────────→│ fade + shrink
      │                       │                       │
```

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Visualization | Svelte 5 + SVG | Reactive, performant, matches existing /forest approach |
| Media Player | Svelte 5 component (engine) | Reusable across landing, meadow, anywhere |
| Census Script | Bash + Git | Walks history with `git worktree`, counts lines per directory |
| Data Store | SQLite (.db file) | Compact, queryable, handles thousands of daily snapshots |
| Automation | GitHub Actions | Daily cron appends new snapshot, commits the .db file |
| Seasonal Theme | `seasonStore` (engine) | Same system as /forest, reactive season switching |
| Tree Components | `@autumnsgrove/lattice/ui/nature` | Reuses TreePine, TreeCherry, TreeAspen, TreeBirch, Logo |

---

## The MediaPlayer Component

A universal, slot-based media player for any sequential content. Glassmorphic controls, seasonal-aware, accessible. Lives in the engine so any Grove property can use it.

**Location:** `libs/engine/src/lib/ui/components/media/MediaPlayer.svelte`

### Component API

```svelte
<script>
  import { MediaPlayer } from '@autumnsgrove/lattice/ui/media';
</script>

<!-- Grove visualization -->
<MediaPlayer
  duration={365}
  bind:currentTime={frame}
  speed={1}
  loop={true}
>
  {#snippet content()}
    <GroveArchipelago frame={frame} />
  {/snippet}
</MediaPlayer>

<!-- Future: video on meadow -->
<MediaPlayer
  duration={videoElement.duration}
  bind:currentTime={videoTime}
>
  {#snippet content()}
    <video bind:this={videoElement} src={url} />
  {/snippet}
</MediaPlayer>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `duration` | `number` | required | Total frames or seconds |
| `currentTime` | `number` | `0` | Current position (bindable) |
| `speed` | `number` | `1` | Playback speed multiplier |
| `playing` | `boolean` | `false` | Whether playback is active (bindable) |
| `loop` | `boolean` | `false` | Loop when reaching the end |
| `label` | `string` | `''` | Accessible label for the player |
| `showTimestamps` | `boolean` | `true` | Show current/total time display |
| `formatTime` | `(time: number) => string` | built-in | Custom time formatter (e.g., dates instead of seconds) |

### Controls UI

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                     [ content slot ]                             │
│                                                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─ glassmorphic control bar ─────────────────────────────────┐ │
│  │                                                            │ │
│  │  [⏮] [▶] [⏭]    ───●────────────────  0.5x [1x] 2x  [⛶] │ │
│  │   ↑    ↑    ↑         ↑ scrubber            ↑  speed   ↑  │ │
│  │  step play step                             toggle  fullscr│ │
│  │  back      fwd     Jan 2024 / Feb 2026                     │ │
│  │                     ↑ formatted time                       │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Control Features

- **Play/Pause** toggle with keyboard shortcut (Space)
- **Step forward/back** one frame at a time (Arrow keys)
- **Scrubber** draggable timeline with hover preview
- **Speed control** cycles through 0.5x, 1x, 2x
- **Fullscreen** toggle (F key)
- **Loop** toggle (L key)
- **Keyboard accessible** with focus ring and aria labels

### Visual Style

- Glassmorphic bar: `backdrop-blur-md bg-white/10 border border-white/20`
- Seasonal-aware: control bar tint shifts with `seasonStore`
- Scrubber track: subtle gradient matching seasonal palette
- Buttons: cream/bark tones with hover glow
- Dark mode: respects `themeStore.resolvedTheme`
- Transitions: 200ms ease for hover states, 1000ms for seasonal color shifts

### File Structure

```
libs/engine/src/lib/ui/components/media/
├── MediaPlayer.svelte        Main wrapper component
├── MediaControls.svelte      The glassmorphic control bar
├── MediaScrubber.svelte      Timeline scrubber with drag
├── MediaSpeedToggle.svelte   Speed cycle button
├── index.ts                  Public exports
└── types.ts                  Shared types
```

---

## The Grove Census Pipeline

A standalone data pipeline, completely separate from `repo-snapshot.sh` and the journey page's CSV system. The census walks the full git history, captures directory-level structure with line counts, and stores everything in a SQLite database.

**Location:** `scripts/grove/grove-census.sh`
**Database:** `apps/landing/static/data/grove_census.db`

### How It Works

```
Backfill mode (one-time):

  git log --format='%H %aI' ──→ group by calendar day
       │                              │
       │                    pick latest commit per day
       │                              │
       ▼                              ▼
  for each day:
       │
       ├── git worktree add /tmp/census-{hash} {hash}
       │
       ├── walk directory tree, count lines per folder
       │     ├── apps/landing/src/  → 3,400 lines (svelte, ts, css)
       │     ├── libs/engine/src/   → 8,200 lines (svelte, ts)
       │     ├── docs/              → 1,100 lines (md)
       │     └── ...
       │
       ├── INSERT INTO snapshots + directories
       │
       └── git worktree remove /tmp/census-{hash}

Daily mode (GitHub Action):

  checkout HEAD ──→ count lines ──→ INSERT today's snapshot
                                 ──→ commit + push .db file
```

### What Gets Counted

**Languages** (by extension):

| Extension | Language | Tree Color Mapping |
|-----------|----------|-------------------|
| `.ts` | TypeScript | `greens.deepGreen` |
| `.svelte` | Svelte | `autumn.amber` (vermillion) |
| `.py` | Python | `greens.meadow` |
| `.go` | Go | `accents.water.surface` |
| `.sql` | SQL | `wildflowers.crocus` |
| `.js` | JavaScript | `autumn.honey` |
| `.css` | CSS | `flowers.cherry.pale` |
| `.sh` | Shell | `earth.stone` |
| `.tsx` | TSX | `autumnReds.coral` |
| `.md` | Markdown | `natural.cream` |

**Exclusions** (same as repo-snapshot.sh):
- `node_modules/`, `.git/`, `dist/`, `.svelte-kit/`, `_archived/`
- Generated files, lock files, binary files

### Directory Tree Structure

The census captures a tree, not flat counts. Example for one snapshot day:

```json
{
  "date": "2025-06-15",
  "commit": "a1b2c3d",
  "total_lines": 42000,
  "tree": {
    "apps": {
      "landing": { "lines": 3400, "lang": { "svelte": 1800, "ts": 1200, "css": 400 } },
      "meadow":  { "lines": 2100, "lang": { "svelte": 1100, "ts": 900, "css": 100 } },
      "login":   { "lines": 800,  "lang": { "svelte": 400, "ts": 350, "css": 50 } }
    },
    "libs": {
      "engine":  { "lines": 8200, "lang": { "svelte": 3000, "ts": 5000, "css": 200 } },
      "foliage": { "lines": 1500, "lang": { "ts": 1500 } }
    },
    "workers":   { "lines": 3200, "lang": { "ts": 3200 } },
    "docs":      { "lines": 1100, "lang": { "md": 1100 } },
    "scripts":   { "lines": 600,  "lang": { "sh": 400, "py": 200 } }
  }
}
```

### Counting Approach

```bash
# For each tracked directory:
# 1. List files by extension (excluding node_modules, dist, etc.)
# 2. Count non-blank lines with wc -l
# 3. Group by parent directory at configurable depth
# 4. Store as nested JSON in SQLite

# Depth configuration:
# Level 0: apps/, libs/, workers/, docs/, scripts/
# Level 1: apps/landing/, apps/meadow/, libs/engine/, etc.
# Level 2: apps/landing/src/, libs/engine/src/lib/ui/, etc.
# Default: Level 1 (packages) with Level 2 for large packages
```

### GitHub Action

```yaml
# .github/workflows/grove-census.yml
name: Grove Census
on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6am UTC
  workflow_dispatch:       # Manual trigger

jobs:
  census:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # Full history for line counting
      - name: Run census
        run: bash scripts/grove/grove-census.sh --today
      - name: Commit snapshot
        run: |
          git add apps/landing/static/data/grove_census.db
          git commit -m "census: daily snapshot $(date +%Y-%m-%d)"
          git push
```

---

## The /grove Page

The heart of this feature. A full-viewport visualization where the monorepo's packages float as islands in an archipelago, trees grow and morph as lines of code change, and the whole thing plays back like a film.

**Location:** `apps/landing/src/routes/grove/`

### Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Full viewport background (seasonal sky gradient)                │
│                                                                 │
│  ┌─ glassmorphic header card ─────────────────────────────────┐ │
│  │  The Living Grove              See this as data → /journey │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│           🌲🌳                   🌲                              │
│        🌲    🌳 🌲            🌲  🌳 🌲                          │
│      ╭──────────────╮      ╭──────────────╮                     │
│     ╱    engine      ╲    ╱   landing     ╲      🌲             │
│    ╱   8,200 lines    ╲  ╱  3,400 lines    ╲   🌲 🌳           │
│   ╱════════════════════╲╱══════════════════╲╭──────────╮       │
│   ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈╱  workers  ╲      │
│                                            ╱  3,200 lines╲     │
│        🌲 🌳              🌲🌲            ╱═══════════════╲    │
│      ╭──────────╮      ╭──────────╮     ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈    │
│     ╱   docs    ╲    ╱  scripts   ╲                             │
│    ╱  1,100 lines╲  ╱   600 lines  ╲                            │
│   ╱═══════════════╲╱═══════════════╲                            │
│   ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈                            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─ MediaPlayer controls ────────────────────────────────────┐  │
│  │  [⏮] [▶] [⏭]    ───●──────────────  0.5x [1x] 2x  [⛶]  │  │
│  │                   Mar 2024 / Feb 2026                     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Archipelago Layout

Each package cluster is a **floating island** rendered as an SVG mound. Islands are positioned in a fixed layout that stays consistent across all frames. New islands appear (rise up) when a package first gets committed. Islands never move once placed.

**Island generation:**
- Each island is an SVG path with a curved top (quadratic bezier) and flat bottom
- Island size scales with total line count of the cluster
- Colors follow seasonal hill palettes (e.g., `greens.deepGreen` in summer, `autumn.rust` in autumn, `winter.hillDeep` in winter)
- Water between islands uses `accents.water` tones with subtle wave animation

**Island positioning:**
- Pre-defined layout grid with organic offsets
- Larger islands (engine, landing) positioned center-back
- Smaller islands (scripts, docs) positioned front or edges
- Z-index layering creates depth (back islands darker/smaller, front brighter/larger)

### Floating Glass Tags

Each island gets a glassmorphic label badge floating above it.

```
  ╭─────────────────────╮
  │  🌲 engine          │
  │  8,200 lines        │
  ╰─────────────────────╯
```

- `backdrop-blur-sm bg-white/15 border border-white/20 rounded-lg`
- Name in `bark.DEFAULT` (dark mode: `cream.DEFAULT`)
- Line count in smaller text, updates with smooth counter animation
- Fades in when island first appears, stays persistent after

### Hybrid Tree Mapping

Within each island, trees represent the code structure.

**Mapping rules:**
1. Each significant subfolder (>50 lines) becomes its own tree
2. Small files and folders (<50 lines) are grouped into the parent tree
3. Tree height scales linearly with line count (min 35px, max 130px)
4. Tree species assigned by primary language:

| Primary Language | Tree Species | Why |
|-----------------|-------------|-----|
| Svelte | TreeCherry | Pink blossoms = component beauty |
| TypeScript | TreePine | Evergreen = typed foundation |
| Python | TreeAspen | Golden autumn = data/scripting |
| Go | TreeBirch | White bark = fast/clean |
| Markdown | Logo (Grove tree) | Documentation is the heart |
| Mixed/Other | TreePine | Default to evergreen |

5. Tree position: sampled along the island's curve path (same `samplePathString` from /forest)
6. Tree identity: each tree gets a stable ID (`{package}/{subfolder}`) for morph tracking

### Smooth Morphing

When the frame changes, trees transition between states.

**Tree appears (new folder added):**
- Starts at scale 0, opacity 0
- Grows to full size over 600ms with ease-out spring
- Small "sprout" particle effect (green dots rising)

**Tree grows (lines added):**
- Height tweens smoothly over 400ms
- Slight "sway" animation during growth (2deg rotation oscillation)

**Tree shrinks (lines removed):**
- Height tweens down over 400ms
- No special effect, just smooth reduction

**Tree dies (folder deleted):**
- Fades to brown/gray tones over 300ms
- Shrinks to 0 over 600ms with wither animation
- Small falling leaf particles

**Island appears (new package):**
- Rises from below the water line over 800ms
- Water ripple effect at base
- Glass tag fades in 200ms after island settles

### Seasonal Integration

The grove respects the global `seasonStore`, same as /forest.

| Season | Sky Gradient | Island Colors | Tree Behavior |
|--------|-------------|---------------|---------------|
| Spring | Pink → sky → lime | `greens.mint/meadow` | Cherry trees in peak bloom, spring foliage |
| Summer | Sky → emerald | `greens.deepGreen/grove` | Full foliage, standard colors |
| Autumn | Orange → amber | `autumn.rust/ember` | Deciduous trees turn amber/gold, pines stay green |
| Winter | Slate → cream | `winter.hillDeep/Mid/Near` | Bare branches, snow on pines, snow on islands |
| Midnight | Purple → indigo | `midnightBloom.deepPlum/purple` | Deep purples, warm gold accents |

**Atmospheric effects** (from existing nature components):
- Spring: `FallingPetalsLayer` (cherry blossoms drifting)
- Autumn: `FallingLeavesLayer` (leaves from deciduous trees)
- Winter: `SnowfallLayer` (snow settling on islands)
- Midnight: Subtle `Firefly` particles
- All seasons: `Cloud` components drifting across the sky

**Season toggle:** Bottom-right button, same UI as /forest page.

### Performance Budget

- Max 150 animated trees across all islands (same as /forest)
- Responsive density: fewer trees on mobile, more on desktop
- Debounced resize (250ms) to regenerate layout
- SVG islands use CSS transitions (no per-frame redraws)
- Tree morphing uses CSS transform/opacity (GPU-composited)
- Playback frame rate: 10 fps during play (100ms per frame tick)

### File Structure

```
apps/landing/src/routes/grove/
├── +page.server.ts           Load census DB, prepare snapshot frames
├── +page.svelte              Main page, MediaPlayer + GroveArchipelago
└── components/
    ├── GroveArchipelago.svelte   Full visualization container
    ├── GroveIsland.svelte        Single island with mound + trees
    ├── GroveGlassTag.svelte      Floating label badge
    ├── GroveTree.svelte          Tree wrapper with morph animations
    └── groveLayout.ts            Island positioning + tree mapping logic
```

---

## Data Schema

SQLite database at `apps/landing/static/data/grove_census.db`. Read at build time by the SvelteKit server loader.

```sql
-- Each row is one calendar day's snapshot
CREATE TABLE snapshots (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT NOT NULL UNIQUE,       -- 'YYYY-MM-DD'
  commit_hash TEXT NOT NULL,              -- git short hash
  total_lines INTEGER NOT NULL DEFAULT 0, -- sum of all code lines
  total_files INTEGER NOT NULL DEFAULT 0, -- total tracked files
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Each row is one directory in one snapshot
-- The tree structure is reconstructed by path hierarchy
CREATE TABLE directories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_id INTEGER NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  path        TEXT NOT NULL,              -- 'apps/landing/src'
  depth       INTEGER NOT NULL,           -- 0=root, 1=package, 2=subfolder
  total_lines INTEGER NOT NULL DEFAULT 0, -- total lines in this dir + children
  ts_lines    INTEGER NOT NULL DEFAULT 0,
  svelte_lines INTEGER NOT NULL DEFAULT 0,
  js_lines    INTEGER NOT NULL DEFAULT 0,
  css_lines   INTEGER NOT NULL DEFAULT 0,
  py_lines    INTEGER NOT NULL DEFAULT 0,
  go_lines    INTEGER NOT NULL DEFAULT 0,
  sql_lines   INTEGER NOT NULL DEFAULT 0,
  sh_lines    INTEGER NOT NULL DEFAULT 0,
  tsx_lines   INTEGER NOT NULL DEFAULT 0,
  md_lines    INTEGER NOT NULL DEFAULT 0,
  other_lines INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_directories_snapshot ON directories(snapshot_id);
CREATE INDEX idx_directories_path ON directories(path);
CREATE INDEX idx_snapshots_date ON snapshots(date);
```

### Query Examples

```sql
-- Get all snapshots in chronological order (for playback frames)
SELECT id, date, commit_hash, total_lines, total_files
FROM snapshots ORDER BY date ASC;

-- Get directory tree for a specific snapshot
SELECT path, depth, total_lines,
       ts_lines, svelte_lines, py_lines, go_lines,
       sql_lines, js_lines, css_lines, sh_lines, tsx_lines, md_lines
FROM directories
WHERE snapshot_id = ?
ORDER BY path ASC;

-- Get growth of a specific package over time
SELECT s.date, d.total_lines
FROM directories d
JOIN snapshots s ON s.id = d.snapshot_id
WHERE d.path = 'libs/engine'
ORDER BY s.date ASC;
```

### Data Loading

The SvelteKit server loader reads the .db file at build time and serializes frames as JSON to the client.

```typescript
// +page.server.ts (simplified)
import Database from 'better-sqlite3';

export async function load() {
  const db = new Database('static/data/grove_census.db', { readonly: true });

  const snapshots = db.prepare(
    'SELECT * FROM snapshots ORDER BY date ASC'
  ).all();

  const frames = snapshots.map(snapshot => ({
    date: snapshot.date,
    commit: snapshot.commit_hash,
    totalLines: snapshot.total_lines,
    directories: db.prepare(
      'SELECT * FROM directories WHERE snapshot_id = ?'
    ).all(snapshot.id)
  }));

  db.close();
  return { frames };
}
```

---

## Requirements

| ID | Pattern | Requirement | Priority |
|----|---------|-------------|----------|
| REQ-001 | Ubiquitous | The MediaPlayer shall expose `duration`, `currentTime`, `speed`, `playing`, and `loop` as bindable props | Must Have |
| REQ-002 | Ubiquitous | The MediaPlayer shall render a glassmorphic control bar with play/pause, step, scrubber, speed toggle, and fullscreen | Must Have |
| REQ-003 | Event-Driven | When the user presses Space, the MediaPlayer shall toggle play/pause | Must Have |
| REQ-004 | Event-Driven | When the user presses Arrow Left/Right, the MediaPlayer shall step back/forward one frame | Must Have |
| REQ-005 | Event-Driven | When playback reaches the end and loop is enabled, the MediaPlayer shall restart from frame 0 | Must Have |
| REQ-006 | Ubiquitous | The grove census script shall produce a SQLite database with `snapshots` and `directories` tables | Must Have |
| REQ-007 | Event-Driven | When run with `--backfill`, the census script shall walk the full git history, one snapshot per calendar day | Must Have |
| REQ-008 | Event-Driven | When run with `--today`, the census script shall capture only the current day's snapshot | Must Have |
| REQ-009 | Ubiquitous | The census script shall exclude `node_modules/`, `.git/`, `dist/`, `.svelte-kit/`, and `_archived/` | Must Have |
| REQ-010 | Ubiquitous | The /grove page shall render each top-level package as a floating island in an archipelago layout | Must Have |
| REQ-011 | Ubiquitous | Each island shall display a floating glassmorphic tag with the package name and line count | Must Have |
| REQ-012 | Event-Driven | When a new package appears in the timeline, its island shall rise from below the water line with animation | Should Have |
| REQ-013 | Event-Driven | When lines are added to a directory, its corresponding tree shall smoothly grow taller | Must Have |
| REQ-014 | Event-Driven | When a directory is removed, its tree shall wither and fade out | Should Have |
| REQ-015 | State-Driven | While the season is winter, deciduous trees shall display bare branches and islands shall show snow | Should Have |
| REQ-016 | State-Driven | While the season is spring, cherry trees shall display peak bloom colors and falling petals shall appear | Should Have |
| REQ-017 | Ubiquitous | The /grove page shall link to /journey with "See this as data" and /journey shall link back with "See this as a living forest" | Should Have |
| REQ-018 | Ubiquitous | The visualization shall cap at 150 animated trees for performance | Must Have |
| REQ-019 | Ubiquitous | The GitHub Action shall run daily at 6am UTC and commit the updated .db file | Should Have |
| REQ-020 | Ubiquitous | The MediaPlayer shall be keyboard accessible with visible focus indicators and aria labels | Must Have |

---

## Security Considerations

- **No secrets in the database.** The census only stores file paths, line counts, and commit hashes. No file contents, no credentials, no environment variables.
- **Static asset.** The .db file is a build-time static asset, not a live database. No SQL injection surface since there are no user-provided queries at runtime.
- **Git worktree isolation.** The backfill script uses temporary worktrees in `/tmp`. Each is cleaned up after use. No modification to the working tree.
- **GitHub Action permissions.** The census action needs only `contents: write` to commit the .db file. No secrets, no deploy keys, no external API calls.
- **Path traversal.** The census script validates that all counted paths are within the repository root. Directory paths stored in the database are relative (never absolute).

---

## Implementation Checklist

### Phase 1: MediaPlayer Component (Engine)

- [ ] Create `libs/engine/src/lib/ui/components/media/` directory structure
- [ ] Build `MediaPlayer.svelte` with slot-based API and bindable props
- [ ] Build `MediaControls.svelte` glassmorphic control bar
- [ ] Build `MediaScrubber.svelte` with drag, click, and keyboard support
- [ ] Build `MediaSpeedToggle.svelte` for 0.5x/1x/2x cycling
- [ ] Add fullscreen and loop toggle controls
- [ ] Add keyboard shortcuts (Space, Arrows, F, L)
- [ ] Add seasonal color awareness via `seasonStore`
- [ ] Add dark mode support via `themeStore`
- [ ] Export from `@autumnsgrove/lattice/ui/media`
- [ ] Write component tests

### Phase 2: Grove Census Script

- [ ] Create `scripts/grove/grove-census.sh`
- [ ] Implement `--backfill` mode (walk full git history by day)
- [ ] Implement `--today` mode (single day snapshot)
- [ ] Implement directory tree counting with language breakdown
- [ ] Create SQLite schema (snapshots + directories tables)
- [ ] Add exclusion filters (node_modules, dist, etc.)
- [ ] Run backfill on the full Lattice repository
- [ ] Validate output data, spot-check a few snapshots
- [ ] Place `grove_census.db` in `apps/landing/static/data/`

### Phase 3: The /grove Page

- [ ] Create `apps/landing/src/routes/grove/` route
- [ ] Build `+page.server.ts` to load and serialize census DB
- [ ] Build `GroveArchipelago.svelte` container with sky/water/atmosphere
- [ ] Build `GroveIsland.svelte` with SVG mound rendering
- [ ] Build `GroveGlassTag.svelte` floating label badges
- [ ] Build `GroveTree.svelte` wrapper with morph animations
- [ ] Implement `groveLayout.ts` for island positioning and tree mapping
- [ ] Implement tree species assignment by primary language
- [ ] Implement smooth morphing: sprout, grow, shrink, wither
- [ ] Implement island rise animation for new packages
- [ ] Wire up `<MediaPlayer>` with frame data
- [ ] Add custom `formatTime` to show dates instead of seconds
- [ ] Add seasonal integration (sky, islands, trees, effects)
- [ ] Add falling petals/leaves/snow layers per season
- [ ] Add cloud layer
- [ ] Add sibling links to /journey (both directions)
- [ ] Add season toggle button

### Phase 4: Automation

- [ ] Create `.github/workflows/grove-census.yml`
- [ ] Configure daily cron at 6am UTC
- [ ] Test with `workflow_dispatch` trigger
- [ ] Verify .db commit and push works correctly

### Phase 5: Polish

- [ ] Performance testing: verify 150-tree cap holds on mobile
- [ ] Responsive layout: test mobile, tablet, desktop, ultrawide
- [ ] Accessibility audit: keyboard nav, screen reader, focus management
- [ ] Cross-browser testing: Chrome, Firefox, Safari
- [ ] Add hover interactions on islands/trees (optional tooltip details)
- [ ] Final visual polish pass with seasonal screenshots

---

*From a single seed, a forest.*
