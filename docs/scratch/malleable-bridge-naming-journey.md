# Naming Journey: The Malleable Software Bridge

*Finding a name for the composition layer that lets AI agents discover and arrange Grove components*

---

## Round 2: Bower Rejected

Bower felt too much like the old Bower.js package manager. The bowerbird metaphor was clever but the name didn't land. Back to the forest.

---

## Walking Deeper

What IS this thing, really?

It's not a place (like Terrarium or Glade).
It's not a thing (like Curios or Amber).
It's an **action** — the act of discovering, selecting, arranging.

Or more precisely: it's what happens when you **call forth** what you want.

You whisper "I want fireflies" and they come. You don't go find them. They find you.

---

## New Candidates

### Beckon
**Composition Layer** · `beckon.grove.place`

In the forest, some creatures can be beckoned. A patient hand, an offered seed, and the bird approaches. Not captured. Not forced. Called.

Beckon is how you call your grove into being. You describe what you want—"something that glows," "fireflies around my guestbook"—and Beckon finds the components that answer. Not a database query. A gentle call. The components that fit your intent come forward, arrange themselves, and become a composition.

*Call, and see what answers.*

**Testing:**
- "Beckon a decoration" ✓
- "The agent beckons fireflies" ✓
- "beckon.grove.place" ✓
- "Query the Beckon manifest" — slightly awkward

---

### Glade
**Composition Layer** · `glade.grove.place`

Deep in the forest, where the canopy parts, there's a glade—a clearing where light reaches the ground and everything becomes visible. You can see what's around you. You can arrange what you find.

Glade is where compositions happen. Your intent enters as a whisper. The Glade receives it, searches the manifest, and presents what it found—arranged, considered, ready.

*Where vision becomes visible.*

**Testing:**
- "Work in the Glade" ✓
- "The Glade manifest" ✓
- "glade.grove.place" ✓
- "Glade found 5 components" — awkward (places don't find things)

---

### Chorus
**Composition Layer** · `chorus.grove.place`

At dawn, the forest fills with song. A hundred different voices—each singing their own tune. But step back and what you hear isn't chaos. It's a chorus: a composition greater than its parts.

Chorus is how components sing together. You describe the feeling. Chorus finds the voices. The result is harmony.

*Many voices, one song.*

**Testing:**
- "The Chorus manifest" ✓
- "Conduct a composition" — nice, but "chorus" as verb is awkward
- "chorus.grove.place" ✓

---

### Kindle
**Composition Layer** · `kindle.grove.place`

To kindle is to bring to life—a fire, an idea, a creation. A spark catches, grows, becomes.

Kindle takes your intent and brings it to life. You describe what you want. Kindle finds the components, arranges them, and gives you something alive.

*Spark to flame.*

**Testing:**
- "Kindle a decoration" ✓
- "The Kindle manifest" — slightly Amazon-y
- "kindle.grove.place" — Amazon Kindle association is strong ❌

---

### Tend
**Composition Layer** · `tend.grove.place`

To tend is to care for, to cultivate, to shape growth. You don't force a garden. You tend it.

Tend is how you shape your grove. You describe what you want it to become, and Tend cultivates the components into arrangement.

*Cultivate your corner.*

**Testing:**
- "Tend a composition" ✓
- "The Tend manifest" — awkward
- "tend.grove.place" ✓

---

### Whisper
**Composition Layer** · `whisper.grove.place`

In the forest, whispers travel. You speak softly and the grove listens.

Whisper is how you tell the grove what you want. You don't shout commands. You whisper intent. The components that match your whisper gather and arrange themselves.

*Speak softly. The grove listens.*

**Testing:**
- "Whisper a decoration into being" ✓
- "The Whisper manifest" — slightly odd
- "whisper.grove.place" ✓
- Very Grove-toned (warm, gentle)

---

### Thatch
**Composition Layer** · `thatch.grove.place`

Thatch is woven plant material—the act of interlacing natural elements to create shelter. Birds thatch nests. Humans thatch roofs. It's composition through weaving what the forest provides.

Thatch takes components and weaves them together. You describe the shelter you want. Thatch finds the materials and interlaces them.

*Weave your shelter.*

**Testing:**
- "Thatch a scene together" ✓
- "The Thatch manifest" ✓
- "thatch.grove.place" ✓
- Nice parallel to Lattice (framework vs. weaving)

---

## Evaluation Matrix

| Name | Grove Tone | As Verb | As Noun | Tech Conflicts | Feel |
|------|-----------|---------|---------|----------------|------|
| **Beckon** | Warm, inviting | ✓ "Beckon fireflies" | ~ "The Beckon" | None | Calling forth |
| **Glade** | Natural, open | ~ "Work in Glade" | ✓ "The Glade" | None | A place |
| **Chorus** | Harmonious | ~ "Conduct chorus" | ✓ "The Chorus" | None | Voices joining |
| **Whisper** | Intimate, soft | ✓ "Whisper your intent" | ~ "The Whisper" | None | Secret communication |
| **Thatch** | Crafted, sheltering | ✓ "Thatch together" | ✓ "The Thatch" | None | Weaving materials |
| **Tend** | Caring, patient | ✓ "Tend the composition" | ~ "The Tend" | None | Cultivation |

---

## Leaning Toward

**Beckon** or **Whisper** — both capture the gentle, invitational nature of the interaction. You don't force. You call. You ask. And the grove responds.

**Thatch** is interesting for the structural metaphor (weaving components like thatching a roof) but might be too obscure.

**Glade** is beautiful but works better as a place than an action.

---

## What IS This Thing?

A system with three parts:
1. **Manifest** — A machine-readable catalog of all components with semantic metadata
2. **DSL** — A composition language simpler than Svelte but powerful enough to describe arrangements
3. **Interface** — How AI agents query, match, and compose

It's the **bridge** between:
- "I want butterflies around my guestbook" (intent)
- A composed scene of Butterfly components positioned around a GuestbookWidget (reality)

---

## What Does It DO?

- **Discovers** — Finds components matching fuzzy criteria ("something that flies", "glowing things")
- **Selects** — Filters by semantic tags, constraints, tier limits
- **Composes** — Arranges selected components into a coherent whole
- **Translates** — Turns human intent into technical specification

The user never sees this. The agent uses it. The result appears in Terrarium or Foliage.

---

## What Emotion Should It Evoke?

- **Invisible empowerment** — Your vision becomes real without you knowing how
- **Discovery** — The right piece was always there, waiting to be found
- **Connection** — Disparate things come together meaningfully
- **Magic** — Intent → result, with the mechanics hidden

---

## Walking Through the Grove

```
                              ☀️
                           🌲   🌲   🌲
                        🌲    🌳    🌲
    ═══════════════════════════════════════════════
               ROOTS CONNECT BENEATH
                  (mycelium network)
```

I'm a Wanderer. I want to make my space feel cozy and alive.

I open a chat with an agent. I say: "Add something magical to my sidebar. Maybe fireflies? Or something that glows?"

The agent needs to:
1. Find components that match "magical", "glows"
2. Understand what fits in a sidebar
3. Compose an arrangement that feels right
4. Hand it off to Terrarium or Foliage

Where does this happen?

Not in Terrarium (that's the canvas).
Not in Foliage (that's the theme).
Not in Curios (that's the interactive elements).
Not in Mycelium (that's the MCP communication layer).

This is **underneath**. This is the *vocabulary* that makes composition possible.

---

## Rejected Names

### Weave
Already taken — it's the node-graph editor for animations/diagrams in Terrarium.

### Rootwork
Beautiful concept (roots working underground to connect), but "rootwork" has loaded connotations in folk magic traditions. Too risky.

### Mycelium
Already taken — the MCP server. Same metaphor (hidden network), different purpose.

### Canopy
Feels like it's "above" things, looking down. This is more foundational.

### Undergrowth / Understory
Too passive. This thing is active — it searches, matches, composes.

### Thicket
Sounds impenetrable, chaotic. We want accessible, composable.

### Tendril
Tendrils reach out and grasp. Nice for discovery, but doesn't capture the full picture (arrangement, composition).

---

## The Bowerbird Insight

A **bowerbird** is a remarkable creature. The male builds a **bower** — an elaborate architectural display made entirely from found objects:

- Blue feathers
- Shiny berries
- Iridescent beetle shells
- Colorful flowers
- Even human-made objects (bottle caps, straws)

The bird:
1. **DISCOVERS** objects in the environment
2. **SELECTS** based on criteria (color, shininess, rarity)
3. **ARRANGES** them into a coherent structure
4. **PRESENTS** the result (the bower itself)

This is EXACTLY what the composition layer does:
1. Manifest lets you **discover** components
2. Semantic tags let you **select** by criteria
3. DSL lets you **arrange** them
4. Output is a **composed** decoration or curio

---

## Testing "Bower"

| Context | Test |
|---------|------|
| Discovery | "Bower found 5 components matching 'flying'" ✓ |
| Manifest | "The Bower manifest" ✓ |
| Composition | "Use Bower to compose a scene" ✓ |
| Domain | "bower.grove.place" — where compositions are defined ✓ |
| Agent use | "The agent queries Bower for glowing components" ✓ |
| Human editing | "Edit the Bower composition directly" ✓ |

### The Tagline Test

> "Bower is where _______________."

- "Bower is where intent becomes arrangement."
- "Bower is where discoveries become compositions."
- "Bower is where your vision takes shape."

> "Bower is the _______________."

- "Bower is the composition layer."
- "Bower is the vocabulary of arrangement."

---

## Concerns & Mitigations

**Concern:** Old Bower.js package manager association
**Mitigation:** That project has been deprecated since 2017. Most developers won't remember it, and the context is completely different.

**Concern:** Sounds like "bough" (tree branch)
**Actually good:** "Bough" is nature-native. The overlap adds warmth.

**Concern:** Too obscure (who knows what a bowerbird is?)
**Mitigation:** The name works even without knowing the bird. "Bower" evokes shelter, shade, a garden arbor. The bird metaphor is a delightful easter egg for those who discover it.

---

## The Entry

### Bower
**Composition Layer** · `bower.grove.place`

A bowerbird creates something remarkable: an architectural display built entirely from found objects. Blue feathers, shiny berries, iridescent beetles—each item discovered, selected for its qualities, and arranged with intention. The bower isn't random accumulation. It's curation made visible.

Bower is how your grove composes itself. Behind every "make it cozy" or "add something that glows," there's a translation layer: your intent becomes a query, the query finds components in the manifest, and the components arrange into a composition. You describe the feeling. Bower finds the pieces. The result appears in Terrarium or Foliage, ready to become part of your space.

The manifest catalogs every component with semantic tags—not just "butterfly" but "flying, animated, colorful, small, spring." The DSL describes arrangements in a format simpler than code but richer than drag-and-drop. Agents speak Bower fluently. Humans can read and edit it too.

You might never interact with Bower directly. Like the bird's careful selection process, it works in the background—discovering, matching, arranging. All you see is what emerges: a scene that captures what you meant.

*Found, selected, arranged.*

---

## Sub-Concepts (Bower Lexicon)

| Term | Meaning |
|------|---------|
| **Manifest** | The catalog of all components with semantic metadata |
| **Tags** | Semantic descriptors (flying, glowing, seasonal:winter, interactive) |
| **Composition** | A DSL document describing an arrangement |
| **Query** | A search against the manifest (fuzzy or structured) |
| **Arrangement** | The spatial/relational layout of components |
| **Display** | The final output (scene, decoration, curio template) |

Possible verbs:
- "Bower it" — compose something from components
- "Query the bower" — search the manifest
- "The bower manifest" — the component catalog

---

## Round 2 Decision (Rejected)

**Name:** Bower — felt too much like old Bower.js package manager. Moving on.

---

## Round 3: The Morning Walk

*Instruction from the Wayfinder: Focus on the PROCESS and the RESULT. The FEELING. Bring in the serenity of dew on a fresh morning after light rain. Sunlight streaming through branches.*

Walking deeper into the forest. Morning after rain. Dew on leaves. Light streaming through branches. You're not commanding anything. You're feeling what wants to exist, and it... appears. Like mist clearing to reveal what was always there.

---

## Final Candidates

### Dewfall
The moment dew forms—not rain falling, but moisture appearing silently overnight. By morning, every leaf glistens. You didn't make it happen. It just appeared.

*Appearing without effort. Glistening by morning.*

### Reverie
A reverie is that state between waking and dreaming—when you're gazing at sunlight through branches, lost in thought, and something forms in your mind's eye. Not a plan. A vision.

*Half-dream, half-real. Yours.*

### Dapple
Dappled light through leaves—not uniform brightness, but a living pattern of light and shadow. Composition without a composer.

*Light through leaves. Pattern without plan.*

### Idyll
A scene of rural peace. A poem about shepherds at rest. A moment outside of time. Serene.

*A scene worth staying in.*

### Gleam
Light catching something—dew on a leaf, a beetle's wing. Brief, beautiful, surprising.

*Light catching. Worth a closer look.*

---

## The Choice: Reverie

Reverie captures everything:

1. **The process** — You drift into a vision, not engineer a spec
2. **The feeling** — Dreamy, serene, contemplative
3. **The result** — A half-dream made real
4. **The mystery** — You don't know exactly how it happened, but there it is
5. **The warmth** — Like gazing at morning light through branches

**Testing Reverie:**

| Context | Test |
|---------|------|
| As a state | "I had a reverie about fireflies" ✓ |
| As a system | "Reverie found matching components" ✓ |
| As output | "A reverie of butterflies and flowers" ✓ |
| Domain | "reverie.grove.place" ✓ |
| Agent use | "The agent uses Reverie to compose" ✓ |
| Human feel | Warm, dreamy, magical ✓ |

**The Tagline Test:**

> "Reverie is where your vision takes shape."
> "Reverie turns feeling into form."
> "You describe the dream. Reverie makes it real."

---

## Decision

**Name:** Reverie
**Internal Name:** GroveReverie
**Domain:** reverie.grove.place
**Package:** @autumnsgrove/reverie
**Icon:** `sparkles` — the magical, ethereal quality of dreams made real

*Half-dream, half-real. Yours.*

---

## The Entry (for grove-naming.md)

### Reverie
**Composition Layer** · `reverie.grove.place`

A reverie is that state between waking and dreaming—when you're gazing at sunlight through branches, lost in thought, and something forms in your mind's eye. Not a plan. A vision.

Reverie is how you compose your grove. You don't design; you *see*. "Fireflies around my guestbook" isn't a specification—it's a reverie. The system takes your half-formed dream and gives it shape. The manifest knows what exists. The DSL knows how things arrange. But you just... drift into what you want.

Behind every "make it cozy" or "add something that glows," there's a translation layer: your intent becomes a query, the query finds components in the manifest, and the components arrange into a composition. You describe the feeling. Reverie finds the pieces. The result appears in Terrarium or Foliage, ready to become part of your space.

You might never interact with Reverie directly. Like the moment between waking and sleeping, it happens in the background—half-conscious, half-automatic. All you see is what emerges: a scene that captures what you meant.

*Half-dream, half-real. Yours.*

---

## Reverie Lexicon

| Term | Meaning |
|------|---------|
| **Manifest** | The catalog of all components with semantic metadata |
| **Vision** | A composition described in the DSL |
| **Dream** | The user's intent before it takes shape |
| **Form** | The final output (scene, decoration, curio template) |

Possible expressions:
- "A reverie of fireflies" — a composed scene
- "Enter a reverie" — begin composing
- "The reverie manifest" — the component catalog
- "Drift into your design" — the process of composing
