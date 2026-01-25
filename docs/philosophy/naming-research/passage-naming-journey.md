# Router Naming Journey

> *Taking the router on a walk through the grove.*

---

## What the Router Actually Does

Reading the code, I understand:

1. **Catches all `*.grove.place` wildcard subdomain requests**
2. **Directs each visitor to the right place** based on subdomain:
   - `heartwood.grove.place` → Authentication service
   - `amber.grove.place` → Storage
   - `autumn.grove.place` → That person's blog (tenant lookup)
   - `meadow.grove.place` → Social feed
   - Reserved names → Landing page (coming soon)
3. **Passes along who they were looking for** via `X-Forwarded-Host`
4. **Handles special cases**: CDN serving, www redirects, CORS validation

It's the first thing every visitor encounters. It decides: *where do you belong?*

---

## Visualizing the Grove

```
                              ☀️

              🏠 Heartwood        🌻 Meadow
                (identity)         (social)

         🌲        🌳        🌲        🌲
       autumn    dave     emma     friend

    ═══════════════════════════════════════════════
                   [ ??? ]
            "who are you looking for?"
              every visitor passes through
    ═══════════════════════════════════════════════
                        │
                   the internet
```

Every single visitor to `*.grove.place` passes through this layer first.
It's the *entrance* to the grove.

---

## What IS This Thing?

### Fundamentally:
- **Not a place** you visit (Meadow, Nook, Clearing)
- **Not an object** you interact with (Amber, Trove)
- **Not a feature** of your tree (Foliage, Rings)
- **It's... the entrance? The gate? The moment of arrival?**

### What does it DO in a Wanderer's life?
- **Guides** — It sends you to the right place
- **Welcomes** — It's the first thing you encounter
- **Directs** — Without it, you'd be lost

### What emotion should it evoke?
- **Arrival** — You've found the grove
- **Welcome** — The moment of entering
- **Direction** — Being shown the way

---

## Walking Through...

I'm outside the grove. I want to visit `autumn.grove.place`.

I approach... what?

*Not a gate—that feels restrictive, like it might not let me in.*

*Not a path—paths are already inside, like Trails.*

I arrive at the edge of the grove. Something marks the boundary.
Something that says "you're entering now."

What do you find at the entrance to a forest?

---

## Exploring the Forest Edge

### Things at the entrance to a forest:

**Gate/Arch** — Too restrictive, implies permission needed
**Trailhead** — The starting point of a path... but "Trail" is taken
**Threshold** — The boundary between outside and in... interesting
**Edge** — Where the forest begins... feels incomplete
**Glade** — An opening... but that's inside, not at the entrance
**Bower** — An archway of branches... welcoming but decorative
**Lychgate** — A roofed gate at a churchyard... too gothic
**Stile** — Steps over a fence... too rural English
**Crossroads** — Where paths meet and you choose... but you don't choose, the router chooses *for* you

Wait. The router doesn't ask you to choose. It *knows* where you're going.
It reads your intention (`autumn.grove.place`) and sends you there.

It's not a crossroads. It's a **guide at the entrance**.

---

## What Guides Travelers in Nature?

**Waystone** — Already taken (help center)
**Signpost** — Too utilitarian, not nature enough
**Trail marker** — Same issue
**Cairn** — A stack of stones marking the way... interesting
**Blaze** — A mark on a tree showing the path
**Compass** — Navigation tool, not nature-place
**North Star** — Guides travelers... celestial, not forest

What about **who** guides rather than **what**?

**Guide** — Too generic
**Scout** — Already used (different service)
**Ranger** — Forest ranger... protects and guides
**Warden** — Guardian... a bit formal
**Keeper** — Already implied in "grove keeper"

---

## Returning to the Nature Metaphor

The router is at the **entrance**. It **welcomes** you. It **knows where you belong**.

In the Grove ecosystem:
- **Wanderer** — seeks the way
- **Wayfinder** — shows the way (Autumn)
- **Pathfinder** — trusted guides

The router is like a **silent greeter** at the entrance who:
1. Sees you arrive
2. Understands where you want to go
3. Sends you there without you having to ask

---

## The Entry Point

What's the word for where you enter a forest?

**The Verge** — The edge, the threshold
**The Margin** — Where forest meets field
**The Canopy's Edge** — Where you first step under the trees
**The Welcome** — The act itself

Or thinking about what's physically there at a forest entrance:

**An Arbor** — Wait, that's taken (admin panel)
**A Grove Gate** — Too literal
**The Opening** — Where the trees part to let you in

---

## A New Direction: What Happens at Entry

When you enter a grove, what happens?

You step through. The light changes. The air changes.
The canopy closes overhead.
You've **crossed over**.

**Threshold** — The point of crossing
**Crossing** — The act itself
**Passage** — The way through

Wait. **Passage**.

A passage is:
- A way through from one place to another
- The act of passing through
- In nature: a gap in trees, a way through dense forest

But more evocatively: **a passage brings you where you need to be**.

---

## Testing "Passage"

> "Passage is where you enter the grove."

Hmm. Feels a bit abstract.

> "Passage brings you home."

Better. But still feels like it's about the journey, not the arrival.

---

## Returning to the Forest Edge

Let me think about physical structures at forest entrances:

In old forests, especially in Japanese and Celtic traditions, there are often **gates** or **arches** marking the sacred boundary. The Japanese have **torii gates**—they mark the transition from mundane to sacred.

But "gate" feels restrictive in English.

What about the **clearing** at the entrance? The moment before you enter where the forest opens to receive you?

Wait—**Clearing** is taken (status page).

---

## The Living Guide

The router is *active*. It doesn't just mark a boundary—it actively sends you where you belong.

In the forest:
- **Roots** guide water to where it's needed (but Mycelium has the underground network)
- **Streams** flow toward destinations
- **Wind** carries seeds where they should grow
- **Birds** guide travelers in folklore

Hmm. **Wind** guides silently, invisibly. You don't see it, but it carries you.

**Breeze** — Gentle, guiding
**Gust** — Too forceful
**Draft** — Too indoor
**Current** — Flows, directs... but more water than air

**Breeze** is interesting. Let me test it:

> "Breeze carries you to your tree."

That's... actually quite nice? Subtle, invisible, guiding.

But wait—there's already a "Breeze mode" in Weave (animation mode).

---

## Nature's Navigation

What in nature helps you find where you belong?

**The North Star** — Guides travelers... celestial
**Animal trails** — Show you the paths others have taken
**Water** — Always flows downhill to where it belongs
**Seeds** — Carried to where they'll grow

Seeds are **dispersed** by wind, animals, water. They find their home.

The router is like the wind that carries the seed (visitor) to the right soil (blog/service).

**Scatter** — Dispersing seeds... but negative connotation
**Drift** — Where seeds drift to... passive
**Disperse** — Too clinical

---

## The Welcoming Concept

Let me try a different angle. What about the **feeling** of arriving at the grove?

You type `autumn.grove.place`. You arrive.

The grove *recognizes* you. It knows: "Ah, you want Autumn's place."
And it takes you there.

It's like the grove itself is **aware** of you arriving.

**Sense** — The grove senses your arrival
**Welcome** — The grove welcomes you
**Greet** — The grove greets you

But these are verbs, not nouns.

What about the place or thing that does the welcoming?

**The Welcome Mat** — Too domestic
**The Greeter** — Too human
**The Sentinel** — Watchful... but that implies guarding, not welcoming

---

## Trying: The Mouth of the Forest

In geography, the **mouth** of a river is where it meets the sea.
The **mouth** of a cave is where you enter.

What about the **mouth** of the grove?

Too strange. "Mouth" has weird connotations.

But the concept is right: the *point of entry*.

---

## A New Candidate: Veil

At the forest's edge, there's often a **veil** of leaves and branches.
You push through, and you're inside.

The veil:
- Marks the boundary
- You pass through it
- It's soft, natural, not a hard boundary

> "The Veil welcomes you into the grove."

Hmm. Too mysterious? Too ethereal?

Also, "veil" suggests hiding/concealing, which isn't quite right.

---

## Back to Functional Metaphors

The router:
1. **Receives** a request
2. **Determines** where it should go
3. **Sends** it there

In nature, what receives, determines, and sends?

**A Junction** — Where paths meet
**A Fork** — Where paths diverge (but you don't choose)
**A Divide** — Where things separate

None of these feel warm enough.

---

## The Grove Keeper's Role

Actually—what does the **Wayfinder** do?

> "Where wanderers seek paths, the Wayfinder creates them."

The router doesn't *create* paths. It *follows* them. It knows where each subdomain should go.

The router is more like... a **doorkeeper**? A **gatekeeper**?

No—those imply restriction, permission.

What about **Threshold Keeper**? **Threshold Guardian**?

---

## Threshold

Let me sit with **Threshold**.

A threshold is:
- The entrance to a building or area
- The point of entering
- A boundary that, once crossed, means you're *inside*

In forest terms: the threshold is where the canopy first covers you.

> "Threshold is where you enter the grove."

That works! It's simple. It's clear.

> "Cross the Threshold, find your way home."

Hmm. Nice.

But—is "Threshold" too architectural? Too door-like?

---

## Testing Threshold

**The Metaphor:**
A threshold is the beam across a doorway, the point of entry. In nature, it's where one environment transitions to another—where field becomes forest, where the canopy first closes overhead.

**What it does in Grove:**
Threshold is the first thing you encounter when you visit any `*.grove.place` address. It reads your destination, determines where you belong, and carries you there. You don't interact with Threshold; you pass through it. And like any good threshold, you only notice it if something's wrong.

**The feeling:**
Entry. Arrival. The moment of crossing over.

**Tagline options:**
- *Cross the threshold. Find your tree.*
- *Every journey into the grove begins here.*
- *The boundary you cross to come home.*

**Issues:**
- Slightly architectural (doors, buildings)
- Not as distinctly "nature" as other Grove names
- But: thresholds exist in nature too (forest edge, cave mouth)

---

## Other Candidates to Compare

Let me generate a few more to compare:

### Verge
The edge of the forest. Where the grass meets the trees.

> "Verge is where the grove begins."

*The verge is the edge you cross when entering the grove.*

Issues: "On the verge" has a different common meaning

### Bough
A large branch. Often forms the entry archway in forests.

> "Bough welcomes you into the grove."

Issues: Too decorative? More about the structure than the function.

### Canopy
The leafy covering overhead. When you're under the canopy, you're in the grove.

> "Step beneath the Canopy."

Issues: "Canopy" suggests overhead coverage, not entry point.

### Grove Gate
Literal but clear.

> "Grove Gate directs you to your tree."

Issues: Too literal. "Gate" implies restriction.

### Arrival
The act of arriving.

> "Arrival is the first moment in the grove."

Issues: Too abstract. Not nature-specific.

---

## Comparing Top Candidates

| Name | Nature Connection | Entry Feeling | Warmth | Issues |
|------|-------------------|---------------|--------|--------|
| **Threshold** | Boundary of environment | ✓ Strong | Medium | Slightly architectural |
| **Verge** | Edge of forest | ✓ Strong | Medium | "On the verge" confusion |
| **Passage** | Way through | Medium | Medium | More about journey |
| **Canopy** | Forest covering | Medium | ✓ Warm | Not specifically entry |
| **Bough** | Arching branch | ✓ Strong | ✓ Warm | Too decorative |

---

## The Walk Continues...

Let me actually walk through the experience:

*I type `autumn.grove.place` in my browser.*
*I'm outside the grove, in the harsh internet.*
*I arrive at... the Threshold.*
*The Threshold sees: "autumn.grove.place"*
*It knows: Autumn's tree is over there.*
*Without a word, it lets me through.*
*Now I'm at Autumn's blog.*

Yes. **Threshold** works.

---

## But Wait—Another Angle

The router is *invisible*. You don't know it's there unless something breaks.

What's invisible in nature?

**The Air** — You breathe it but don't see it
**Mycelium** — Underground (already taken)
**The Breeze** — Carries you (mode in Weave)
**Currents** — In water, invisible flows

What about **Ether**?

The ether was the invisible medium through which light was thought to travel.
It's what connects everything invisibly.

> "Ether carries your request through the grove."

Hmm. Too mystical? Too physics-y?

---

## Simplifying: What Word Feels Right?

Grove names are:
- Usually one word
- Nature-connected but not *about* trees directly
- About what happens *in and around* the forest

The router is about **entering** the grove.

What's the most evocative word for "the point where you enter a natural space"?

- **Threshold** — The boundary you cross
- **Verge** — The edge before entry
- **Entry** — Too plain
- **Mouth** — Too strange
- **Edge** — Too incomplete
- **Portal** — Too fantasy
- **Gateway** — Too literal

---

## Final Reflection on Threshold

**Threshold** has a beautiful duality:

1. **Architectural**: A doorway's bottom beam
2. **Natural**: The boundary between ecosystems
3. **Metaphorical**: A point of transformation

When you cross a threshold, you're no longer outside. You're *in*.

Every visitor to Grove crosses the Threshold.

---

## Writing the Entry

### Threshold
**The Grove's Entrance** · *Internal infrastructure*

A threshold is the boundary you cross when entering a new space—the moment between outside and in. In nature, it's where the canopy first closes overhead, where field becomes forest. You don't think about the threshold when you cross it. You only notice you've arrived somewhere new.

Threshold is the first thing every visitor encounters at `*.grove.place`. It sees where you're going—`autumn.grove.place`, `meadow.grove.place`, `heartwood.grove.place`—and carries you there. You don't interact with Threshold. You pass through it, and find yourself home.

*The boundary you cross to enter the grove.*

---

## Alternative: Verge

If Threshold feels too architectural:

### Verge
**The Grove's Edge** · *Internal infrastructure*

The verge is where the grass meets the trees—the last step before you're under the canopy. It's the boundary you might not notice, the soft transition from outside to in. Every forest has a verge. Most people walk right through without thinking about it.

Verge is the invisible layer that welcomes every visitor to `*.grove.place`. It reads where you're headed, determines which part of the grove you belong in, and sends you on your way. Like the verge of a forest, you pass through it without pausing—and suddenly, you're home.

*The edge that welcomes you in.*

---

## Decision Point

Both work. My gut says:

**Threshold** — More universal, stronger "crossing over" connotation
**Verge** — More nature-specific, softer feeling

I lean toward **Threshold** because:
1. It emphasizes the *crossing*, the *entry*
2. It has the architectural meaning too, which fits—the router IS infrastructure
3. "Crossing the threshold" is a recognized phrase

But **Verge** might fit better with Grove's softer, nature-first voice.

---

## Questions for the Wayfinder

1. Does **Threshold** feel right? Or too door-like?
2. Is **Verge** a better fit for Grove's voice?
3. Are there other candidates I should explore?
4. Does the router need a public name at all, or only an internal one?

---

## Plot Twist: Names Already Taken!

**Threshold** — Already used for Grove's rate limiting SDK! Can't reuse.
**Verge** — The Verge is a major tech publication. Trademark concerns.

Back to the walk. Looking for names *nearby* Verge—same vibe (edge, boundary, entry point), different word.

---

## Exploring the Edge Family

Words that mean "edge" or "boundary" in nature:

### Margin
Where forest meets field. The space between.

> "The Margin is where you enter the grove."

*The margin—where one world ends and another begins.*

- Sounds bookish (margin of a page)
- But also ecological: "forest margin" is a real term
- Feels liminal, transitional

### Fringe
The outer edge. Where the trees thin out.

> "Through the Fringe, into the grove."

*The fringe—the soft edge where the forest begins.*

- Very nature-specific
- "Fringe benefits" might confuse
- Has a "outsider" connotation too

### Brink
The edge before a drop or change.

> "At the Brink of the grove."

*The brink—the last moment before everything changes.*

- Strong dramatic feeling
- Maybe too intense? "On the brink" sounds dangerous
- Works for transformation moment though

### Hem
The border. Like the hem of a garment, or the hem of a forest.

> "The Hem welcomes you in."

*The hem—where the grove's edge meets the world.*

- Unusual, evocative
- "Forest hem" isn't common, but it's beautiful
- Soft, textile feeling—like the grove is wrapped around you
- Short, memorable

### Brim
The edge of a container, or where water meets land.

> "At the Brim of the grove."

*The brim—where you step into something deeper.*

- Usually about cups or hats
- Has a "full to the brim" connotation
- Not quite right

### Sill
The base of a window or doorway. Where you step over.

> "Cross the Sill into the grove."

*The sill—the last step before you're home.*

- Architectural (window sill, door sill)
- But also: "mountain sill" (geological)
- Short, unusual

### Border
The boundary between two areas.

> "The Border welcomes you."

*Cross the border. You're home now.*

- Too political/geographical
- Implies separation, not welcome

### Selvage / Selvedge
The finished edge of fabric that prevents unraveling. In ecology: the edge of a forest.

> "The Selvage guides you in."

*The selvage—the grove's woven edge.*

- Beautiful, unusual
- Very textile/craft feeling
- "Selvedge denim" might confuse
- Poetic but obscure

---

## Testing the Top Candidates

### Margin
> "Margin is the invisible layer between the world and the grove. Every visitor passes through."

Works. Feels academic but also liminal.

### Fringe
> "Fringe is where you first touch the grove—the soft boundary before you're truly inside."

Nice. Nature-forward. "Fringe" has good vibes.

### Hem
> "Hem is the grove's edge, soft and welcoming. You step through, and you're wrapped in the forest."

Beautiful. Unusual. Memorable.

### Sill
> "Sill is the last step before you enter. Cross it, and you're home."

Strong. Architectural but evocative.

---

## Walking Through with Each

*I type `autumn.grove.place`.*
*I'm outside the grove.*
*I arrive at... the **Margin**.*
*The Margin sees where I'm headed, and lets me through.*

Hmm. "Margin" feels too academic.

*I arrive at... the **Fringe**.*
*The Fringe recognizes my destination and sends me deeper.*

"Fringe" is good! But feels like I'm staying at the edge.

*I arrive at... the **Hem**.*
*The Hem unfolds, and I'm wrapped in the grove.*

Oh. That's nice. "Hem" has a soft, embracing quality.

*I arrive at... the **Sill**.*
*I step over the Sill, and I'm inside.*

"Sill" is clear and functional. Less poetic than Hem.

---

## New Favorite: Hem

**Hem** has something special:

1. **Unusual** — Not an overused word
2. **Soft** — Evokes fabric, wrapping, comfort
3. **Edge** — It IS an edge, but a protective one
4. **Short** — One syllable, easy to say
5. **Visual** — You can imagine the grove's hem, like the edge of a cloak

The hem of a garment:
- Finishes the edge
- Protects against fraying
- Defines where the fabric ends

The hem of a grove:
- Finishes the boundary
- Protects against the outside
- Defines where the forest begins

> "Step past the Hem. You're home now."

---

## Writing the Entry for Hem

### Hem
**The Grove's Edge** · *Internal infrastructure*

A hem is the finished edge of fabric—the border that keeps everything from unraveling. In nature, it's where the grove meets the world: the soft boundary of trees thinning to meadow, the last row of pines before open sky.

Hem is the invisible layer every visitor passes through when they arrive at `*.grove.place`. It sees your destination, recognizes where you belong, and carries you there. You don't notice the Hem. You just step past it and find yourself wrapped in the grove.

*The edge that holds everything together.*

---

## Testing the Tagline

> "Hem is where you enter the grove."

Works.

> "Hem welcomes you into the grove."

Good, warm.

> "Step past the Hem. You're home."

Love it.

---

## Comparison: Hem vs Fringe

| Aspect | Hem | Fringe |
|--------|-----|--------|
| Meaning | Finished edge, protective border | Outer edge, where things thin out |
| Feeling | Warm, wrapping, protective | Wild, liminal, transitional |
| Associations | Fabric, completion, home | Outsiders, margins, alternatives |
| In a sentence | "Step past the Hem" | "Through the Fringe" |
| Nature fit | Forest edge as protective border | Forest edge as gradual transition |

I prefer **Hem** because:
1. It's warmer—the grove wraps around you
2. It's about *belonging*, not being on the outside
3. It's more unusual (no "fringe benefits" confusion)
4. It suggests the grove is *complete*, with a finished edge

---

## Final Candidates Ranked

1. **Hem** — Warm, protective, unusual, perfect
2. **Fringe** — Good fallback, more nature-forward
3. **Sill** — Clear and functional, less poetic
4. **Margin** — Academic, liminal, but cold

---

## Questions for the Wayfinder (Updated)

1. Does **Hem** feel right? The soft, finished edge of the grove?
2. Or is **Fringe** more natural for Grove's voice?
3. Any other edge-words I should consider?

---

## New Direction: Abstract Geometry

*"Think of Escher. Think of Monument Valley."*

The Wayfinder wants something more **abstract**—not the literal edge of a forest, but the *impossible geometry* of connection. The serene paradox where paths shouldn't connect, but do.

### What Makes Escher/Monument Valley Special

1. **Impossible connections** — Stairs that loop forever, paths that meet themselves
2. **Perspective shifts** — Rotate the view, reveal a new path
3. **Serene paradox** — Impossible, but peaceful, not chaotic
4. **Sacred geometry** — Mathematical, but reverent
5. **The "oh!" moment** — When you realize the path was always there

### What the Router Really Is (Abstractly)

The router takes you from `autumn.grove.place` to Autumn's blog.

But that's not travel. It's not walking a path.
It's... **space reorganizing around your intention**.

You don't go to the blog. The blog *comes to you*.
Or rather: the distance between you and the blog... *folds away*.

---

## Exploring Impossible Geometry

### Fold
Where space bends to meet itself. Two distant points touch.

> "Space folds to bring you home."

In Escher's work, folds create impossible staircases. In Monument Valley, paths fold onto each other when you shift perspective. The Fold is gentle but mathematical—a wrinkle in space that connects what shouldn't connect.

*You don't travel the distance. The distance travels to you.*

### Seam
The invisible join between two fabrics, two spaces.

> "Cross the Seam. You're home."

A seam connects what was separate. When it's well-made, you don't even notice it's there—the two pieces become one. The router is the seam between the outside internet and the grove.

*Invisible when done well. Essential to everything.*

### Arc
A curve through space. Not a straight line, but a bend.

> "The Arc carries you home."

An arc is geometry, but also narrative (a story arc). It's the path that curves from here to there, the electrical arc that connects two points instantly. The Arc doesn't go around obstacles—it transcends them.

*The curve that makes the impossible possible.*

### Twist
The rotation that reveals a hidden path.

> "The Twist shows you the way."

In Monument Valley, you twist the world to reveal paths that weren't visible before. The Twist is the moment of perspective shift, when the impossible becomes obvious.

*Turn. Look again. The path was always there.*

### Hinge
The point around which everything pivots.

> "The Hinge swings you into the grove."

A hinge is where doors rotate, where change happens. It's the mechanism of transition—small, almost invisible, but essential.

*The pivot that opens every door.*

---

## Walking Through with Abstract Names

*I type `autumn.grove.place`.*
*I'm outside—in the vast, chaotic internet.*
*Space... **folds**.*
*What was far is suddenly near.*
*I'm at Autumn's blog. I didn't travel. The grove came to me.*

Yes. **Fold** has something.

---

*I type `meadow.grove.place`.*
*There's a **seam** between here and there.*
*I cross it without noticing.*
*Suddenly I'm in the Meadow.*

**Seam** is good but less magical.

---

*I type `heartwood.grove.place`.*
*The **Arc** bends around me.*
*I'm carried through the curve of impossible space.*
*I arrive at authentication.*

**Arc** is elegant but feels like movement, not transformation.

---

*I type `autumn.grove.place`.*
*The world **twists**—just slightly.*
*A path appears that wasn't there before.*
*I step through. Home.*

**Twist** captures the Monument Valley feeling perfectly!

---

## Comparing the Abstract Candidates

| Name | Escher Vibe | Monument Valley Vibe | Feeling | Issues |
|------|-------------|---------------------|---------|--------|
| **Fold** | ✓ Folded space | ✓ Paths meeting | Gentle transformation | None obvious |
| **Seam** | ~ Joining | ~ Hidden connection | Invisible craft | Less magical |
| **Arc** | ~ Curves | ✓ Curved paths | Elegant motion | Feels like travel |
| **Twist** | ✓ Impossible rotation | ✓ Perspective shift | Revelation | Could sound negative? |
| **Hinge** | ~ Pivot point | ~ Mechanism | Functional | Too mechanical |

---

## Deep Dive: Fold vs Twist

### Fold
**What it means:**
- Paper folding (origami)
- Space folding (sci-fi, but gentle)
- Where two surfaces touch
- A wrinkle in reality

**The vibe:**
- Gentle, quiet
- Mathematical but soft
- "The Fold" sounds almost sacred
- Connections that transcend distance

**Taglines:**
- *"Space folds to bring you home."*
- *"The Fold—where distance disappears."*
- *"Through the Fold, into the grove."*

### Twist
**What it means:**
- Rotation, perspective shift
- The moment when things click into place
- Turning to reveal what was hidden
- Escher's twisted staircases

**The vibe:**
- Active, revelatory
- The "aha!" moment
- More dynamic than Fold
- "The Twist" sounds like a dance move or a plot twist

**Taglines:**
- *"The Twist reveals the way."*
- *"Turn. The path was always there."*
- *"Through the Twist, into the grove."*

**Concern:** "Twist" might have a negative connotation (plot twist, arm twist, twisted logic). Is that a problem?

---

## Another Angle: What Monument Valley Actually Does

In Monument Valley, you don't "twist" anything. You **rotate** the world, and paths **appear** or **connect**.

The key action is: **paths that shouldn't connect, do.**

What word captures "impossible connection"?

- **Link** — Too technical
- **Bond** — Too chemical
- **Join** — Too plain
- **Meet** — Where things meet
- **Touch** — Where distant things touch

Hmm. What about focusing on the *space* where the connection happens?

- **Crux** — The critical point
- **Nexus** — Where all things connect
- **Node** — A connection point
- **Vertex** — Where edges meet

**Crux** is interesting:
- "The Crux of the matter"
- The essential point
- Where things come together
- Latin for "cross"

> "The Crux connects you to your tree."

Hmm. Feels a bit intense.

---

## What About Pure Geometry?

Escher and Monument Valley are fundamentally about **geometry defying expectation**.

- **Plane** — A flat surface (too technical)
- **Angle** — Where lines meet (too sharp)
- **Curve** — A bend in space (soft, interesting)
- **Tangent** — Where a line touches a curve (mathematical)
- **Vector** — Direction and magnitude (too physics)

**Tangent** has something:
- The moment of touching
- A line that brushes against a curve
- Also: going off on a tangent (a digression)

> "The Tangent touches you to the grove."

Eh, too abstract.

---

## Returning to Fold

I keep coming back to **Fold**.

It captures:
1. **Escher** — Folded, impossible spaces
2. **Monument Valley** — Paths that connect through dimension
3. **Gentleness** — A fold is soft, not violent
4. **Transformation** — Space itself changes, not you

### Writing the Entry for Fold

**Fold**
*Where space bends to meet itself* · *Internal infrastructure*

A fold is where distant points touch. In origami, a single fold can turn flat paper into a crane. In geometry, a fold in space brings far things near. You don't cross the distance—the distance folds away.

Fold is the impossible geometry at the heart of the grove. When you type `autumn.grove.place`, space folds. What was across the internet is suddenly here. You don't travel to your destination; the grove rearranges itself around your intention. An Escher staircase that somehow takes you exactly where you meant to go.

*The distance folds. You're home.*

---

## Testing Other Abstract Options

### Warp
Where space itself bends.

> "The Warp carries you through."

Pros: Very Escher, very spatial
Cons: Star Trek vibes, aggressive

### Crease
The line where a fold happens.

> "Cross the Crease into the grove."

Pros: More specific than Fold
Cons: Sounds like wrinkled fabric, less magical

### Pleat
A deliberate, designed fold.

> "The Pleat welcomes you in."

Pros: Intentional, crafted
Cons: Sounds like a skirt

### Rift
An opening, a gap in space.

> "Through the Rift, into the grove."

Pros: Dramatic, spatial
Cons: Too aggressive, implies damage

### Slip
Sliding between spaces.

> "Slip into the grove."

Pros: Gentle, quiet
Cons: Might sound like a mistake ("a slip")

---

## Final Abstract Candidates

1. **Fold** — Where space bends to meet itself. Gentle, mathematical, impossible.
2. **Twist** — The rotation that reveals the hidden path. Active, revelatory.
3. **Seam** — The invisible join. Craft-forward, but less magical.
4. **Arc** — The curve of connection. Elegant, narrative.

---

## The Decision Leans Toward... Fold

**Fold** feels right because:

1. It's **abstract** — Pure geometry, not a physical place
2. It's **gentle** — A fold is soft, welcoming
3. It's **impossible** — Folded space shouldn't exist, but does
4. It's **transformative** — Space changes, not you
5. It's **short** — One syllable, memorable
6. It's **evocative** — "The Fold" sounds almost mystical

> *"Step through the Fold. The grove is already here."*

---

## Questions for the Wayfinder (Abstract Edition)

1. Does **Fold** capture the Escher/Monument Valley vibe?
2. Is **Twist** more evocative of that perspective-shift magic?
3. Should we explore more purely geometric terms?
4. Or is there a word from Monument Valley itself that resonates?

---

## The Final Walk: Prismatic Abstractions

After pushing for more abstract, prismatic, Escher-like names:

### Candidates Explored

- **Parallax** — Perspective shift reveals hidden paths (very Monument Valley)
- **Refract** — Light bending through a prism, splitting into spectrums
- **Transmute** — Alchemical transformation, lead to gold
- **Transpose** — Musical key change, same shape different position
- **Diffract** — Bending around obstacles
- **Sublimate** — Skipping intermediate states

**Parallax** was the closest to Monument Valley's feeling, but...

---

## The Decision: Passage

The Wayfinder's insight: Parallax is gorgeous but too abstract for everyday use.

> *"Saying 'we're gonna take you through the Passage to your Arbor panel' sounds elegant. 'Cross the Parallax' sounds complicated."*

**Passage** wins because:

1. **Hidden passages** — The architectural secret of impossible spaces
2. **Monument Valley IS about passages** — Finding the hidden way through impossible geometry
3. **Natural language** — "Through the Passage" flows naturally
4. **Simple but evocative** — Not too abstract, not too plain
5. **Warm** — A passage welcomes you through

---

## Final Entry

### Passage
*The hidden way through* · *Internal infrastructure*

A passage is a way through—a corridor connecting spaces that seem separate. In impossible architecture, passages are the secret: rotate the structure, and a passage appears where none existed. The geometry shouldn't allow it. The passage doesn't care.

Passage is how the grove makes the impossible feel inevitable. One domain, infinite destinations. Type `autumn.grove.place` and Passage carries you through—not around the complexity, but *through* it, as if the walls were never there. The architectural barriers that should block you become the corridor that welcomes you home.

*The way through was always there. Passage just reveals it.*

---

## Implementation Checklist

- [ ] Rename `packages/grove-router/` → `packages/passage/`
- [ ] Update `wrangler.toml` worker name
- [ ] Update imports and references across codebase
- [ ] Add entry to `docs/philosophy/grove-naming.md`
- [ ] Create help center article: "What is Passage?"

---

*Journey completed: 2026-01-25*
*Decision: **Passage** — the hidden way through*
