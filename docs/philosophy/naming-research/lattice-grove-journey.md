---
lastUpdated: '2026-01-25'
---

# A Journey Through the Grove: The Core Framework

*Scratchpad for exploring the name of what powers everything*

---

## What Am I Looking At?

Before I walk, I need to understand what I'm naming.

```
    Every Grove Site
         |
         | imports
         |
    ┌────┴────────────────────────────────────────┐
    │                                             │
    │    @autumnsgrove/groveengine                │
    │                                             │
    │    - UI components (buttons, cards, icons)  │
    │    - Auth utilities (magic codes, sessions) │
    │    - Markdown rendering                     │
    │    - Database patterns                      │
    │    - Payment handling                       │
    │    - Terrarium (creative canvas)            │
    │    - Vineyard (documentation)               │
    │    - Server utilities                       │
    │    - Design tokens                          │
    │                                             │
    └─────────────────────────────────────────────┘
         |
         | deploys to
         |
    ═════════════════════════
       CLOUDFLARE (edge)
```

This is the npm package that powers EVERY Grove site. One package, many blogs.
Multi-tenant: meadow, landing, plant, clearing, individual blogs—all built on this.

Currently called: **Lattice** (internal: GroveEngine)

---

## The Scene

```
                                    ☀️
                                  ~/|~\
                             ~~ /  |  \ ~~
                           ~~/    ⭐     \~~
                         ~~/  ★    |   ★   \~~
                        ~/    THE CANOPY     \~
                       ~~~~~~~~~~~~|~~~~~~~~~~~
                                   |
                    🌲      🌳     |     🌳      🌲
                     \\      |     |      |      //
                      \\     |     |      |     //
                       \\    |     |      |    //
                        🌲   🌳    |     🌳   🌲
                         |    |    |     |    |
    ═══════════════════════════════════════════════════════
                THE GROUND / THE FOUNDATION
    ───────────────────────────────────────────────────────
                         |    |    |
                    ROOTS INTERWEAVE BELOW
                      (shared nutrients)
```

Every tree in this grove (every blog, every site) draws from the same soil.
They share the same root network.
They're nourished by the same water table.

But what IS the thing they're all built on?

---

## Walking Through...

I enter the grove.

The **Lattice** is described as "the framework that supports growth."
Vines climb it. Gardens are built around it.
"You don't admire a lattice. You build on it, and watch what grows."

That's beautiful. But is it right?

I walk the forest floor, past the **Meadow** where others gather.
I see **Ivy** climbing, connecting points.
I pass **Amber** holding treasures in suspension.
I feel **Shade** protecting me from harvesters.

I want to plant my blog here. What do I need?

The keeper hands me something. Not seeds—those come from me.
Not soil—that's the environment.
Not water—that flows through.

They hand me... a toolkit? A foundation? A framework?

---

## What IS This Thing?

Let me think about what category it belongs to:

### Is it a PLACE?
No. Meadow is a place. Nook is a place. Porch is a place.
This isn't somewhere you go—it's something you use.

### Is it an OBJECT?
Amber is an object (fossilized resin).
Patina is a layer that forms.
This is more like... a system? A collection?

### Is it a TREE FEATURE?
Heartwood is the core identity.
Foliage is the visible appearance.
Rings are the private growth record.
This isn't part of the user's tree—it's what enables the tree to exist.

### Is it a CONNECTION?
Ivy connects. Mycelium connects. Reeds whisper together.
This doesn't connect things—it underlies them.

### Is it a STRUCTURE?
Lattice is a structure. That's the current name.
A framework for climbing, for building upon.
But is "structure" the right category?

---

## Questioning Lattice

The current metaphor:
"A lattice is the framework that supports growth. Vines climb it."

```
         🌿 vine
          \
    ╔══════╦══════╗
    ║      ║      ║  ← lattice
    ╠══════╬══════╣
    ║      ║      ║
    ╚══════╩══════╝
         /
        🌿 vine
```

This works because:
- Lattice is a support structure
- Things grow on it, not in it
- It's essential but not the focus
- "Vines" are already a feature (sidebar widgets)

But I'm questioning:
- A lattice is a GARDEN structure, not a FOREST feature
- A lattice is VISIBLE—you see it in the garden
- A lattice is ARTIFICIAL—made, not grown
- A lattice is PASSIVE—it doesn't generate, just holds

Is there something more organic? More forest?

---

## Exploring the Forest for Alternatives

### What about SOIL?

Everything grows FROM soil. It's:
- Foundational
- Nourishing
- Invisible in the plant itself
- Shared by many organisms

"Soil is the npm package powering every Grove site.
Rich with components, auth utilities, and patterns—
the ground from which your blog emerges."

```
    🌱 blog
     |
═════|═════════════════════
  ≈≈≈≈≈≈ SOIL ≈≈≈≈≈≈≈≈≈
  ≈≈ nutrients ≈≈ water ≈≈
════════════════════════════
```

But soil feels too... elemental? The package is structured, organized.
Soil is chaotic and primal. This is crafted.

### What about LOAM?

Loam is the IDEAL soil—balanced, nutrient-rich, perfect for growth.
More specific than "soil," suggests quality and intentionality.

"Loam is what every gardener dreams of."

But still has the "too elemental" problem.

### What about CAMBIUM?

In trees, cambium is the living layer beneath bark that generates new growth.
It's where new wood and new bark are born.

```
         BARK (what you see)
    ─────────────────────────
         CAMBIUM (living layer - generates growth)
    ═════════════════════════
         SAPWOOD (transports)
    ─────────────────────────
         HEARTWOOD (core)
```

"Cambium is the npm package powering every Grove site.
The living layer that generates UI components, auth utilities, patterns.
Invisible beneath the bark, essential for every ring that follows."

I love this metaphor:
- Cambium is GENERATIVE (creates new growth)
- Cambium is INVISIBLE (beneath the bark)
- Cambium is LIVING (active, not passive)
- Cambium creates RINGS (and Rings is our analytics!)

But... cambium is OBSCURE. Would people know what it means?
Grove names should explain themselves: Meadow, Foliage, Heartwood.
Cambium requires a biology lesson.

### What about SAP?

Sap is the lifeblood of trees. It flows through, carrying nutrients.

"Sap is what nourishes every branch."

Sap is:
- Essential
- Invisible (inside the tree)
- Flowing (active)
- Life-giving

But sap is a LIQUID, not a STRUCTURE.
The package provides structure—components, patterns, utilities.
Sap doesn't structure; it flows.

### What about WEAVE?

The fabric created by interlocking threads.

"The weave that holds every Grove site together."

Weave suggests:
- Interconnection
- Strength through integration
- Intentional creation
- Fabric/foundation

"Weave is the npm package powering every Grove site.
UI components, auth utilities, database patterns—
threads that interlock to create something strong."

But... LOOM is already taken (the Durable Objects pattern).
And "weave" might be too textile-y for a forest.

### What about ROOTSTOCK?

In grafting, rootstock is the base plant onto which you graft new growth.
It provides the roots, the vigor, the foundation.
The user's content is the scion grafted onto Grove's rootstock.

"Rootstock provides the foundation; your content provides the fruit."

This is actually a perfect metaphor:
- Users GRAFT their content onto Grove's infrastructure
- The rootstock is essential but invisible
- It determines vigor and hardiness
- Professional orchards all use rootstock

But... "rootstock" is:
- Two words (or hyphenated)
- Obscure (horticulture term)
- Maybe too technical

---

## Back to Lattice

Let me re-examine what Lattice gets right:

```
    YOUR BLOG GROWING
         🌸
        /|\
       / | \
      /  |  \
     🌿  |  🌿  ← vines (sidebar widgets)
      \  |  /
       \ | /
        \|/
    ╔════╬════╗
    ║    ║    ║  ← lattice (the framework)
    ╠════╬════╣
    ║    ║    ║
    ╚════╩════╝
```

Lattice IS:
- A support structure (accurate)
- Something you build on (accurate)
- Essential but not the focus (accurate)
- Where vines climb (and Vines are a feature!)

Lattice IS NOT:
- Organic (it's crafted)
- Forest-native (it's garden)
- Living (it's structural)

The question: does "garden structure" conflict with "forest ecosystem"?

Actually... no. The naming doc says names are "about what happens IN AND AROUND the forest." A cottage in the woods has a garden. That garden has a lattice.

---

## A Different Angle: What Does It FEEL Like?

When you use this package, you should feel:
- Supported (infrastructure handles the hard parts)
- Empowered (you can build without worrying)
- Connected (part of something larger)
- Home (this is where you grow)

What evokes these feelings?

**Lattice**: orderly, supportive, structural
**Soil/Loam**: grounding, nourishing, foundational
**Cambium**: generative, living, invisible
**Rootstock**: vigorous, foundational, enabling
**Weave**: interconnected, strong, crafted

Lattice evokes ORDER and SUPPORT.
That's... accurate. The package is well-organized, structured, dependable.

---

## Testing the Tagline

A good Grove name should complete this sentence naturally:

> "[Name] is the _______________."

- **Lattice** is the framework that supports growth.
- **Soil** is the ground from which everything emerges.
- **Cambium** is the living layer that generates growth.
- **Rootstock** is the foundation onto which you graft.
- **Weave** is the fabric that holds everything together.

All of these work. But which SOUNDS right?

"Build on the Lattice."
"Grow from the Soil."
"Generate from the Cambium."
"Graft onto the Rootstock."
"Strengthen the Weave."

"Build on the Lattice" is active, empowering.
"Grow from the Soil" is passive, natural.
"Graft onto the Rootstock" is technical, precise.

---

## The Vines Connection

Here's something important: **Vines** are already a feature of Lattice.

"Vines are the widgets that fill your blog's gutters.
Like vines climbing a trellis, they grow alongside your posts."

If we change Lattice to something else, what happens to Vines?

- If it's **Soil**, vines grow FROM soil? (Less natural)
- If it's **Cambium**, vines... grow from cambium? (Confusing)
- If it's **Rootstock**, vines grow on rootstock? (Wrong—rootstock is underground)

Lattice ENABLES the Vines metaphor to work.
Vines climb lattices. That's what they do.

This is a point FOR Lattice.

---

## The Verdict

I've walked through the grove. I've examined:
- Soil/Loam (too elemental, not structural)
- Cambium (beautiful but obscure)
- Sap (liquid, not structural)
- Weave/Fabric (textile, not forest)
- Rootstock (perfect metaphor, obscure word)

And I keep coming back to Lattice.

```
    ╔══════════════════════════════════════╗
    ║           L A T T I C E              ║
    ║                                      ║
    ║   The framework that supports growth ║
    ║                                      ║
    ║   - Structural (provides order)      ║
    ║   - Supportive (enables climbing)    ║
    ║   - Essential but invisible          ║
    ║   - Enables Vines naturally          ║
    ║   - Intuitive (no education needed)  ║
    ║   - Garden→forest is coherent        ║
    ╚══════════════════════════════════════╝
```

---

## What Lattice Gets Right

1. **The Vines connection works perfectly**
   Vines climb lattices. Sidebar widgets climb the framework.

2. **"You don't admire a lattice. You build on it."**
   This is exactly right for infrastructure.

3. **It's intuitive**
   Everyone knows what a lattice is. No education required.

4. **Garden structures belong in a forest ecosystem**
   A cottage in the woods has a garden. The garden has a lattice.

5. **It suggests order without rigidity**
   A lattice is structured but organic things grow on it freely.

---

## What Could Make It Better?

If I were to improve the Lattice metaphor, I might expand on:

1. **The multi-tenant aspect**
   "One lattice, many vines. Every Grove site shares the same
   framework; every blog grows unique upon it."

2. **The invisible but essential nature**
   "The lattice fades into the background as your garden flourishes.
   That's the point."

3. **The relationship to other infrastructure**
   Lattice (framework) + Mycelium (MCP/connections) + Loom (Durable Objects)
   = the complete infrastructure layer

---

## Final Answer

**Lattice is the right name.**

The walk confirmed it. I explored alternatives:
- **Cambium** was beautiful but obscure
- **Rootstock** was perfect but two words and technical
- **Soil** was foundational but too elemental
- **Weave** was strong but textile-y

Lattice wins because:
- It enables the Vines metaphor (already in use)
- It's intuitive (no education needed)
- It captures the essence (support structure for growth)
- It belongs in the Grove (garden in the forest)

The current description is already right:

> *"A lattice is the framework that supports growth. Vines climb it.
> Gardens are built around it. It's not the thing you see—it's the
> thing that holds everything else up.*
>
> *Lattice is the npm package powering every Grove site. UI components,
> authentication utilities, markdown rendering, database patterns:
> all the infrastructure that makes building on Grove feel effortless.
> You don't admire a lattice. You build on it, and watch what grows."*

---

## The Closing Visualization

```
                          YOUR BLOG
                             🌸
                            /|\
                    VINES  / | \  VINES
                     🌿   /  |  \   🌿
                      \  /   |   \  /
                       \/    |    \/
                   ╔════════════════════╗
                   ║     L A T T I C E  ║
                   ║                    ║
                   ║  components        ║
                   ║  auth              ║
                   ║  utilities         ║
                   ║  patterns          ║
                   ╚════════════════════╝
                            |
                   ═════════|═════════
                    CLOUDFLARE EDGE
                   ═══════════════════
```

*The framework that supports growth.*
*Build on it. Watch what grows.*

---

## Postscript: What I Almost Chose

If I had to pick a runner-up, it would be **Cambium**.

"The living layer that generates new growth."

Cambium is more accurate in some ways:
- It's GENERATIVE (the package provides components that create UI)
- It's LIVING (actively maintained, evolving)
- It's INVISIBLE (beneath the bark, beneath what users see)
- It connects to RINGS (cambium creates the rings we measure!)

But cambium requires education. Lattice doesn't.

In a different world where Grove users were all arborists, Cambium would win.

In this world, Lattice wins through clarity.

---

*Journey completed: January 6, 2026*
*Verdict: Lattice confirmed as the right name*
*Runner-up: Cambium (for the poetry of it)*
