---
title: "Reverie — Composition Layer"
description: "AI-powered component composition that turns intent into form, making Grove malleable software."
category: specs
specCategory: "customization"
icon: sparkles
lastUpdated: "2026-02-02"
aliases: []
date created: Sunday, February 2nd 2026
date modified: Sunday, February 2nd 2026
tags:
  - composition
  - ai
  - malleable-software
  - svelte
type: tech-spec
---

# Reverie — Composition Layer

```
                    ☀️
                 ·  · ·  ·
              ·    ╱│╲    ·
           ·    ╱  │  ╲    ·
        ·    ╱    │    ╲    ·
           🌲    🌲    🌲
          ╱  ╲  ╱  ╲  ╱  ╲
         ╱    ╲╱    ╲╱    ╲
        ·  ·  ·  ✨  ·  ·  ·
           ·    ·    ·
              ·  ·

    morning light through branches
    dew on leaves
    a vision taking shape

        Half-dream, half-real.
```

> *Half-dream, half-real. Yours.*

Reverie is the composition layer that makes Grove malleable. You describe a feeling. Reverie finds the components. The vision takes form.

**Public Name:** Reverie
**Internal Name:** GroveReverie
**Domain:** `reverie.grove.place`
**Package:** `@autumnsgrove/reverie`
**Status:** Planning (Research Phase)

A reverie is that state between waking and dreaming, when you're gazing at sunlight through branches and something forms in your mind's eye. Not a plan. A vision. Reverie takes your half-formed dreams and gives them shape.

---

## Overview

### The Problem

Grove has 60+ nature components, a composition canvas (Terrarium), and interactive curios. But there's a gap:

| Level | What It Is | Skill Required |
|-------|------------|----------------|
| 1 | Pick a theme (Foliage) | None |
| 2 | Drag-drop in Terrarium | Minimal |
| 3 | ??? | ??? |
| 4 | Write custom Svelte | Developer skills |

The jump from Level 2 to Level 4 is a cliff. Most Wanderers will never cross it.

### The Solution

Reverie creates **Level 3**: describe what you want in natural language, and an AI agent composes it from existing components.

```
"Add fireflies around my guestbook, something peaceful for evening"
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        REVERIE                              │
│                                                             │
│  1. Parse intent: glowing, peaceful, evening, guestbook     │
│  2. Query manifest: firefly, lantern, moonlight, star       │
│  3. Compose vision: 5-8 fireflies, scattered, foreground    │
│  4. Generate form: Terrarium-compatible scene               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              [Scene ready for Terrarium import]
```

---

## Design Philosophy

### Dreams, Not Specifications

Wanderers don't think in component names and prop values. They think in feelings:
- "Something cozy"
- "Glowing but not too bright"
- "Like a forest at dusk"

Reverie translates feelings into technical composition.

### Invisible by Default

Most Wanderers will never see Reverie directly. They'll chat with an agent, describe what they want, and see results in Terrarium. The composition layer disappears into the background.

### Gentle Slope Available

For curious Wanderers, the Vision DSL is human-readable. They can see what the agent generated, tweak it, learn from it. The door to Level 3.5 stays open.

### Bounded Creativity

Reverie only composes from Grove's curated component library. You can't create something garish because the palette is curated. Creative freedom with guardrails.

---

## Architecture

### Three Parts

```
┌─────────────────────────────────────────────────────────────────────┐
│                           REVERIE                                   │
│                                                                     │
│  ┌───────────────────┐  ┌───────────────────┐  ┌─────────────────┐  │
│  │     MANIFEST      │  │    VISION DSL     │  │ AGENT INTERFACE │  │
│  │                   │  │                   │  │                 │  │
│  │ Component catalog │  │ Composition       │  │ Dream → Form    │  │
│  │ with semantic     │→ │ language simpler  │→ │ translation     │  │
│  │ metadata & tags   │  │ than Svelte       │  │ layer           │  │
│  │                   │  │                   │  │                 │  │
│  └───────────────────┘  └───────────────────┘  └─────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1. The Manifest

A machine-readable catalog of all composable components:

```yaml
# Example manifest entry
butterfly:
  displayName: Butterfly
  category: creatures
  description: "A delicate creature with flapping wings"

  tags:
    - flying
    - animated
    - colorful
    - small
    - spring
    - summer

  props:
    wingColor:
      type: color
      default: palette.flowers.wildflower.purple
      description: "Main wing color"
    accentColor:
      type: color
      default: palette.flowers.wildflower.buttercup
    animate:
      type: boolean
      default: true

  composesWellWith:
    - wildflower
    - garden
    - meadow
    - spring-scene

  avoidWith:
    - underwater
    - winter
    - night-only

  complexity: 5
  tier: seedling
```

**Manifest Generation:**
- Auto-generate base from TypeScript prop interfaces
- Hand-curate semantic tags, composition hints
- Validate against component inventory

### 2. The Vision DSL

A YAML-based composition language:

```yaml
# A "Firefly Garden" vision
name: Firefly Garden
description: "Peaceful evening scene with glowing fireflies"
mood:
  - glowing
  - peaceful
  - evening

elements:
  - component: firefly
    count: 5-8
    placement: scattered
    layer: foreground
    props:
      animate: true

  - component: wildflower
    count: 3-5
    placement: ground-level
    props:
      color: vary(palette.flowers.*)

  - component: moon
    count: 1
    placement: sky-right
    props:
      phase: crescent

constraints:
  maxComplexity: 150
  respectsReducedMotion: true

exports:
  - terrarium-scene
  - foliage-decoration
```

**DSL Features:**
- `count: 5-8` — Random within range
- `placement: scattered` — Automatic positioning algorithm
- `vary(palette.*)` — Random selection from palette
- `layer: foreground` — Z-index control
- `constraints` — Performance and accessibility budgets

### 3. The Agent Interface

How AI agents interact with Reverie:

```typescript
interface ReverieAgent {
  // Parse natural language into structured intent
  dream(input: string): Promise<Intent>;

  // Query manifest for matching components
  discover(intent: Intent): Promise<Component[]>;

  // Compose components into a vision
  compose(components: Component[], intent: Intent): Promise<Vision>;

  // Generate final form for target system
  form(vision: Vision, target: 'terrarium' | 'foliage' | 'curio'): Promise<Output>;
}

interface Intent {
  mood: string[];           // "cozy", "glowing", "evening"
  elements: string[];       // "fireflies", "guestbook"
  constraints: Constraint[];
  context: Context;         // Where this will be used
}
```

---

## Integration Points

### With Terrarium

Reverie visions export as Terrarium-compatible scenes:

```
Reverie Vision → TerrariumScene → Import into Terrarium
```

Wanderers can:
1. Generate a vision via agent
2. Import into Terrarium
3. Fine-tune with drag-drop
4. Export as decoration

### With Foliage

Reverie visions can become theme decorations:

```
Reverie Vision → FoliageDecoration → Apply to blog
```

### With Curios

Reverie could compose curio templates:

```
Reverie Vision → CurioTemplate → Customized shrine/guestbook styling
```

### With Mycelium (MCP)

Reverie exposes tools through Mycelium for Claude Code:

```typescript
// MCP tool definitions
tools: [
  {
    name: "reverie_dream",
    description: "Parse natural language into composition intent",
    input: { description: string }
  },
  {
    name: "reverie_discover",
    description: "Find components matching intent",
    input: { intent: Intent }
  },
  {
    name: "reverie_compose",
    description: "Compose components into a vision",
    input: { components: Component[], intent: Intent }
  },
  {
    name: "reverie_form",
    description: "Generate output for target system",
    input: { vision: Vision, target: string }
  }
]
```

---

## Tier Access

| Tier | Capabilities |
|------|-------------|
| **Seedling** | Use pre-made vision templates |
| **Sapling** | Full agent composition, save personal visions |
| **Oak** | Share visions publicly, access advanced components |
| **Evergreen** | Everything, priority agent access, custom tags |

### Complexity Budgets

Like Terrarium's 200-point budget, Reverie visions have limits:

| Tier | Max Complexity |
|------|---------------|
| Seedling | 100 |
| Sapling | 200 |
| Oak | 300 |
| Evergreen | 500 |

---

## Validation & Safety

### Composition Validation

Every vision is validated before forming:

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];

  // Performance
  estimatedComplexity: number;
  estimatedLoadTime: number;

  // Accessibility
  respectsReducedMotion: boolean;
  hasAltText: boolean;
  contrastOk: boolean;
}
```

### Content Safety

Reverie inherits Grove's content policies:
- No components that could be combined harmfully
- Respect tier restrictions
- Rate limiting on generation

---

## User Experience Flows

### Flow 1: Chat-Based Composition

```
┌────────────────────────────────────────────────────────────────┐
│  Wanderer chats with agent                                     │
│                                                                │
│  👤 "I want fireflies around my guestbook"                     │
│                                                                │
│  🤖 "I found some options. Here's a peaceful evening          │
│      scene with 5-8 fireflies scattered around your           │
│      guestbook. Want me to add it to your sidebar?"           │
│                                                                │
│  [Preview Image]                                               │
│                                                                │
│  [ Looks good! ]  [ Show me options ]  [ Tweak it ]           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Flow 2: Template Gallery

```
┌────────────────────────────────────────────────────────────────┐
│  ✧ Vision Gallery                                       [×]    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  PEACEFUL                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  🌙 Evening  │  │  🌿 Garden   │  │  💧 Stream   │         │
│  │    Glow      │  │    Rest      │  │    Side      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                │
│  PLAYFUL                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  🦋 Flutter  │  │  ✨ Sparkle  │  │  🐝 Buzz     │         │
│  │    By        │  │    Dance     │  │    Around    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                │
│  [ Use Template ]        [ Customize ]        [ Create New ]   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Flow 3: Vision Editor (Level 3.5)

```
┌────────────────────────────────────────────────────────────────┐
│  ✧ Vision Editor                                        [×]    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─ Preview ─────────────────────┐  ┌─ Vision DSL ──────────┐ │
│  │                               │  │                        │ │
│  │      ✨  ✨                   │  │ name: My Evening       │ │
│  │    ✨      ✨                 │  │ mood:                  │ │
│  │  ┌──────────────┐            │  │   - peaceful           │ │
│  │  │  Guestbook   │  ✨        │  │   - glowing            │ │
│  │  └──────────────┘            │  │ elements:              │ │
│  │      ✨    ✨                 │  │   - component: firefly │ │
│  │                               │  │     count: 6           │ │
│  └───────────────────────────────┘  │     ...                │ │
│                                      └────────────────────────┘ │
│                                                                │
│  Complexity: ████████░░ 156/200                               │
│                                                                │
│  [ Save Vision ]              [ Export to Terrarium ]          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Data Storage

### Vision Storage

```sql
CREATE TABLE reverie_visions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  mood TEXT,           -- JSON array
  dsl TEXT NOT NULL,   -- Full Vision DSL as YAML
  complexity INTEGER,
  is_template BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_visions_tenant ON reverie_visions(tenant_id);
CREATE INDEX idx_visions_public ON reverie_visions(is_public, created_at);
```

### Template Catalog

```sql
CREATE TABLE reverie_templates (
  id TEXT PRIMARY KEY,
  vision_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT,           -- JSON array
  use_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE,
  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (vision_id) REFERENCES reverie_visions(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES tenants(id) ON DELETE CASCADE
);
```

---

## Implementation Phases

### Phase 0: Research & Design (Current)
- [x] Define concept and metaphor
- [x] Write initial spec
- [ ] Design manifest schema
- [ ] Design Vision DSL schema
- [ ] Prototype agent prompts

### Phase 1: Manifest
- [ ] Auto-generate manifest from component TypeScript
- [ ] Add semantic tags to 20 key components
- [ ] Build manifest validation tooling
- [ ] Create manifest viewer/browser

### Phase 2: Vision DSL
- [ ] Define DSL schema (JSON Schema)
- [ ] Build DSL parser
- [ ] Build DSL validator
- [ ] Create manual test visions

### Phase 3: Agent Interface
- [ ] Implement dream → intent parsing
- [ ] Implement manifest querying
- [ ] Implement composition logic
- [ ] Integrate with Mycelium (MCP)
- [ ] Test with Claude Code

### Phase 4: Integration
- [ ] Export to Terrarium scenes
- [ ] Export to Foliage decorations
- [ ] Build preview renderer
- [ ] Create template gallery UI

### Phase 5: Polish
- [ ] Template sharing system
- [ ] Vision editor UI
- [ ] Performance optimization
- [ ] Documentation & help articles

---

## Success Criteria

1. **Natural Language Works**: A Wanderer can say "make my site feel cozy with glowing things" and get a composed scene
2. **Fuzzy Matching**: The agent discovers components matching imprecise criteria
3. **Valid Output**: Generated visions are valid, accessible, and performant
4. **Human Readable**: Curious Wanderers can read and edit the Vision DSL
5. **Shareable**: Visions can be saved as templates for others

---

## References

- [Ink & Switch: Malleable Software](https://www.inkandswitch.com/essay/malleable-software/)
- [Terrarium Spec](terrarium-spec.md)
- [Curios Spec](curios-spec.md)
- [Mycelium Spec](mycelium-spec.md)
- [Grove Naming](../philosophy/grove-naming.md)
- [Naming Journey](../scratch/malleable-bridge-naming-journey.md)
- [Planning Overview](../plans/planning/reverie/overview.md)

---

*This is an exploration, not a commitment. We're asking: could Grove become malleable? What would that take? Reverie is the hypothesis.*

*Half-dream, half-real. Yours.*
