---
title: Weave — Visual Composition Studio
description: Node-graph editor for animations and diagrams within Terrarium
category: specs
specCategory: platform-services
icon: splinepointer
lastUpdated: "2026-01-06"
aliases: []
tags:
  - animation
  - diagrams
  - node-graph
  - terrarium
---

# Weave — Visual Composition Studio

```
          ┌─────────────────────────────────────────┐
          │              THE WEAVE                  │
          │       (node-graph composition)          │
          │                                         │
          │    [Rock]───────[Vine]───────[Vine]     │
          │       │            │            │       │
          │       │     threads connect     │       │
          │    [Vine]      [Vine]       [Vine]      │
          │       │                                 │
          │    [Vine]                               │
          │                                         │
          └─────────────────────────────────────────┘
                            ↓
          ┌─────────────────────────────────────────┐
          │           LIVE MODE (Terrarium)         │
          │                                         │
          │         🪨~~~🌿~~~~🌿                    │
          │          |    |    |                    │
          │         🌿    🌿   🌿                    │
          │          |                              │
          │         🌿   ~ jangle jangle ~          │
          │                                         │
          └─────────────────────────────────────────┘
```

> _Weave your world together._

**Status:** Spec Complete
**Parent Feature:** Terrarium
**Location:** Studio mode within Terrarium

---

## Naming

### Chosen: Weave

**Visual Composition Studio** · `grove.place/weave`

To weave is to interlace threads into fabric, to bring separate strands together into something whole. It's an action — hands moving, patterns forming, creation in motion.

Weave is Grove's visual composition studio. Place elements on a grid, draw connections between them, watch relationships come alive. Create animations where chained vines ripple when shaken. Build diagrams with glass cards and icons that map your architecture. Whether motion or structure, Weave is where you bring it all together.

The connections themselves are called **threads** — the individual strands you weave together to create the whole.

_Weave your world together._

### Why Weave?

- **Active verb** — fits the creation/animation context perfectly
- **Intuitive action** — "weave your scene together" just makes sense
- **Textile meets nature** — threads through a forest, vines intertwining
- **Simple and memorable** — easy to say, easy to remember

### Other Candidates Considered

| Name          | Why Not                                |
| ------------- | -------------------------------------- |
| **Bower**     | More noun-like, less active energy     |
| **Canopy**    | Too observational, not creative enough |
| **Thread**    | Better for the connections themselves  |
| **Sway/Fern** | Good sub-mode names if needed later    |

---

## Internal Naming

| Public Name           | Internal Name | Icon             |
| --------------------- | ------------- | ---------------- |
| Weave                 | GroveWeave    | `spline-pointer` |
| Breeze (animation)    | GroveBreeze   | `wind`           |
| Trace (diagrams)      | GroveTrace    | `waypoints`      |
| Threads (connections) | GroveThreads  | `route`          |

### Sub-Mode Naming

**Breeze** — _Animation Mode_

A breeze is the invisible force that moves through and makes everything respond. It propagates naturally—a breeze doesn't stop at one leaf. Send a breeze through your scene, and watch motion ripple through every connected element.

_Let it breathe._

**Trace** — _Diagram Mode_

In the forest, you trace tracks to find where an animal went. You trace a stream to find its source. You trace the veins in a leaf to understand how it grows. Tracing reveals structure that was already there—making the invisible visible, the unclear clear.

Trace is where you diagram. Connect one point to another. Show relationships. Map structure. Make someone understand.

_Follow the path. Reveal the structure._

---

## Overview

Weave is an extension of Terrarium that transforms static scene composition into dynamic animation creation and diagram building. Think of it as a **node-graph editor** (like n8n or LangChain) meets **motion design** — you connect assets with threads, define timing between connections, and watch chains of movement ripple through your scene.

### The Core Idea

1. **Breeze Mode** — Animation with nature assets, timing controls, propagation-based motion
2. **Trace Mode** — Diagrams with glass cards, Lucide icons, static relationships
3. **Shared Engine** — Both modes use the same node-graph foundation with threads connecting nodes

---

## Two Modes

### Breeze Mode (Animation)

The workspace for building animated relationships with nature assets. Send a breeze through your scene and watch motion propagate.

```
┌──────────────────────────────────────────────────────────────┐
│  ◎ Weave: Breeze                       [Grid: 0.5rem ▾]      │
├────────────┬─────────────────────────────────────────────────┤
│   Assets   │  · · · · · · · · · · · · · · · · · · · · · ·    │
│  ────────  │  ·       ·       ·       ·       ·         ·    │
│  🪨 Rock   │  ·   [Rock]──────────[Vine A]    ·         ·    │
│  🌿 Vine   │  ·       │       ·       │       ·         ·    │
│  🌲 Tree   │  ·       │       ·       │       ·         ·    │
│  ╫ Lattice │  ·   [Vine B]    ·   [Vine C]───[Vine D]   ·    │
│            │  ·       ·       ·       ·       ·         ·    │
│            │  · · · · · · · · · · · · · · · · · · · · · ·    │
├────────────┴─────────────────────────────────────────────────┤
│  Thread: Rock → Vine A                                       │
│  Duration: [0.3s____]  Easing: [ease-out ▾]  Delay: [0s___]  │
└──────────────────────────────────────────────────────────────┘
```

**Key Features:**

- Snap-to-grid placement (0.5rem increments for half-steps)
- Draw connections by dragging lines between assets
- Select connections to configure timing/easing
- Visual hierarchy of parent-child relationships

#### Breeze Editor in Detail

When you open Breeze mode, you're working with:

```
┌───────────────────────────────────────────────────────────────┐
│  ◎ Weave: Breeze                   [Preview] [Grid: 32px ▾]   │
├──────────────┬────────────────────────────────────────────────┤
│              │                                                │
│   PALETTE    │        Canvas (Snap to Grid)                   │
│  ──────────  │                                                │
│              │                                                │
│  ┌─ Trees ─┐ │        ╲    /                                  │
│  │ Pine   ▶│ │         \  /    ⟵ Drag to place asset         │
│  │ Birch   │ │          \/                                    │
│  └─────────┘ │        [Tree] ····· connection start           │
│              │          |  ······                             │
│  ┌─Creatures┐│        ·····    [Vine A]                       │
│  │ Butterfly▶│ │        |          |··········                │
│  │ Firefly │ │        [Rock]    [Vine B]  [Vine C]            │
│  │ Bee     │ │          ↑           ↓        ↓                │
│  └─────────┘ │        Root        Child    Child              │
│              │                                                │
│  ┌─Ground ─┐ │     ─ Connections show with arrows             │
│  │ Rock  ▶ │ │     ─ Drag to adjust node positions            │
│  │ Mushroom│ │                                                │
│  └─────────┘ │                                                │
│              │                                                │
│     (scroll) │ ┌──────────────────────────────────────────┐   │
│              │ │  Selected: Rock → Vine A                 │   │
│              │ ├──────────────────────────────────────────┤   │
│              │ │  Duration:  [0.3s_____]  seconds         │   │
│              │ │  Delay:     [0.0s_____]  seconds         │   │
│              │ │  Easing:    [ease-out ▾]                 │   │
│              │ │                                          │   │
│              │ │  [ Remove Thread ]                       │   │
│              │ └──────────────────────────────────────────┘   │
│              │                                                │
└──────────────┴────────────────────────────────────────────────┘
```

#### Thread Connection Visualization

When you drag between two assets, a preview line appears:

```
User drags from [Rock] to [Vine A]:

    Before release:          After release:

    [Rock]----●              [Rock]═══════[Vine A]
      ↑       ↑
    source  cursor (dragging)

Result: Thread created with default timing
        Click on thread line to edit properties
```

---

### Trace Mode (Diagram)

The workspace for building static relationship diagrams with glass cards and icons.

```
┌───────────────────────────────────────────────────────────────┐
│  ◎ Weave: Trace                    [Export] [Grid: 32px ▾]    │
├──────────────┬────────────────────────────────────────────────┤
│              │                                                │
│   PALETTE    │        Diagram Canvas                          │
│  ──────────  │                                                │
│              │    ╭──────────────╮      ╭──────────────╮      │
│  ┌─ Cards ──┐│    │   Request    │─────→│   Handler    │      │
│  │ Standard▶││    │    Cloud     │      │    Zap       │      │
│  │ Accent   ││    ╰──────────────╯      ╰──────────────╯      │
│  │ Muted    ││           ↓                     ↓              │
│  └──────────┘│    ╭──────────────╮      ╭──────────────╮      │
│              │    │  Database    │←─────│   Cache      │      │
│  ┌─ Icons ─┐ │    │ Database     │      │   Zap        │      │
│  │ Cloud  ▶│ │    ╰──────────────╯      ╰──────────────╯      │
│  │ Database│ │                                                │
│  │ Zap     │ │    Click cards to edit labels & icons          │
│  │ Shield  │ │    Arrows show data flow direction             │
│  │ Server  │ │                                                │
│  │ Lock    │ │                                                │
│  └─────────┘ │  ┌──────────────────────────────────────────┐  │
│              │  │  Selected: Request → Handler             │  │
│  ┌─ Lines ──┐│  ├──────────────────────────────────────────┤  │
│  │ Solid ──→││  │ Label: [request_flow__________]          │  │
│  │ Dashed---││  │ Style: [Solid arrow ▾]                   │  │
│  │ Bi-arrow↔││  │                                          │  │
│  └──────────┘│  [ Remove Connection ]                      │  │
│              │  └──────────────────────────────────────────┘  │
│              │                                                │
└──────────────┴────────────────────────────────────────────────┘
```

#### Asset Placement in Trace Mode

```
Creating a diagram step by step:

1. Drag "Request" card from palette to canvas
2. Drag "Handler" card → arrange side-by-side
3. Click Request → select icon (Cloud, Zap, etc.)
4. Click Handler → select icon
5. Drag line from Request to Handler
6. Click the line → set label and style

Result: Clean, labeled relationship diagram
        Export as SVG or PNG for documentation
```

---

### Timing & Easing Reference

For Breeze mode animations, understand how timing affects motion:

```
Duration Controls How Long Animation Plays:

  0.1s (quick):    [Rock] → snap ← vines follow fast
  0.3s (default):  [Rock] ··· → vines follow naturally
  1.0s (slow):     [Rock] ····· → graceful, flowing motion

Delay Controls When Child Starts:

  Chain with staggered delays:

  [Parent] moves immediately
     ↓ (0.1s delay)
  [Child 1] starts moving
     ↓ (0.1s delay)
  [Child 2] starts moving
     ↓ (0.1s delay)
  [Child 3] starts moving

  Result: Wave-like ripple effect down the chain

Easing Curves (visual reference):

  ease-in        ease-out       ease-in-out      bounce
  (slow→fast)    (fast→slow)    (both)           (springy)

     /               \            /\              ⌢⌢⌢
    /                 \          /  \            ⌢
   /_______________     \_____  /_____\  _______
                                            ↑
                                         exaggerated for visibility
```

### Live Mode (Terrarium)

The existing Terrarium canvas, enhanced to play animations.

- Preview animations in real-time
- Jiggle/drag parent assets to see chain reactions
- Toggle between edit and preview states
- Same export capabilities (PNG, GIF, video, blog import)

---

## Grid System

### Placement Grid

- **Unit:** 0.5rem increments (half-steps)
- **Purpose:** Precise, even alignment — whole numbers with half-steps between
- **Snap behavior:** Assets snap to grid intersections when dragged
- **Snap override:** Hold `Shift` while dragging for pixel-perfect free placement (standard design tool behavior)

### Alignment Options

| Type                 | Description                        |
| -------------------- | ---------------------------------- |
| **Corner-to-corner** | Align asset corners to grid points |
| **Side-to-side**     | Align asset edges                  |
| **Center**           | Align asset centers to grid        |

---

## Thread System

Threads define relationships between assets. When a parent moves, connected children follow.

### Thread Properties

| Property     | Description                                       | Default  |
| ------------ | ------------------------------------------------- | -------- |
| **Duration** | Time for child to respond to parent movement      | 0.3s     |
| **Delay**    | Wait time before child starts moving              | 0s       |
| **Easing**   | Animation curve (ease-in, ease-out, bounce, etc.) | ease-out |

### Thread Behavior (V1)

For V1, connections use **animation propagation** — parent moves, children follow with configurable delay and easing. No physics simulation.

```
Parent moves → 0.1s delay → Child A moves → 0.1s delay → Child B moves
```

### Chain Behavior

The rock-and-vines example:

```
[Rock] (root)
   │
   ├── [Vine 1]
   │      ├── [Vine 1a]
   │      └── [Vine 1b]
   │
   ├── [Vine 2]
   │      └── [Vine 2a]
   │             └── [Vine 2aa]
   │
   └── [Vine 3]
```

**Jiggle the rock → all vines jangle in sequence, delays cascading down the tree.**

---

## Animation Workflow

### Creating an Animation

1. **Enter Grid Matrix Editor** — Switch from Live Mode to Studio
2. **Enable Grid** — Turn on 0.5rem snap grid
3. **Place Assets** — Drag assets onto grid points
4. **Draw Connections** — Drag lines between assets to connect them
5. **Configure Timing** — Select connections, adjust duration/delay/easing
6. **Preview** — Switch to Live Mode, jiggle parent assets
7. **Export** — Save as GIF, video, or import to blog

### Example: Swaying Lattice Garden

1. Place `Lattice` at center
2. Connect multiple `Vine` assets to lattice
3. Connect `Butterfly` to one vine
4. Set vine connections: 0.2s duration, staggered delays
5. Set butterfly: 0.5s duration, 0.3s delay
6. In Live Mode: move lattice side-to-side
7. Result: lattice sways → vines follow in wave → butterfly bobs along

---

## Export Options

| Format               | Use Case                                          | Mode   |
| -------------------- | ------------------------------------------------- | ------ |
| **Blog Import**      | Live animation plays on Grove blog (uses Foliage) | Breeze |
| **GIF**              | Shareable, loops forever                          | Breeze |
| **Video (WebM/MP4)** | Higher quality, social sharing                    | Breeze |
| **PNG Sequence**     | Frame-by-frame for external editing               | Breeze |
| **SVG**              | Scalable vectors for docs, embeds                 | Trace  |
| **PNG**              | Static image export                               | Both   |

---

## Phased Implementation

### V1: Animation Propagation

- Grid Matrix Editor with node-graph connections
- Basic timing controls (duration, delay, easing)
- Propagation-based chain reactions (no physics)
- Export to GIF/video
- Blog import integration

### V2: Real Physics

- Physics simulation engine (spring tension, momentum, gravity)
- Configurable physics properties per connection
- More organic, realistic chain movement
- Wind/force effects

---

## Integration with Terrarium

Weave lives **inside** Terrarium as a mode/tab:

```
┌─────────────────────────────────────────────────────────────┐
│  ◎ Terrarium                                                │
│  ┌──────────────┬──────────────┬──────────────┐             │
│  │  🎨 Canvas   │  🔗 Weave     │  📦 Export   │             │
│  └──────────────┴──────────────┴──────────────┘             │
│                                                             │
│  [Current mode content here]                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- **Canvas** — Existing Terrarium (static composition + Live preview)
- **Weave** — Node-graph editor (threads + timing)
- **Export** — Export dialog (now supports animation formats)

---

## Diagram Editor — Shared Node-Graph Engine

The same node-graph engine that powers Animation Studio can also power a **Grove-styled diagram editor** — a lightweight alternative to Mermaid that renders natively without heavy external libraries.

### The Problem with Mermaid

Mermaid diagrams are powerful but:

- Heavy rendering library (bloats bundle size)
- External dependency for what's essentially boxes and arrows
- Styling doesn't match Grove's aesthetic

### The Solution

Build diagram rendering into the same node-graph foundation:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHARED NODE-GRAPH ENGINE                     │
├─────────────────────────────┬───────────────────────────────────┤
│      Animation Studio       │        Diagram Editor             │
├─────────────────────────────┼───────────────────────────────────┤
│  Assets: Nature components  │  Assets: Glass cards + icons      │
│  Connections: Timing/glue   │  Connections: Arrows/lines        │
│  Output: Animations         │  Output: Static diagrams          │
│  Mode: Live preview         │  Mode: Rendered SVG/embed         │
└─────────────────────────────┴───────────────────────────────────┘
```

### Diagram Editor Features

**Node Types:**

- **Glass Cards** — Grove's glassmorphism aesthetic, customizable content
- **Lucide Icons** — MIT-licensed, tree-shakeable, perfect fit
- **Text Nodes** — Simple labeled boxes
- **Custom Components** — Extend with Svelte components

**Connection Types (Threads):**

- Solid arrows (→)
- Dashed lines (--)
- Labeled connections
- Directional/bidirectional

**Diagram Types (potential):**

- Flowcharts
- Sequence diagrams
- Entity relationships
- Mind maps
- Architecture diagrams

```
┌──────────────────────────────────────────────────────────────┐
│  ◎ Weave: Trace                           [Export ▾]         │
├────────────┬─────────────────────────────────────────────────┤
│   Palette  │                                                 │
│  ────────  │    ╭─────────────╮         ╭─────────────╮      │
│  ▢ Card    │    │   Request   │────────→│   Handler   │      │
│  ◇ Diamond │    │   Cloud     │         │   Zap       │      │
│  ○ Circle  │    ╰─────────────╯         ╰─────────────╯      │
│  ─ Line    │          │                        │             │
│            │          │                        │             │
│  Icons:    │          ▼                        ▼             │
│  Cloud     │    ╭─────────────╮         ╭─────────────╮      │
│  Zap       │    │  Database   │←────────│   Cache     │      │
│  Database  │    │  Database   │         │   Zap       │      │
│  Shield    │    ╰─────────────╯         ╰─────────────╯      │
└────────────┴─────────────────────────────────────────────────┘
```

### Glassmorphism for Diagram Nodes

Diagram nodes use Grove's glass component system for consistent styling:

```svelte
<script>
	import { GlassCard } from "@lattice/ui/ui";
	import { Database, Zap, Cloud } from "@lucide/svelte";
</script>

<!-- Glass card node in diagram -->
<GlassCard variant="card" hoverable class="w-40">
	<div class="flex items-center gap-2">
		<Database class="w-5 h-5" />
		<span>Database</span>
	</div>
</GlassCard>
```

**Glass Variants for Diagrams:**

| Variant  | Use Case                                      |
| -------- | --------------------------------------------- |
| `card`   | Standard diagram nodes (80% opacity)          |
| `accent` | Highlighted/selected nodes (30% accent color) |
| `tint`   | Background grouping boxes (60% opacity)       |
| `muted`  | Disabled/inactive nodes (40% opacity)         |

### Lucide Icon Mapping for Diagrams

Standard icons for common diagram concepts:

```typescript
// Recommended icon mappings
const diagramIcons = {
	// Infrastructure
	database: Database,
	server: Server,
	cloud: Cloud,
	storage: HardDrive,

	// Actions
	process: Zap,
	transform: ArrowRightLeft,
	filter: Filter,

	// Data
	input: ArrowDownToLine,
	output: ArrowUpFromLine,
	queue: ListOrdered,

	// Control
	decision: GitBranch,
	loop: RefreshCw,
	start: Play,
	end: Square,

	// Security
	auth: ShieldCheck,
	lock: Lock,
	key: Key,
} as const;
```

### Output Formats

| Format          | Use Case                                         |
| --------------- | ------------------------------------------------ |
| **Live Svelte** | Renders directly in blog posts, no external deps |
| **SVG Export**  | Clean vectors for docs, READMEs                  |
| **PNG Export**  | Static images                                    |
| **Embed Code**  | Copy/paste component into posts                  |

### Icon Integration

[Lucide](https://lucide.dev) icons are:

- MIT licensed (fully permissive)
- Tree-shakeable (only import what you use)
- SVG-based (scales perfectly)
- 1000+ icons available

```svelte
<script>
	import { Cloud, Zap, Database } from "@lucide/svelte";
</script>
```

---

## Architecture Patterns

### D1 Batch Calls via Loom

For persistence, wrap diagram/animation data in D1 batch operations using the Loom pattern:

```typescript
// Example: Save diagram with all nodes and connections in one batch
await loom.batch([
	db.insert(diagrams).values({ id, name, userId }),
	...nodes.map((node) => db.insert(diagramNodes).values(node)),
	...connections.map((conn) => db.insert(diagramConnections).values(conn)),
]);
```

Benefits:

- Single round-trip for complex saves
- Transactional consistency
- Efficient for node-graph structures with many relationships

### Shared Engine Components

```
libs/engine/src/lib/ui/components/
├── node-graph/                 # Shared foundation
│   ├── Grid.svelte            # Snap grid system
│   ├── Connection.svelte      # Line/arrow rendering
│   ├── Node.svelte            # Base node wrapper
│   ├── Canvas.svelte          # Pan/zoom canvas
│   └── types.ts               # Shared types
│
├── terrarium/                  # Animation Studio
│   ├── ...existing...
│   └── uses node-graph/
│
└── diagrams/                   # Diagram Editor (new)
    ├── DiagramEditor.svelte
    ├── GlassCard.svelte
    ├── IconNode.svelte
    └── uses node-graph/
```

---

## Decisions Made

### Naming

- [x] **Weave** — unified node-graph engine
- [x] **Breeze** — animation sub-mode (nature assets, timing, propagation)
- [x] **Trace** — diagram sub-mode (glass cards, Lucide icons, static)
- [x] **Threads** — the connections between nodes

### Technical

- [x] **Threads in Live Mode** → Hidden by default, toggle to show
- [x] **Circular connections** → Detect and warn, but allow (valid for showing circular deps)
- [x] **Max chain depth** → 15 levels (tested ceiling)
- [x] **Preset jiggle patterns** → Yes! `wave`, `pulse`, `random`, `cascade`
- [x] **Resource limits** → 100 nodes, 200 threads, 4000×4000px canvas max

### Diagram Editor

- [x] **Markdown shortcode** → Yes, fenced code block syntax:
  ````markdown
  ```weave
  [Request] --> [Handler]
  [Handler] --> [Database]
  ```
  ````
  Rendered via Cloudflare Worker, displayed live in posts.
- [x] **Dark/light mode** → Editor UI defaults to dark mode (better for creative tools). Exports inherit the _target blog's_ theme setting, not the editor's. Markdown shortcode diagrams auto-adapt to page theme.

### Open Questions (Remaining)

- [ ] Starter Lucide icon palette — which icons to include by default?
- [ ] Audio sync possibilities for V2+?
- [ ] Physics simulation parameters for V2?
- [ ] Community sharing of weave compositions?

---

## Security & Resource Limits

### Input Sanitization

**JSON Fields** (`canvas_settings`, `props`):

- Parse all JSON through a strict validator before storage
- Define allowed keys per component type (no arbitrary fields)
- Reject unknown properties, sanitize values

**Text Fields** (`label`, `name`):

- Strip HTML tags from all user-provided text
- Escape special characters before rendering
- Max lengths: name (100 chars), label (50 chars)

### XSS Prevention

Thread labels and node content render in the canvas and exports:

```typescript
// All user text goes through sanitization
import { sanitize } from "$lib/utils/security";

const safeLabel = sanitize(thread.label, { maxLength: 50 });
const safeName = sanitize(node.name, { maxLength: 100 });
```

**SVG Export Sanitization:**

SVG files can contain executable JavaScript. All SVG exports must:

- Strip `<script>` tags entirely
- Remove event handlers (`onclick`, `onload`, `onerror`, `onmouseover`, etc.)
- Remove `javascript:` URLs from `href` and `xlink:href` attributes
- Whitelist safe SVG elements only (no `<foreignObject>`, `<use>` with external refs)
- Escape text content and attribute values
- Use DOMPurify or equivalent for final sanitization pass

```typescript
// SVG export sanitization
import DOMPurify from "dompurify";

const safeSvg = DOMPurify.sanitize(svgString, {
	USE_PROFILES: { svg: true },
	ADD_TAGS: ["use"], // Allow internal use refs only
	FORBID_ATTR: ["onclick", "onload", "onerror", "onmouseover"],
	FORBID_TAGS: ["script", "foreignObject"],
});
```

### Resource Limits

| Resource                    | Limit                 | Rationale                               |
| --------------------------- | --------------------- | --------------------------------------- |
| **Nodes per composition**   | 100                   | Prevents canvas performance degradation |
| **Threads per composition** | 200                   | Max 2 connections per node average      |
| **Chain depth**             | 15 levels             | Tested propagation delay ceiling        |
| **Compositions per user**   | 50 (free), 200 (paid) | Storage tier limits                     |
| **Canvas dimensions**       | 4000×4000px           | Export and render ceiling               |
| **JSON field size**         | 10KB                  | Prevents blob storage abuse             |

### Cycle Detection

Circular connections are allowed (useful for showing circular dependencies in diagrams) but:

- Display warning indicator on cyclic threads (orange dashed outline)
- Export warnings note cycle presence

**Live Mode behavior for cycles:**

- Propagation stops at the cycle point (no infinite loops)
- User sees animation propagate up to the repeated node, then halt
- Visual indicator pulses briefly on the cycle-completing thread
- Tooltip: "Chain stopped: circular connection detected"

### Rate Limiting

Composition operations follow standard Threshold patterns:

- Create: 10/minute per user
- Update: 30/minute per user
- Export: 10/minute per user (allows retries for failed exports)

---

## D1 Schema (Draft)

For persistence via Loom batch pattern:

```sql
-- Weave compositions (animations + diagrams)
CREATE TABLE weave_compositions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'animation' | 'diagram'
  canvas_settings TEXT, -- JSON
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Nodes in a composition
CREATE TABLE weave_nodes (
  id TEXT PRIMARY KEY,
  composition_id TEXT NOT NULL,
  component_name TEXT NOT NULL, -- 'Rock', 'Vine', 'GlassCard', etc.
  position_x REAL NOT NULL,
  position_y REAL NOT NULL,
  props TEXT CHECK(length(props) <= 10240), -- 10KB limit
  z_index INTEGER DEFAULT 0,
  FOREIGN KEY (composition_id) REFERENCES weave_compositions(id) ON DELETE CASCADE
);

-- Threads (connections between nodes)
CREATE TABLE weave_threads (
  id TEXT PRIMARY KEY,
  composition_id TEXT NOT NULL,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  duration REAL DEFAULT 0.3, -- seconds (animation only)
  delay REAL DEFAULT 0, -- seconds (animation only)
  easing TEXT DEFAULT 'ease-out',
  line_style TEXT DEFAULT 'solid', -- 'solid' | 'dashed' | 'arrow'
  label TEXT CHECK(length(label) <= 50), -- 50 char limit
  FOREIGN KEY (composition_id) REFERENCES weave_compositions(id) ON DELETE CASCADE,
  FOREIGN KEY (source_node_id) REFERENCES weave_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (target_node_id) REFERENCES weave_nodes(id) ON DELETE CASCADE
);
```

---

## Related Documents

- [[terrarium-spec]] — Parent feature spec
- [[foliage-spec]] — Blog decoration system (if exists)
- [[grove-naming]] — Naming philosophy
- [[docs/scratch/node-graph-studio-naming]] — Naming journey scratchpad

---

_Draft created: January 6th, 2026_
_Updated: January 6th, 2026_

- Added Diagram Editor concept (Fern mode)
- Completed grove walk, chose **Weave** as unified name
- Sub-modes: **Breeze** (animation) + **Trace** (diagrams)
- Added glassmorphism patterns and Lucide icon mapping
- Added D1 schema draft for Loom integration
- Decided: markdown shortcode syntax, dark mode default, preset jiggle patterns
- Added Security & Resource Limits section (JSON sanitization, XSS prevention, resource caps)

_Status: Spec complete — ready for implementation planning_
