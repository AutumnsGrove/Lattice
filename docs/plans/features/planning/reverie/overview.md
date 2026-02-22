---
title: "Reverie: Malleable Software for the Grove"
status: planning
category: features
---

# Reverie: Malleable Software for the Grove

> *Half-dream, half-real. Yours.*

---

## Inspiration

This exploration is inspired by [Ink & Switch's essay on Malleable Software](https://www.inkandswitch.com/essay/malleable-software/), a vision for computing where "anyone can adapt their tools to their needs with minimal friction."

The essay identifies a fundamental problem: modern software treats users as passive consumers of locked-down applications. When computerized systems replaced physical tools, we gained power but lost agency. The development team becomes a bottleneck; the long tail of niche requirements goes unserved.

**Their key insight:** This isn't just about AI generating code. AI-assisted coding "resembles bringing a talented sous chef to a food court—useful only if the underlying system supports open creation."

The underlying system must be designed for malleability.

---

## Why Grove Is Positioned for This

Ink & Switch says further research is needed. But they're thinking about *general* software. That's hard.

Grove is different. We have:

### 1. A Bounded Domain
We're not making all software malleable. We're making *one kind of space* (personal sites) customizable through *one vocabulary* (the Grove nature aesthetic) with *guardrails* (tier limits, performance budgets, curated components).

### 2. An Existing Component Library
60+ Svelte components already exist:
- Trees: TreePine, TreeBirch, TreeCherry, TreeAspen
- Creatures: Butterfly, Firefly, Bee, Bird, Deer, Owl, Rabbit
- Botanical: Vine, Leaf, Acorn, Fern, FallingLeavesLayer
- Ground: Mushroom, Rock, Bush, GrassTuft, Flowers
- Sky: Cloud, Moon, Star, Sun, Rainbow
- Structural: Lattice, Birdhouse, Bridge, Lantern
- Water: Pond, Stream, LilyPad
- Weather: Snowflake, SnowfallLayer

Each with typed props, consistent patterns, and a shared design language.

### 3. A Composition System (Terrarium)
Terrarium already lets users drag-drop components onto a canvas, configure props, and export decorations. The building blocks exist.

### 4. Curios with Real Functionality
Beyond decorations, we have interactive elements: guestbooks, shrines, hit counters, link gardens. These have configuration options, display styles, and tier-gated features.

### 5. Design Tokens (Foliage + Palette)
A semantic color system (`flowers.wildflower.purple`, `bark.darkBark`) that components reference. Theming already works.

### What's Missing: The Bridge

The gap is between:
- **Level 2**: Drag-drop in Terrarium (what exists)
- **Level 4**: Write custom Svelte code (requires developer skills)

There's a cliff. No gentle slope.

**Reverie is the bridge.**

---

## What Is Reverie?

A reverie is that state between waking and dreaming, when you're gazing at sunlight through branches, lost in thought, and something forms in your mind's eye. Not a plan. A vision.

Reverie is the composition layer that makes Grove malleable. It has three parts:

### 1. The Manifest
A machine-readable catalog of all components with semantic metadata:
- Name, category, description
- Props schema (what can be configured)
- Semantic tags (`flying`, `glowing`, `seasonal:winter`, `interactive`)
- Composition hints (what it pairs well with, what to avoid)
- Constraints (tier requirements, performance cost)

### 2. The Vision DSL
A composition language simpler than Svelte but richer than drag-and-drop:
```yaml
name: Firefly Garden
mood: "glowing, peaceful, evening"
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
```

Humans can read and edit this. Agents can generate it. It reads like a dream taking shape.

### 3. The Agent Interface
How AI agents interact with Reverie:
- **Dream**: "I want fireflies around my guestbook"
- **Discover**: Find components matching fuzzy criteria
- **Compose**: Arrange elements into a vision
- **Form**: Generate the final output for Terrarium or Foliage

---

## The Reverie Metaphor

You don't *design* your grove. You *see* it.

"Fireflies around my guestbook" isn't a specification. It's a reverie. The system takes your half-formed dream and gives it shape:

1. Your **dream** enters ("something that glows, peaceful, evening vibes")
2. The **manifest** reveals what could be (fireflies, lanterns, moonlight, stars)
3. The **vision** takes shape (elements arrange themselves)
4. The **form** emerges (a composition, ready for Terrarium)

Like the moment between waking and sleeping, it happens in the background. All you see is what emerges: a scene that captures what you meant.

---

## Integration with Existing Systems

```
┌─────────────────────────────────────────────────────────────┐
│                         DREAM                               │
│              "Add fireflies around my guestbook"            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        REVERIE                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Manifest   │  │   Vision    │  │  Agent Interface    │  │
│  │  (catalog)  │→ │   (DSL)     │→ │  (dream→form)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                          FORM                               │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐   │
│  │   Terrarium   │  │    Foliage    │  │     Curios     │   │
│  │   (scenes)    │  │   (themes)    │  │  (templates)   │   │
│  └───────────────┘  └───────────────┘  └────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Reverie doesn't replace anything.** It's a layer that makes existing systems more accessible:
- Terrarium consumes Reverie visions as importable scenes
- Foliage consumes Reverie visions as decoration presets
- Curios could consume Reverie visions as configurable templates

---

## How It Maps to Ink & Switch's Patterns

### Pattern 1: A Gentle Slope from User to Creator

| Level | What It Is | Skill Required |
|-------|------------|----------------|
| 1 | Pick a theme (Foliage) | None |
| 2 | Drag-drop in Terrarium | Minimal |
| **3** | **Describe a dream → Agent composes via Reverie** | **Natural language** |
| **3.5** | **Edit the Vision DSL directly** | **Reading YAML** |
| 4 | Write custom Svelte | Developer skills |

Reverie creates **Level 3 and 3.5**, the missing middle ground.

### Pattern 2: Tools, Not Apps

Grove components are already tools, not monolithic apps:
- They share data through stores (seasonStore, themeStore)
- They use CSS variables for theming
- They have typed interfaces

Reverie makes them *discoverable* and *composable* without code.

### Pattern 3: Communal Creation

**Phase 1 (Personal):** Wanderers create visions for their own sites.
**Phase 2 (Templates):** Wanderers publish visions as templates others can use.

Not full collaboration. But sharing what you've dreamed? That's the Grove way.

---

## Tier Considerations

Composition power should scale with tier:

| Tier | What They Can Do |
|------|------------------|
| **Seedling** | Use pre-made templates, basic customization |
| **Sapling** | Full agent composition, save personal visions |
| **Oak** | Share templates publicly, advanced composition features |
| **Evergreen** | Everything, priority agent access |

Complexity budgets (like Terrarium's 200 points) should apply to Reverie visions too.

---

## Open Questions

### Technical
1. **Manifest generation**: Auto-generate from TypeScript types? Hand-curated? Probably hybrid.

2. **DSL format**: YAML? JSON? YAML is human-readable and dreamlike.

3. **Preview rendering**: How do we show a preview before committing? Probably a headless Terrarium render.

4. **Validation**: How do we ensure visions are valid, accessible, performant?

5. **Storage**: Where do visions live? Personal storage + shareable catalog.

### Product
1. **Entry point**: Where does the user access this? Chat with Wisp? Mycelium integration? Both?

2. **Failure modes**: What happens when the agent can't find matching components? Graceful suggestions?

3. **Template curation**: If visions can be shared, who curates? Quality control?

### Philosophical
1. **How much magic?** Should the user see the Vision DSL at all, or is it purely internal?

2. **Ownership**: When you create a vision, is it "yours"? What does sharing mean?

3. **Evolution**: As we add components, how do visions stay compatible?

---

## Implementation Phases (Rough)

### Phase 0: Research & Design (Now)
- Define manifest schema
- Define Vision DSL schema
- Prototype agent interface
- Identify integration points

### Phase 1: Manifest
- Auto-generate manifest from existing components
- Add semantic tags to key components
- Create manifest validation tooling

### Phase 2: Vision DSL
- Define composition format
- Build parser/validator
- Create manual visions for testing

### Phase 3: Agent Interface
- Integrate with Mycelium (MCP)
- Build query/composition endpoints
- Test with Claude Code

### Phase 4: Integration
- Export to Terrarium scenes
- Export to Foliage decorations
- Preview rendering

### Phase 5: Polish
- Template sharing (if demand exists)
- Performance optimization
- Documentation

---

## Success Criteria

**We'll know Reverie works when:**

1. A user can say "make my site feel cozy with glowing things" and get a composed scene without touching code
2. The agent can discover components matching fuzzy criteria
3. The output is valid, accessible, and performs well
4. A technically-curious user can read and tweak the Vision DSL
5. Visions can be shared and reused

---

## References

- [Ink & Switch: Malleable Software](https://www.inkandswitch.com/essay/malleable-software/)
- Grove Terrarium spec (`docs/specs/terrarium-spec.md`)
- Grove Curios spec (`docs/specs/curios-spec.md`)
- Grove Naming (`docs/philosophy/grove-naming.md`)
- Naming journey (`docs/scratch/malleable-bridge-naming-journey.md`)

---

*This is an exploration, not a commitment. We're asking: could Grove become malleable? What would that take? Reverie is the hypothesis.*

*Half-dream, half-real. Yours.*
