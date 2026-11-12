---
published: false
lastUpdated: '2026-11-12'
---

# Agent Core Naming Journey

> *Finding the name for the small thing that goes out into the grove, does the work, and comes back.*

Context: [#1605](https://github.com/AutumnsGrove/Lattice/issues/1605) — a portable TypeScript agent core, Workers-first, Node second. Lives in its own repo. Modeled on the shape of Nova (Go) and the ideas in Pi. Consumes Lumen for inference. Wire-compatible (a subset) with Nova's JSONL protocol.

---

## The Concept

A loop: **model → tool calls → tool results → repeat**, bounded by steps, tokens, time, and cost. It:

- Reaches out through **tools** (search, fetch, read from D1, call a Grove service)
- Is held in by **permissions and budgets** (what it may touch, how far it may go)
- **Parks** when it needs a human, costing nothing while it waits, and resumes when answered
- **Survives eviction**: state is committed before every effect, so a restart picks up where it fell
- Runs **anywhere** the host gives it soil: Durable Object today, Node tomorrow
- Stays **small**: a minimal core that grows by extension

It is *not* a gateway (that's Lumen), not a coding TUI (that's Nova), and not a tool provider (that's Mycelium). It's the thing that *uses* them.

---

## The Grove, With A Gap In It

```
                              ☀️  (Lumen — light, routed)

            🌲 Wisp     🌳 Thorn      🌲 Timeline     🌲 Forage
           (writing)  (moderation)   (summaries)    (domain hunt)
               │           │             │              │
               │           │             │              │
    ═══════════╪═══════════╪═════════════╪══════════════╪════════
               │           │             │              │
               └───────────┴──────┬──────┴──────────────┘
                                  │
                         ┌────────┴────────┐
                         │   ???  HERE     │  ← reaches out, does the work,
                         │  (the agent)    │    comes back, remembers
                         └───┬─────────┬───┘
                             │         │
              Lattice ───────┘         └─────── Warden / Shutter
         (the thing it climbs)           (keys held, pages distilled)

    ═══════════════════════════════════════════════════════════
         ~~~~~~~~~~ Mycelium (tools offered to others) ~~~~~~~~~~
                 ~~~~ Loom (sessions that hold state) ~~~~
```

Who's already here, and what they do:

| Neighbor | Role | Relationship to the new thing |
|---|---|---|
| **Lumen** | Light through the hollow; routes models | The agent *asks* Lumen. Never talks to a model directly. |
| **Mycelium** | Network beneath; MCP server | One possible tool provider. Offers tools *out*; the agent takes tools *in*. |
| **Warden** | Holds the keys | A tool backend. Credentials never touch the agent. |
| **Shutter** | Opens, captures, closes | A tool: fetch-and-distill. |
| **Loom** (internal) | Durable Object sessions | Where session state lives. |
| **Moss** | Memory that accumulates | Future: context across runs. |
| **Lattice** | The framework things climb | The structure the agent grows *on*. |
| **Songbird / Canary / Kestrel** | Birds in the moderation cascade | Birds are spoken for in the decision-model lane. |

---

## What IS This Thing?

**It is not a place.** Nobody visits it. **It is not an object** you keep. It's a *motion*: reach, feel, adjust, reach again. And it's a motion that is **bounded** (budgets, permissions), **resumable** (parks, wakes), and **small**.

**What it does in the Wanderer's life:** quiet work on their behalf, mostly while they're away. A timeline pass overnight. A domain hunt. The Wanderer rarely meets it; they meet what it brought back.

**What emotion it should evoke:** trust, tidiness, a little warmth. *Helpful, bounded, doesn't overreach, asks before it does anything risky.* Not a robot. Not "AI". Something that belongs in a midnight tea shop.

---

## Walking Through...

I enter the grove. I pass the Meadow, where others gather. I find my tree, my garden, my blooms.

Last night I asked for a summary of the week's work. I didn't watch it happen. This morning it's there, in the timeline.

Something went out while I slept. It followed the trellis up and out, touched a few things (my commits, last week's summary, a note I'd left), took what it needed, and came back. It never touched what it wasn't allowed to. Once, it stopped and left a small card on the porch: *"I'd like to publish this. Okay?"* It waited without burning anything. I said yes over breakfast and it finished.

What was it? Not the light (Lumen). Not the network (Mycelium). It was *the reaching.*

---

## Candidates

### 1. Tendril

- **Meaning:** the thin, coiling part of a vine that reaches out, finds something, and holds on. Feels, adjusts, reaches again.
- **Why it fits:** it is literally the loop: reach → touch → coil → reach. It climbs **Lattice** (the thing that holds everything up), the way the agent core grows on Lattice's structure. The trellis *bounds* the tendril: permissions and budgets are the trellis. Small by nature, which is the "lite" part. And it reaches *toward the light*: Lumen.
- **Vibe:** delicate, patient, alive.
- **Issues:** it was considered and set aside three times already: Mycelium ("grasping, clingy"), email gateway ("more about reaching"), Meadow posts ("part of Vines, and Vines is already a thing"). The first two were about jobs where *connection* mattered; here *reaching* is the whole job. The Vines overlap is real but different layers (Vines are gutter widgets; a Tendril is the reaching part of the plant they grow on). "Clingy" is the one to sit with: an agent that grasps is a mildly uncomfortable image.
- **Tagline test:** *"Tendril is how the vine reaches."* ✓

### 2. Aster

- **Meaning:** a wildflower whose name is Greek for **star**. A star-flower. It blooms in **autumn**.
- **Why it fits:** Nova is the star that suddenly brightens. Aster is the star that took root in the grove. Kin of Nova, but a grove creature. The flower is radial: a small center with petals reaching out in every direction, which is honestly what a core plus adapters (Workers, Node, transports) looks like. And it blooms in autumn.
- **Vibe:** small, bright, wild, warm.
- **Issues:** **Aster / Aspen** is the big one. Both are A-s-?-?-e-r/n, and Aspen is the domain layer in the same stack. Said aloud in a sentence about the architecture, they blur. Also says nothing about what it does.
- **Tagline test:** *"Aster is the star that took root."* ✓ (but it names the kinship, not the work)

### 3. Hob

- **Meaning:** the household spirit that tends the hearth and does the chores at night while everyone sleeps, asking nothing but a saucer of milk. Also, the cooking surface on a stove.
- **Why it fits:** background pipelines are *exactly* this: work done quietly while the household is away or asleep. Scoped to one house (one tenant). Domestic, warm, bounded by custom ("a hob does not go beyond the threshold"). The only candidate with *personality*, and the personality is the midnight tea shop.
- **Vibe:** cozy, mischievous, trustworthy.
- **Issues:** it's folklore, not forest. Nothing in the grove naming doc is a house spirit (though Pantry, Porch, Nook are domestic). Three letters, easy to lose in prose. Nothing in the name suggests portability or a loop.
- **Tagline test:** *"Hob is who does the work while you sleep."* ✓

### 4. Spore

- **Meaning:** the tiny, light thing a fungus releases. Carried by wind to anywhere, and where conditions are right, it takes hold and grows into the whole organism.
- **Why it fits:** *this* is the portability story. A small core that lands in Workers *or* Node and germinates in whatever soil the adapter provides, then grows by extension. Neighbor to Mycelium without being Mycelium.
- **Vibe:** tiny, windblown, patient.
- **Issues:** the Mycelium journey rejected it as "about reproduction/spreading, not connection." That's fair for an MCP server and mostly irrelevant here. But "spore" also reads *spread / infection*, and it doesn't say anything about *work*. It names the packaging, not the purpose.
- **Tagline test:** *"A spore is small enough to land anywhere."* ✓

### Considered and set down

| Name | What it is | Why not |
|---|---|---|
| **Familiar** | A witch's animal companion that works on your behalf | Warm, queer-resonant, and *personal*. But the core isn't one agent; it's the thing agents are built on. Better as the *name for agents built with the core* than for the core. (Worth keeping.) |
| **Ranger** | Walks the grove within bounds, reports back | Nails permissions and territory. But it's a job title, loud, and heavily used in software. |
| **Hypha** | A single exploring thread of mycelium | Lovely, but Mycelium is already the network and "hypha" is a spelling hazard (HY-fuh). |
| **Ember** | A banked coal that survives the night and relights the fire in the morning | The best image for *durability* (park, evict, wake, resume). But **Ember.js** owns this name in the JS world, and it's in 21 files here already. |
| **Shuttle** | The part of a loom that passes back and forth carrying the thread | Literally the loop, and a natural sibling of Loom. But mechanical rather than living, and "shuttle" is a bus. |
| **Dryad** | The spirit of one tree | A good picture of per-tenant isolation (one spirit, one tree). Used everywhere, and the myth is heavier than the job. |
| **Wend** | To go along a winding path | Says the motion, none of the bounds. Too close to **Wander**. |
| **Sparrow / Wren / Jay** | Small birds | Birds are the decision-cascade lane (Songbird, Canary, Kestrel), and Wren is already an SEO skill. |
| **Forager** | One who searches and carries back | Forage is already the domain hunt. |

---

## Conflict Check (Step 9)

| Name | In this repo | Your GitHub repos | `@autumnsgrove/<name>` on npm | Unscoped npm |
|---|---|---|---|---|
| tendril | 10 files (all vine decoration / past naming journeys, nothing claims it) | none | free | taken (an old DI library) |
| aster | 0 | none | free | taken (an unrelated API client) |
| hob | 0 | none | free | taken (empty v0.0.1) |
| spore | 3 files (past journeys) | none | free | taken (an old REST client) |
| familiar | 27 (the ordinary word) | none | free | taken (a git helper) |

All of these are fine as a **scoped** package under `@autumnsgrove/`, which matches how everything else ships. None collide with a claimed Grove name. Nothing is in the naming doc's ecosystem table. (Aster's near-collision is with **Aspen**, a sound problem rather than a registry one.)

---

## Where This Leaves Us

- **If the name should say what it *does*:** Tendril.
- **If it should say who it's *kin to*:** Aster (with the Aspen caveat).
- **If it should say *how it feels*:** Hob.
- **If it should say how it *travels*:** Spore.

**Leaning:** Tendril, with Aster as the runner-up. Not decided. Waiting on Autumn.

**Parked idea:** *Familiar* as the word for an agent *built with* the core ("a Familiar that summarizes your week"). Worth deciding after the core's name.

---

## Open

- [ ] Pick a name
- [ ] Write the Grove-style entry (tagline, 2–3 sentences of metaphor, 2–3 of function)
- [ ] Decide whether it earns a row in `grove-naming.md`, or stays a standalone tool with its own repo
- [ ] Internal name (`Grove[Thing]` convention) if it's adopted into the ecosystem
- [ ] Step 10 (router, username reservation, GroveTerm manifest) is likely moot: it's a library, not a `*.grove.place` service
