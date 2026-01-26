---
published: false
lastUpdated: '2026-01-25'
---

# AI Gateway Naming Journey

> *Finding the name for Grove's unified AI routing layer*

---

## The Concept

A unified AI Gateway that:
- Routes requests to appropriate models (LlamaGuard for moderation, DeepSeek for generation)
- Pre-processes: PII scrubbing, rate limits, quota checks
- Post-processes: metadata addition, response normalization, usage logging
- Uses Cloudflare AI Gateway underneath
- Makes AI integration a simple function call

---

## Visualization: Where Does This Live?

```
                              ☀️  (user-facing services)

                    🌲 Wisp    🌳 Thorn    🌲 Timeline
                     (writing)  (moderation)  (summaries)
                        │          │            │
                        │          │            │
    ════════════════════╪══════════╪════════════╪══════════════════
                        │          │            │
                        └──────────┼────────────┘
                                   │
                            ┌──────┴──────┐
                            │  ??? HERE   │  ← The AI Gateway
                            │  (routing)  │
                            └──────┬──────┘
                                   │
                 ┌─────────────────┼─────────────────┐
                 │                 │                 │
            ┌────┴────┐      ┌────┴────┐      ┌────┴────┐
            │ Workers │      │OpenRouter│     │Fireworks│
            │   AI    │      │         │      │         │
            └─────────┘      └─────────┘      └─────────┘
                                   │
    ════════════════════════════════════════════════════════════

            ~~~~~~~~~~~~ Mycelium (MCP network) ~~~~~~~~~~~~
                    (connecting everything below)
```

**Key observations:**
- This layer is **underground** - users never see it
- It sits **between** Grove services and external AI providers
- It's **circulatory** - everything flows through it
- It's **intelligent** - makes routing decisions
- It **transforms** - what goes in is not what comes out

---

## What IS This Thing?

### From the Philosophical Analysis:

> "This is the tree's life force, made programmable."

**Core nature:**
- **Subterranean** — Underground, unseen, foundational
- **Circulatory** — Flowing, moving, alive
- **Protective** — Filtering, guarding, selecting
- **Intelligent** — Routing, deciding, adapting
- **Transformative** — What goes in is not what comes out

**The essential insight:**
> "In a tree, sap carries everything. Sugar from leaves flows down. Water from roots flows up. It all moves through the same channels, invisibly, intelligently. The tree doesn't think about it. But cut off the sap, and the tree dies."

---

## Naming Candidates

### Tier 1: Most Grove-Feeling

| Name | Nature Meaning | Why It Fits | Feeling | Issues |
|------|---------------|-------------|---------|--------|
| **Sap** | Tree's life blood, processed nutrients | The essential fluid carrying intelligence throughout Grove | Vital, flowing, life-giving | Verb "sap" = drain; slang = fool |
| **Aquifer** | Underground water reservoir | Hidden infrastructure feeding multiple services | Deep, reliable, ancient | Slightly geological, not tree-based |
| **Seep** | Water slowly emerging through soil | AI capabilities gently flowing into services | Gentle, persistent, sustaining | "Seepage" has leak connotations |
| **Murmur** | Starling murmurations; water over stones | Constant quiet communication, many small voices | Alive, collective, gentle | Might feel too passive |

### Tier 2: Strong Contenders

| Name | Nature Meaning | Why It Fits | Feeling | Issues |
|------|---------------|-------------|---------|--------|
| **Rill** | Tiny stream channel | Efficient, small, constantly flowing | Delicate, persistent | Unfamiliar word, might feel small |
| **Flume** | Natural water channel | Directed flow, purposeful routing | Purposeful, efficient | Industrial/logging associations |
| **Phloem** | Plant's nutrient transport tissue | Internal circulation, invisible channels | Living, essential, botanical | Too technical, hard to spell |
| **Vein** | Mineral veins, leaf veins | Essential channels through larger structures | Networked, life-sustaining | Anatomical associations |
| **Estuary** | Where freshwater meets saltwater | Translation layer between two worlds | Liminal, rich, meeting place | Too visible/geographical |

### Tier 3: Interesting but Uncertain

| Name | Nature Meaning | Why It Fits | Feeling | Issues |
|------|---------------|-------------|---------|--------|
| **Prism** | Crystal splitting/combining light | Translation, transformation | Magical, transformative | Too tech/display feeling |
| **Watershed** | Point determining water flow | Routing decisions | Decisive, organizing | Cliché ("watershed moment") |
| **Conduit** | Natural channels for flow | Pure routing metaphor | Essential, structural | Too industrial |
| **Lens** | Natural focusing (dewdrops) | Focus, transformation | Clarity, precision | Camera associations |

---

## Testing the Tagline

A good Grove name completes these sentences naturally:

### Sap
> "Sap is the life that flows through everything."
> "Sap carries intelligence where it's needed."
> *"The vital flow."*

### Aquifer
> "Aquifer is the hidden source that feeds every spring."
> "Aquifer is where intelligence pools before it emerges."
> *"The deep well."*

### Seep
> "Seep is the gentle emergence of intelligence into your work."
> "Seep is where AI capabilities surface, quietly, constantly."
> *"Quiet sustenance."*

### Murmur
> "Murmur is the collective voice of many small intelligences."
> "Murmur is the constant conversation between Grove and AI."
> *"The forest speaks."*

### Rill
> "Rill is the smallest channel carrying the biggest ideas."
> "Rill routes intelligence along the path of least resistance."
> *"Water finds its way."*

---

## The Walk Through the Forest

*I enter the grove. I want to write something.*

*I open my editor. Wisp is there, a gentle light, helping me polish my words. But where does Wisp get its wisdom?*

*I don't see where. I don't think about where. The intelligence just... flows.*

*Somewhere beneath the forest floor, beneath even Mycelium's web, there's something deeper. A reservoir. A circulation. The thing that takes raw potential and transforms it into useful insight.*

*What do I call the life that flows through trees?*

*Sap.*

*What do I call the underground water that feeds every spring in the forest?*

*Aquifer.*

*What do I call the gentle emergence of water through soil, constant and life-giving?*

*Seep.*

---

## Decision Matrix

| Criteria | Sap | Aquifer | Seep | Rill | Murmur |
|----------|-----|---------|------|------|--------|
| Feels Grove-native | ★★★★★ | ★★★★☆ | ★★★★☆ | ★★★☆☆ | ★★★★☆ |
| Evokes invisibility | ★★★☆☆ | ★★★★★ | ★★★★★ | ★★★☆☆ | ★★★★☆ |
| Suggests flow/routing | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★★★★ | ★★★☆☆ |
| Suggests transformation | ★★★★★ | ★★☆☆☆ | ★★☆☆☆ | ★★☆☆☆ | ★★★☆☆ |
| Easy to say/spell | ★★★★★ | ★★★★☆ | ★★★★★ | ★★★☆☆ | ★★★★★ |
| No negative associations | ★★☆☆☆ | ★★★★★ | ★★★☆☆ | ★★★★★ | ★★★★★ |

---

## Emerging Favorites

### 1. **Sap** — *"The vital flow."*
The tree's own blood. Already processed, carrying exactly what's needed. The strongest metaphor for "life force made programmable." But the verb form ("sap your strength") and slang ("you sap") are concerns.

### 2. **Aquifer** — *"The deep well."*
Hidden underground reservoir that feeds every spring. Perfect for "invisible infrastructure." Slightly geological rather than botanical, but deeply resonant.

### 3. **Seep** — *"Quiet sustenance."*
The gentle, constant emergence of something life-giving. Beautiful for "AI capabilities that just appear where needed." But might feel too passive for infrastructure.

### 4. **Rill** — *"Water finds its way."*
The smallest stream, efficient routing through least resistance. Perfect for the routing aspect. But unfamiliar and might feel insignificant.

---

## Round 3: The Unconventional Direction

*"Go left instead of right. Down instead of up. Inside the cube instead of backwards. Outside the sphere instead of forwards."*

The previous rounds focused on **substance** (sap, water, light) and **movement** (flow, glide, swift). But what if the gateway's essence is its **absence**? What if we name the space, not the thing?

### The Insight Shift

Previous thinking: "What flows through the gateway?"
New thinking: "What IS the gateway when nothing is flowing?"

The gateway succeeds by **disappearing**. Users shouldn't notice it. It should be the pause between question and answer, the process that transforms without announcing itself.

---

## Unconventional Candidates

### Category: Absence / Negative Space

| Name | Meaning | The Insight | Feel |
|------|---------|-------------|------|
| **Lacuna** | A gap, an unfilled space | The gateway is the absence that intelligence flows through. Like the hole in a flute that makes music possible. | Scholarly, deliberate |
| **Hush** | Silence, the quieting | The gateway quiets complexity. Responses emerge from silence, not machinery. | Unexpected softness |
| **Ma** (間) | Japanese: meaningful emptiness | The space between things that gives them meaning. Not the flow—what the flow flows THROUGH. | Philosophical, minimal |
| **Hollow** | The empty space inside | Not the tree—the void within it. Things pass through hollows. | "Inside the cube" |

### Category: Paradox / Inversion

| Name | Meaning | The Insight | Feel |
|------|---------|-------------|------|
| **Still** | (1) Without movement (2) A distillation apparatus | Double meaning: calm + transformation. The still takes crude input and produces refined output. Stillness enabling change. | Quiet power |
| **Lull** | The calm between, to soothe | The held breath between request and response. It lulls complexity into calm. | Gentle, liminal |
| **Gloam** | Twilight, the in-between time | Neither day nor night. The gateway exists in the gloam—between app and AI, between question and answer. | Mysterious, liminal |

### Category: Process Not Substance

| Name | Meaning | The Insight | Feel |
|------|---------|-------------|------|
| **Steep** | To soak in liquid to extract flavor | Requests steep in the gateway—time, heat, extraction. The response emerges transformed. **Perfect for the midnight tea shop brand.** | Warm, transformative |
| **Sift** | To separate by passing through | The gateway sifts—selecting the right model, the right parameters. Not routing; sifting. | Active, purposeful |
| **Parse** | To break down for analysis | Unusually honest. Named for the actual work: parsing intent, parsing models, parsing formats. | Clear, technical-honest |

### Category: The Invisible

| Name | Meaning | The Insight | Feel |
|------|---------|-------------|------|
| **Thrum** | A continuous background hum | The gateway is the background thrum—always running, rhythmic, unnoticed until it stops. | Sonic, alive |
| **Mote** | A tiny particle, dust in sunlight | Everywhere and nowhere. Only visible when light catches it right. Infrastructure that disappears. | Tiny, poetic |
| **Grain** | The texture of wood, the smallest unit | Works *with the grain* of your application. Each inference a single grain. | Textural, natural |

### Category: Obscure Nature

| Name | Meaning | The Insight | Feel |
|------|---------|-------------|------|
| **Rime** | Frost that forms at boundaries | Rime crystallizes where warm meets cold. The gateway forms naturally at the boundary between app and AI. | Crystalline, precise |
| **Bole** | The trunk of a tree | Not roots, not branches, not leaves. The unglamorous middle connecting everything. Sturdy. Overlooked. Essential. | Grounded, honest |

---

## Testing the New Taglines

### Steep
> "Steep is where your requests brew."
> "Steep transforms questions into answers, one cup at a time."
> *"Let it brew."*

### Still
> "Still is the quiet that transforms."
> "Still takes the raw and makes it refined."
> *"Be still, and know."*

### Gloam
> "Gloam is the twilight layer where intelligence emerges."
> "Gloam: neither your code nor the AI. The space between."
> *"In the gloaming."*

### Hush
> "Hush quiets the complexity so clarity can speak."
> "Hush: where the noise becomes signal."
> *"Hush now."*

### Lacuna
> "Lacuna is the gap that makes the music."
> "Lacuna: the absence that presence flows through."
> *"Mind the gap."*

---

## The New Walk Through the Forest

*I enter the grove. I want to write something.*

*I open my editor. Wisp is there. I ask a question.*

*And then... stillness.*

*Not emptiness. Not waiting. A held breath. A steeping. Something is happening in the space between my question and the answer. I don't see it. I don't need to see it.*

*What do I call that moment of transformation?*

*The steeping of tea before you pour it.*
*The stillness of a distillery working.*
*The twilight gloam between day and night.*
*The hush before someone speaks.*

*What do I call the absence that makes presence possible?*

---

## Updated Decision Matrix

| Criteria | Steep | Still | Gloam | Hush | Lacuna |
|----------|-------|-------|-------|------|--------|
| Feels Grove-native | ★★★★★ | ★★★★☆ | ★★★★☆ | ★★★★☆ | ★★★☆☆ |
| Fits "midnight tea shop" | ★★★★★ | ★★★★☆ | ★★★★★ | ★★★★★ | ★★☆☆☆ |
| Unexpected/unconventional | ★★★★★ | ★★★★☆ | ★★★★★ | ★★★★☆ | ★★★★★ |
| Suggests transformation | ★★★★★ | ★★★★★ | ★★★☆☆ | ★★★☆☆ | ★★☆☆☆ |
| Easy to say in code | ★★★★★ | ★★★★★ | ★★★★☆ | ★★★★★ | ★★★☆☆ |
| No negative associations | ★★★★★ | ★★★★☆ | ★★★★★ | ★★★★★ | ★★★★★ |

---

## Emerging Favorites (Round 3)

### 1. **Steep** — *"Let it brew."*
Perfect for the midnight tea shop brand. Transformation through patience and process. Your request steeps until it's ready. Nobody names infrastructure after tea brewing—which is exactly why Grove should.

`SteepInference()` — the inference brewed for you.

### 2. **Still** — *"Be still, and know."*
Double meaning: calm + distillery. The gateway is still (peaceful) and a still (transforming). Stillness that enables transformation. Unexpected for tech.

`StillInference()` — the inference that emerged from stillness.

### 3. **Gloam** — *"In the gloaming."*
The twilight hour. Neither day nor night. The gateway exists in the in-between—between your app and AI, between question and answer. Liminal, mysterious, beautiful.

`GloamInference()` — something emerging from twilight.

### 4. **Hush** — *"Hush now."*
The silence that enables. The gateway hushes complexity so clarity can emerge. Unexpectedly soft for infrastructure.

`HushInference()` — the inference that arose from quiet.

---

---

## Round 4: The Void at the Center

*"Inside the toroidal object. Look within the ring. Peer into the endless void of space."*

Steep belongs to the tea shop. The gateway is something else. Something that exists in the space before anything is conceived. The nothing that makes everything possible.

```
                    ╭─────────────────────╮
                   ╱                       ╲
                  ╱    ╭───────────────╮    ╲
                 │    ╱                 ╲    │
                 │   │                   │   │
                 │   │     · · · ·       │   │
                 │   │    ·       ·      │   │
                 │   │   ·  VOID   ·     │   │
                 │   │    ·       ·      │   │
                 │   │     · · · ·       │   │
                 │   │                   │   │
                 │    ╲                 ╱    │
                  ╲    ╰───────────────╯    ╱
                   ╲                       ╱
                    ╰─────────────────────╯

        The hole that defines the torus.
        The nothing that makes the shape.
        The absence that enables presence.
```

---

## Void Candidates

### Category: The Void Itself

| Name | Meaning | The Void Insight | Feel |
|------|---------|------------------|------|
| **Null** | Absence of value | Not zero—the *space where something could be*. Clean, absolute. | Mathematical precision |
| **Nil** | Nothing, zero (Latin) | Cleaner than Null. Less programming-coded. Pure nothing. | Minimal, stark |
| **Cipher** | Zero; also a secret code | From Arabic "sifr" (empty). The nothing that unlocks everything. | Mysterious, mathematical |

### Category: The Center of the Ring

| Name | Meaning | The Void Insight | Feel |
|------|---------|------------------|------|
| **Lumen** | The hollow center of a tube; also: light | Anatomically perfect for a torus. The paradox: darkness that contains illumination. | Light in darkness |
| **Aperture** | An opening that admits light | The void IS an aperture—the opening that defines the shape. Controlled passage. | Precise, photographic |
| **Crux** | The decisive point, the heart | Where lines intersect. Remove it, and the torus becomes a sphere. | Central, pivotal |

### Category: Shadows and Depth

| Name | Meaning | The Void Insight | Feel |
|------|---------|------------------|------|
| **Umbra** | The deepest part of a shadow | Absolute darkness at the center. Things disappear into umbra and emerge transformed. | Dark, precise |
| **Nadir** | The lowest point, directly beneath | The deepest point of the void. The ground beneath thought. | Depth, grounding |
| **Fathom** | To measure depth; to understand | The gateway fathoms requests—measuring depth and understanding. | Diving deep |

### Category: The Generative Nothing

| Name | Meaning | The Void Insight | Feel |
|------|---------|------------------|------|
| **Lacuna** | A gap, an unfilled space | The productive absence. In bones, lacunae are chambers where cells live. | Scholarly, meaningful |
| **Aether** | The fifth element, pervading all space | Not nothing—the *something* that connects everything. The breath between stars. | Ethereal, cosmic |
| **Origin** | The zero point, the source | (0,0,0). Everything measured from here. Nothing is there, but everything refers to it. | Mathematical source |

### Category: The Unmoved Center

| Name | Meaning | The Void Insight | Feel |
|------|---------|------------------|------|
| **Fulcrum** | The pivot point | Doesn't move, enables all motion. The still axis around which everything rotates. | Power through stillness |
| **Axis** | The center line of rotation | The invisible line everything rotates around. Nothing IS there, but everything ORBITS it. | Geometric, central |
| **Vertex** | Where lines meet, the origin | The geometric soul of the shape. The point everything refers to. | Mathematical precision |

---

## Testing the Void Taglines

### Lumen
> "Lumen is the hollow that holds the light."
> "Lumen: the darkness that contains illumination."
> *"Light from the void."*

### Umbra
> "Umbra is where clarity emerges from shadow."
> "Umbra: the deepest darkness, the truest transformation."
> *"Into the shadow."*

### Null
> "Null is the nothing that enables everything."
> "Null: the space where possibility lives."
> *"From nothing, everything."*

### Cipher
> "Cipher is the zero that unlocks meaning."
> "Cipher: the nothing that decodes everything."
> *"Zero reveals all."*

### Lacuna
> "Lacuna is the gap that gives the shape meaning."
> "Lacuna: the absence that presence flows through."
> *"Mind the gap."*

### Aperture
> "Aperture is the opening through which intelligence passes."
> "Aperture: the void that controls the light."
> *"The opening."*

---

## The Void Walk

*I peer into the center of the ring.*

*There is nothing there. But that nothing is not empty. It is potential. It is the space that defines the shape. Without the void, the torus is just a sphere.*

*What do I call the nothing that makes everything possible?*

*The hollow center of a vessel — **Lumen**.*
*The deepest shadow — **Umbra**.*
*The productive gap — **Lacuna**.*
*The zero that unlocks — **Cipher**.*
*The opening that defines — **Aperture**.*

*What do I call the void at the center of the ring?*

---

## Void Decision Matrix

| Criteria | Lumen | Umbra | Null | Cipher | Lacuna | Aperture |
|----------|-------|-------|------|--------|--------|----------|
| Feels Grove-native | ★★★★☆ | ★★★★☆ | ★★★☆☆ | ★★★☆☆ | ★★★☆☆ | ★★★☆☆ |
| Captures "the void" | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★☆ | ★★★★★ | ★★★★☆ |
| Unexpected/unique | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★★★★ | ★★★★☆ | ★★★☆☆ |
| Easy to say in code | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★★ | ★★★☆☆ | ★★★★☆ |
| Paradox/depth | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★★★★ | ★★★★☆ | ★★★☆☆ |

---

## Emerging Favorites (Round 4)

### 1. **Lumen** — *"Light from the void."*
Anatomically perfect—lumen literally means "the hollow center of a tube." The beautiful paradox: it also means light. The darkness at the center contains illumination. The void that carries light.

`LumenInference()` — intelligence emerging from the hollow.

### 2. **Umbra** — *"Into the shadow."*
The deepest part of a shadow. Absolute. Not the fuzzy penumbra—the core where no light reaches. Requests enter the umbra and emerge transformed.

`UmbraInference()` — from the deepest shadow, clarity.

### 3. **Cipher** — *"Zero reveals all."*
From Arabic "sifr" (empty), which became our word "zero." A cipher is nothing—and yet ciphers unlock everything. The void as decoder. The nothing that reveals.

`CipherInference()` — the zero that unlocks meaning.

### 4. **Null** — *"From nothing, everything."*
Brutally direct. Not zero—the absence of any value at all. The space where something could be. Mathematical, clean, absolute.

`NullInference()` — from the void, intelligence.

---

*The name is in the center of the ring. Where nothing is.*

---

## ✓ The Decision

**LUMEN** — *Light from the void.*

The hollow center of a tube. The void through which everything flows. But also: light. The same word for darkness and illumination. The paradox is the point.

```
                    ╭─────────────────────╮
                   ╱                       ╲
                  ╱    ╭───────────────╮    ╲
                 │    ╱                 ╲    │
                 │   │                   │   │
                 │   │     · ✦ · ·       │   │
                 │   │    ·  L U M E N   │   │
                 │   │     · · · ✦       │   │
                 │   │                   │   │
                 │    ╲                 ╱    │
                  ╲    ╰───────────────╯    ╱
                   ╲                       ╱
                    ╰─────────────────────╯

               The hollow that carries light.
```

**Public Name:** Lumen
**Internal Name:** GroveLumen
**Domain:** *(internal service)*
**Tagline:** *Light from the void.*

**Why Lumen won:**
- Anatomically perfect: lumen literally means "the hollow center of a tube"
- Paradoxical beauty: also means light—darkness containing illumination
- Captures the essence: the void through which intelligence flows
- Unexpected: nobody names infrastructure after anatomical voids
- Feels Grove-native: scientific wonder meets poetic depth

**Runner-up:** Umbra (the deepest shadow) — saved for a future service that needs that mysterious, protective quality.

*Decided: January 21, 2026*
