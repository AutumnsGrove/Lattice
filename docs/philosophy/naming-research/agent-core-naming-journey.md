---
published: false
lastUpdated: '2026-11-12'
---

# Agent Core Naming Journey

> *Finding the name for the small thing that goes out into the grove, does the work, and comes back.*

**Status: decided. The name is Lyra (2026-11-12).** See the Sixth Walk at the bottom for the decision, the entry, and what's left to do.

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

---

# Second Walk: The Familiar Direction

*(2026-11-12. Autumn: "I like familiar but I'm not entirely sold on it. That vibe feels right. We don't have to talk specifically about the core. Nova is both the agent and the core. It can be both.")*

That changes the question. Not "what do we call a library" but **"what do we call a being you can say out loud?"** Nova is a name you can say: *ask Nova.* So the new test sentence is:

> **"Ask ___ to summarize the week."** / **"___ left this on the porch."**

If it reads like a creature, it's working.

## Correction To The First Walk

Hob was cleared only against this repo and npm, not against the agent space. When I checked, it was **crowded**: `hob.dev` (agent workspace), `FrigadeHQ/hob` (local AI app), `SmartAppsCo/hob` (workspace for coding agents), and **Hobbots**, whose tagline is *"Little helpers that do your chores while you sleep."* That is my pitch for Hob, word for word. Struck from the shortlist.

## The Lane Is Crowded

Everyone reaches for the same helper-spirit folklore. What turned up in agent-space searches (not exhaustive, and absence of a hit is not proof of absence):

| Name | What's already using it |
|---|---|
| **Familiar** | `qearlyao/familiar` (a companion agent daemon **built on Pi**), `familiar-software/familiar` (screen-watching context for agents), `familiar-md/familiar`, `familiar-agent` on PyPI, and `withfamiliar.ai` ("Not an assistant. A Familiar.") |
| **Hob** | see above |
| **Kodama** | a Kiro CLI agent pack, a background coding-agent daemon ("a forest spirit that quietly works in the background"), a Zettelkasten generator |
| **Famulus** | a Claude/Codex plugin |
| **Tomte** | a Rust coding-agent CLI, and a "safely delegate recurring work to an AI agent" project |
| **Mote** | a browser-automation agent framework, an ESP32 voice companion |
| **Puck** | Puck editor with an AI mode |
| **Dormouse** | a VS Code terminal multiplexer with agent alerts (1.1.0, July 2026), a Haskell HTTP library |
| **Moth** | a tiny MCP debugging plugin (2 stars) |
| Cricket, Fylgja | nothing surfaced |

## Why That's Only A Data Point

**Nova is one of the most crowded names in software.** Autumn picked it anyway, because it's *right*. This is personal tooling for Autumn's own platform, not a product competing for search results. If the vibe is the point, crowding is a cost to know about, not a veto. (If this ever ships as a public open-source library, revisit.)

## Walking Through, Again

The tea shop at midnight. The lamp is on. Everyone's gone home. Something small is still moving in the warm light near the window: it's been here all evening, it knows where everything is kept, it never knocks anything over. In the morning the cups are washed and there's a note by the till.

Not a servant. Not a robot. A **small, soft, nocturnal presence that belongs to the room.**

## Candidates In This Lane

### Moth

- **Meaning:** a night flyer, drawn to light. Quiet, soft-winged, easily overlooked, the butterfly's underdog cousin. Moths are real nocturnal **pollinators**: they carry pollen between flowers in the dark.
- **Why it fits:** it goes *toward the light*, and the light is **Lumen**: the agent asks Lumen for every thought. It carries pollen between flowers, which is what an agent does between tools. It works at night, small and unobtrusive. It sits at the midnight tea shop lamp. And it's a creature: *"Ask Moth." "Moth left this on the porch."*
- **Vibe:** soft, nocturnal, lamplit, a little odd.
- **Issues:** **Moth / Moss**, one letter apart, in the same stack (Moss is the AI memory inside Lumen). Likely to be confused in speech and to cause typos in config. It could also read as a feature: *Moss remembers, Moth works.* Moth is also the name of a tiny MCP debugging plugin.
- **Tagline test:** *"Moth is who stays up with the lamp."* ✓ · *"Ask Moth."* ✓

### Cricket

- **Meaning:** the hearth cricket, a classic household luck-spirit ("the cricket on the hearth"). Sings at night. Small. Jiminy Cricket is a *conscience*: the one who says *wait, should we?*
- **Why it fits:** hearth companion, warm, small; and "asks before it acts" is the approval model in one image.
- **Issues:** it's also a sport, which makes search miserable. Chirp (DMs) is already a sound-of-small-creatures name, so the grove has a bird-sound slot taken.
- **Tagline test:** *"Cricket keeps the hearth at night."* ✓

### Dormouse

- **Meaning:** a tiny forest rodent that **hibernates**, and the one asleep in the teapot at the Mad Tea Party.
- **Why it fits:** *tea shop*, literally. Hibernation is park-and-wake: the run sleeps without costing anything until an alarm or an answer rouses it. Small, gentle, comic.
- **Issues:** long to type. A VS Code terminal tool uses the name (agent-adjacent, so a search would mix them). It names the *resting* more than the *working*.
- **Tagline test:** *"Dormouse sleeps in the teapot until you need it."* ✓

### Fylgja

- **Meaning:** Norse. A "follower": the spirit that accompanies a person through life, often in animal form, tied to their character and luck.
- **Why it fits:** the most *exact* meaning of familiar, with no one else using it for agents.
- **Issues:** spelling and pronunciation (FIL-gya) are a real tax. You'd be explaining it forever.

### Familiar (keep it as a candidate)

Everything above is crowded or has a catch, and Familiar is still *the* word for the vibe. It's the one that makes people understand in a second. The case for keeping it: Nova precedent, and personal tooling. The case against: it's the most saturated of all, including a Pi-based one and a same-pitch commercial product.

## Leaning (Second Walk)

**Moth**, with **Familiar** as the safe baseline. Moth gets you the vibe, a real creature, the Lumen connection, and a distinct name. The Moss near-collision is the one honest cost.

## Open (Second Walk)

- [ ] What's the thing about Familiar that isn't landing? (Too common? Too witchy? Too long? Too cute?) That tells us which direction to push.
- [ ] Is the Moth/Moss proximity a feature or a bug?
- [ ] How much does search-uniqueness matter, given Nova?

*(Answered in the third walk below.)*

---

# Third Walk: Soft In The Mouth

*(2026-11-12. Line 216, the tea shop scene, "really spoke." Answers to the open questions:)*

1. **Familiar** is "a little harsh in the mouth" and not easy to spell. Rules out Fylgja, Famulus, and likely Dormouse too.
2. **Moss** is a Grove feature that will likely come back **inside this agent product**, as its memory. So nothing Moss-adjacent: Moth is out, Mote is shaky (all M-o-?-?). And the name has to read well *beside* Moss.
3. **Unique within the Grove ecosystem only.** Outside crowding is not a constraint. It's personal software, not a product to market.

## What The Name Has To Be

From line 216: *a small, soft, nocturnal presence that belongs to the room. It knows where everything is kept. It never knocks anything over. In the morning there's a note by the till.*

Plus: soft sounds (l, m, n, v, vowels), short, spelled the way it sounds, a being you can say ("Ask ___"), and unclaimed in the Grove.

**A thread worth keeping:** Nova's own decision record (D8) says *"A star that suddenly brightens. Short, astral, family of `polaris`."* The non-Grove projects already have an astral family: Nova, Polaris, Meridian, Solarium. A name in that family, that is *also* the tea shop at night, would sit in both worlds.

## Candidates

### Vesper

- **Meaning:** the **evening star** (Venus at dusk), and the hour the lamps are lit. Also the common name of **vesper bats** (the largest bat family, nocturnal, a classic witch's familiar) and the **vesper sparrow** (named for its evening song).
- **Why it fits:** evening star = Nova's astral family (Nova flares; Vesper is the star that comes out when the lamp goes on). Small, nocturnal creatures carry the name. Soft: v, s, p, r. Spelled as it's said. *"Ask Vesper." "Vesper left this on the porch."*
- **Reads beside Moss?** Yes. *Vesper keeps a moss.* No clash.
- **Issues:** **rejected once before** in the music-link journey as "too churchy ('vespers' = evening prayers). Doesn't feel warm enough." That was for a music name; here the meaning is the evening star, not the service. But the churchy echo is real. Also a famous cocktail and a Bond name, neither of which matters here.
- **Tagline test:** *"Vesper is who keeps the lamp lit."* ✓

### Ember

- **Meaning:** a banked coal that survives the night and **relights the whole fire in the morning**. That is durability: park, evict, wake, resume.
- **Why it fits:** Nova kin (the star flares, the ember keeps the glow). Warm, small, a hearth presence. Soft. *"Ask Ember."*
- **Reads beside Moss?** Fine.
- **Issues:** **Amber and Ember** share the same ending in the same stack, and "Ember writes to Amber" is a sentence you'd say daily. Passed over four times in earlier journeys ("embers are dying", "too close to Amber"). The first is answered by *banked*, but the second stands.
- **Tagline test:** *"Ember keeps the fire till morning."* ✓

### Glim

- **Meaning:** an old word for a small light, a candle or lantern carried at night. Related to *glimmer*.
- **Why it fits:** sounds like a creature already. Small, soft, lamplit. Cousin to Lumen and Lantern without being either. Nothing in the repo uses it. *"Ask Glim."*
- **Reads beside Moss?** Yes.
- **Issues:** archaic and a little obscure. It might read as a diminutive of *glimmer* rather than its own word. Short enough to get lost in prose.
- **Tagline test:** *"Glim is the small light left on."* ✓

### Lar

- **Meaning:** the **Lar familiaris**, the Roman household guardian spirit. *Familiar* itself descends from Latin *familiaris*, "of the household." So this is the root of the word that already felt right, shorter and softer.
- **Why it fits:** exactly the vibe, with a quiet etymology. Three letters, spelled as said.
- **Issues:** obscure; most people will read it as a syllable. A bit flat to say. Easy to lose in a sentence.
- **Tagline test:** *"Lar is the spirit of the household."* ✓

### Hush

- **Meaning:** the quiet. *It never knocks anything over.*
- **Why it fits:** soft. Short. The mood of the whole scene.
- **Issues:** a mood, not a being. *"Hush left a note"* works; *"ask Hush"* reads like being told to be quiet. Came up in four earlier journeys (editor, Meadow posts, feedback, voice) and was never claimed.

### Set down

| Name | Why not |
|---|---|
| **Dew** | Lovely (it's what the night leaves, there by morning), but too small a word, and the Prism prose already uses it. |
| **Mallow / Linden** | Tea-shop herbs, soft and name-like. Not a presence in the room. |
| **Brownie** | A household spirit that works at night, but sugary. |
| **Fae / Pixie** | Too generic a category. |
| **Mote** | Dust in lamplight: perfect image, but M-o-?-? beside Moss. |

## Leaning (Third Walk)

**Vesper.** Soft, spelled as said, nothing like Moss, unclaimed in the Grove, and the only candidate that is *both* in the Nova/Polaris astral family *and* the tea shop at dusk. The churchy echo is its one real cost. **Glim** is the most creature-like. **Ember** has the best meaning and the Amber rhyme.

## Open (Third Walk)

- [ ] Say them aloud: *"Ask Vesper." "Ask Glim." "Ask Ember." "Ask Lar."* Which one feels like it lives in the room?
- [ ] Is "churchy" a dealbreaker for Vesper, or does the evening-star reading carry it?
- [ ] Does the astral family (Nova, Polaris, Vesper) matter, or is Grove-only the point?

---

# Fourth Walk: An Animal, Or An Entity

*(2026-11-12. "Vesper doesn't do it for me. Vesper is a no. Ember is alright, maybe it's ok. What if it was something like an animal or an entity?")*

**Struck:** Vesper. **Kept on the table:** Ember (alright, maybe).

## What The Grove Already Holds

Worth knowing before choosing a creature:

- **The skill animals are dev-time workers, each with one niche** (Bloodhound explores, Raccoon audits, Beaver tests…). Taken: bloodhound, elephant, beaver, raccoon, bee, badger, owl, fox, deer, panther, eagle, spider, cat, chameleon, crane, crow, frog, goose, groundhog, hawk, hummingbird, lynx, mole, osprey, rabbit, raven, robin, squirrel, starling, swan, turtle, vulture, wren, firefly.
- **Birds are reserved** for the prompt-injection defense (Songbird, Canary, Kestrel, Robin). An earlier journey ruled it outright.
- **The Druid is "not an animal"**: the keeper who walks among them. A general-purpose runtime agent isn't a single-niche skill, so it may sit better as an *entity* than as one more animal in that forest. (A consideration, not a rule.)
- **The Reverie Ghibli suite has already claimed `Kodama` and `SootSprites`** as planned components (`docs/plans/features/planning/reverie-components-suite.md`). Kodama was my strongest entity candidate and it's an in-Grove collision. Out.
- **Hedgehog is already a Prism creature asset** (with Fox, Owl, Deer, Rabbit, Squirrel, Bear, Butterfly, Firefly, Dragonfly, Hummingbird), so art for it exists.

## Candidates

### Animals

**Dormouse**
- Asleep in the teapot at the Mad Tea Party. A tiny forest rodent that **hibernates**; nocturnal.
- Fits the scene (tea shop, small, nocturnal) *and* the architecture: hibernation is park-and-wake. A run sleeps for free until an alarm or an answer rouses it, and Durable Objects literally hibernate.
- Catches: a mouthful, and it names the resting more than the working. In Carroll the Dormouse is perpetually half asleep, which is funny and a slightly odd mascot for something you trust to work.
- *"Ask Dormouse." "Dormouse sleeps in the teapot until you need it."*

**Otter**
- **Uses tools** (sea otters crack shells with a favorite stone, and hold hands asleep so they don't drift apart). An agent is a tool-using animal; this is the most exact functional metaphor in the whole list. Soft, short, spelled as said.
- Catches: considered twice before (growth funnel, brand consistency) and set aside as "too playful", though both notes remarked that it uses tools. Not nocturnal, and not the tea shop.
- *"Ask Otter." "Otter found the way and brought something back."*

**Hedgehog**
- Nocturnal, small, soft-bellied. Mrs. Tiggy-Winkle is Potter's hedgehog who **washes everyone's things overnight and returns them neatly**: *in the morning the cups are washed.* Already a Prism creature.
- Catches: "Hedgehog" is a mouthful, with the d-g-h cluster. A nickname (Tiggy) is twee. Previously weighed (as the emoji) for security hardening and set aside as prickly.

**Hare**
- The moon hare; hares are a classic British witch's familiar. Crepuscular, soft, short.
- Catches: sounds like *hair*; near-sibling of the Rabbit skill.

### Entities

**Hob** *(resurrected: I struck it only for outside crowding, which no longer applies)*
- The household spirit who tends the hearth and does the chores at night. Short, soft vowel, spelled as said.
- Catches: folklore rather than forest; three letters, easy to lose in prose; a little blunt.
- *"Ask Hob." "Hob did the cups."*

**Salamander**
- The fire spirit that lives *in the hearth*; also a small amphibian. Ember with a body: Nova's fire-family, as a creature.
- Catches: long. Soft consonants (l, m, n) but seven syllables of hearth-spirit for a name you type daily.

### Still On The Table

**Ember**, if the Amber rhyme doesn't bother. The banked coal is still the best image for durability.

## Leaning (Fourth Walk)

**Dormouse**, on fit: it is the only candidate that matches both line 216 *and* the architecture. **Otter** if function should win over scene. **Hob** if it should be an entity beside the Druid rather than another animal. Not decided.

## Open (Fourth Walk)

- [ ] Animal in the forest, or an entity beside the Druid?
- [ ] Is *Dormouse* soft enough in the mouth, or does the "-mouse" tail trip it?
- [ ] Say them: *"Ask Dormouse." "Ask Otter." "Ask Hob."*

---

# Fifth Walk: Powered By

*(2026-11-12. "Saying powered by Otter feels really silly. Maybe go a little outside our domain of comfort: lean into my other repos with astral names. It's going to be a sibling of Nova anyway. Powered by Nova just feels cool. I'm not going to be asking that agent directly. It's a thing powered by this.")*

**The test changes again, and this one is better.** Not "Ask ___" but:

> **"Reverie, powered by ___."** / **"Timeline, powered by ___."** (with a link to the repo, and it just works)

That retires every creature and spirit name (Dormouse, Otter, Hob, Hedgehog, Hare, Salamander). They read as someone you talk to, not something you build on. The nature-spirit lane is closed; the astral lane is open.

## The Astral Vocabulary Already In Use

Mapped from the repos, so the new name doesn't step on any of it:

| Where | Names in use |
|---|---|
| **Nova** | Nova. (D8 rejected for the harness: Aster, Canopy, Cirrus, Loom.) |
| **Polaris** | Polaris, Atlas, Fields, **Constellation** (durable memory), Stars, Weaver, Shooting stars, **Pulsar** (scheduled routines), The Daily, **Oracle** (decision models), **Comet** (monthly retrospective), Trails, Prism, Ghost thread |
| **Meridian** | Meridian |
| **Solarium** | Solarium |
| **her-go** | persona name **Mira** (the Telegram companion, in Meridian's homelab config) |
| **Grove** | Aurora is already a sky asset; Moss is the agent-memory name that will return |

**Struck on sight:** Pulsar, Comet, Atlas, Oracle, Weaver, Constellation, Stars (Polaris); Mira (her-go); Aurora (Grove sky asset).

**Mira nearly won.** Nova is the "new star" (*stella nova*). Mira is the "wonderful star", the first variable star ever discovered, and **David Fabricius found it in 1596 and took it for a nova** before it faded. Same family, discovered by mistake as a nova, softest sound on the list. It's her-go's name, so it's gone.

## Candidates

### Vega

- **Meaning:** the brightest star in Lyra, the harp. It was the **north pole star about 14,000 years ago and will be again in roughly 12,000–13,000** (Earth's axis wobbles). It is Polaris's once-and-future counterpart. NASA also notes that **Polaris and Vega are both variable stars**, and a nova is a sudden variable by definition: Nova, Polaris, Vega all brighten and dim. It helped define the zero point of the magnitude scale, the reference other stars are measured against. (Also Spanish for a fertile meadow.)
- **Why it fits:** a sibling *of Polaris* as much as of Nova. Polaris is "the fixed point you triangulate against"; Vega held that job before and will again. Four letters like Nova, soft, spelled as said. *"Reverie, powered by Vega."* reads like *"powered by Nova."*
- **Collisions:** none in Grove, Polaris, Meridian, Solarium, Nova, or your repo list.
- **Catches:** two common pronunciations (VEE-guh / VAY-guh). Short names get lost in prose. Vega-Lite (the charting grammar) exists, though nothing in Grove uses it.

### Lyra

- **Meaning:** the constellation of the **harp**, the home of Vega. Softest sound on the list.
- **Why it fits:** warm where Vega is crisp. *"Powered by Lyra."* Quiet nod to Lyra Belacqua, who has a daemon (a familiar) in *His Dark Materials*, since the familiar vibe was the starting point.
- **Collisions:** appears once in Polaris, as one of the decorative constellations in the night-sky background (`nightSky/constellations.ts`). A decoration, not a feature name.
- **Catches:** a very popular name generally. A harp says music, which fits audio and voice better than an agent loop.

### Nebula

- **Meaning:** a cloud of gas and dust where **stars are born**.
- **Why it fits:** *"Powered by Nebula"* sounds great, and a core that agents (stars) form inside has a natural story. Soft, spelled as said.
- **Collisions:** none as a name (Polaris uses the word only in test data: "Picture of the Day: A nebula").
- **Catches:** diffuse. A cloud is the opposite of a bounded loop.

### Orbit

- **Meaning:** the loop *is* an orbit: model, tools, results, repeat, held in by gravity (budgets, permissions), always returning.
- **Why it fits:** the most literal map of what the code does. *"Powered by Orbit."*
- **Catches:** a plain, common word; Polaris has 15 mentions I did not open. Less of a *name* than a description.

### Aster

- **Meaning:** Greek for "star"; also a wildflower that blooms in autumn.
- **Why it fits:** it was on **Nova's own D8 shortlist** (rejected for Nova), so it's a sibling from the same hat.
- **Catches:** sounds like **Aspen**, the domain layer in the Grove stack. Choosing from a rejected list may feel second-best.

### Set Down

| Name | Why not |
|---|---|
| **Astra** | "To the stars", but generic, and a clone of every other name. |
| **Altair** | Soft and in the same Summer Triangle as Vega, but nothing says *why*. |
| **Quasar** | Literally "powered by" (an accretion-powered galactic core), but the hard Q and too intense. |
| **Zenith / Equinox** | Hard z-th and x sounds. |
| **Solstice** | Ten Grove mentions in the seasonal system. |

## Leaning (Fifth Walk)

**Vega.** The only candidate with a *relationship* to the existing family: Polaris's once-and-future counterpart, a variable star like Nova and Polaris, four soft letters, nothing colliding anywhere. **Lyra** is the warmer alternative. If it works out, a structure falls out naturally: **Vega in Lyra**, a core inside a larger family, which suits a core that is also a gateway.

## Open (Fifth Walk)

- [ ] Does *"Reverie, powered by Vega"* feel as right as *"powered by Nova"*?
- [ ] Is Vega's double pronunciation a problem?
- [ ] Is Lyra's softness worth more than Vega's story?

---

# Sixth Walk: Lyra

*(2026-11-12. After the sentence test: "This one feels really right. All of these sentences feel really good… a small constellation that does the work while the grove sleeps… Lyra parked the run and is waiting on approval. It could even be used as the name of the agent. I feel like having that slight personhood honestly fits for something that is an execution layer.")*

## Decision

**The name is Lyra.** It is the name of the core and the name of the agent, the way Nova is both. The slight personhood is intentional: Lyra is an execution layer, and "Lyra parked the run and is waiting on approval" is the sentence it should be able to say.

How it was reached, in short: a witch's familiar was the vibe, but Familiar was harsh in the mouth and hard to spell, and the creature names failed the real test, which is *"Reverie, powered by ___."* The astral family (Nova, Polaris) was the way back. Vega and Lyra were the last two, and Lyra won on sound and warmth.

## Why It Fits

- **Powered by.** "Reverie, powered by Lyra" has the cadence of "powered by Nova", with a softer landing.
- **Soft and short.** Four letters, spelled the way it sounds. Standard pronunciation is LIE-ruh.
- **Beside Moss, Lumen, Mycelium, Warden.** "Lyra asks Lumen for every thought." "Lyra reaches Grove's tools through Mycelium." "Lyra never holds a key. Warden does." And, when memory returns, "Lyra remembers through Moss."
- **A sibling of Nova.** Nova runs in the terminal. Lyra runs in the grove.
- **Unclaimed.** Nothing in Grove, Nova, Polaris (beyond a decorative constellation in its night-sky background), Meridian, Solarium, or the repo list uses it.

**Known catches, accepted:** two ways to say it (LIE-ruh / LEER-uh), a y in the spelling, and Google's audio codec of the same name. A harp does not describe an agent loop, and a star never described a harness either.

## The Entry

*(Written for `docs/philosophy/grove-naming.md` when it earns a row. Draft; see "Left To Do".)*

### Lyra

**The Constellation That Does the Work** · _Agent core_
**Package:** `@autumnsgrove/lyra` (proposed)
**Standard:** Agent Core
**Waystone:** The layer that does Grove's background work. It takes a job, calls tools and models, and brings back a result, even if you were asleep.

Lyra is a small constellation, a harp in the summer sky. Its brightest star, Vega, was the north star once and will be again. It's easy to find if you look up and easy to miss if you don't.

In Grove, Lyra is the layer that does the work. Give it a job, a set of tools, and limits on how far it may go, and it runs the loop: ask Lumen, call a tool, read what came back, ask again. It stops when the job is done or the budget runs out. When it needs a Wanderer's answer, it parks the run and waits without spending anything, then picks up where it left off. Memory will come from Moss.

Lyra should feel like a small, steady presence. Something you can hand a task to and stop thinking about.

_A small constellation that does the work while the grove sleeps._

## Working Vocabulary (Draft)

Terms that came up naturally in the sentence test. Not final, and not a spec.

- **Run**: one job, from start to finish.
- **Park**: stop a run while it waits for an approval, at no cost.
- **Wake**: resume a parked run once the answer arrives.
- **Budget**: the limits on steps, tokens, time, and cost.
- **Transcript**: the record of a run.

## Parked Idea

**Vega in Lyra.** If the family grows, Vega could be a part of Lyra (a core inside a larger gateway family), since Vega is the brightest star in the constellation. Nothing to decide now.

## Left To Do

Decisions for Autumn, not yet done:

- [ ] Add a row to `docs/philosophy/grove-naming.md` and the `Internal Names` table (suggested internal name: `GroveLyra`), then regenerate the GroveTerm manifest.
- [ ] Reserve `lyra` so no Wanderer can claim `lyra.grove.place` (Loam's blocklist, plus the router and username check).
- [ ] Create the repository and the `@autumnsgrove/lyra` package.
- [ ] Update #1605 (new name, and the corrected protocol frames from the research).
- [ ] Decide whether the entry above goes through `museum-documentation` for a fuller treatment later.

The router, username, and manifest steps only matter if Lyra gets a Grove-facing surface. As a library in its own repository, only the naming doc row and the reservation are likely worth doing.
