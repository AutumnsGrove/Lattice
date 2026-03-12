# Naming Journey: The Beats Equivalent

> _Finding a name for lightweight content type markers in Meadow_
> _Inspired by Simon Willison's "beats" — story beats in a timeline_

---

## What Are We Naming?

Simon built "beats" — lightweight activity markers that aggregate his work
across different platforms into his main blog timeline. Each beat is a
badge + link. Not a full post. More like "hey, this happened over there."

The problem in Meadow: **blooms and notes look exactly the same.** Same card.
Same visual weight. Same layout. A full blog post (bloom) sits next to a
quick thought (note) and they're indistinguishable at a glance. There's no
rhythm to the feed.

We need:
1. A way to visually differentiate content types
2. A new lightweight content type for activity signals — link shares,
   garden updates, cross-references, "I just published this elsewhere"
3. Something that could extend into individual gardens too

---

## Step 3: Visualize the Grove

```
                           ☀️
                        🌲   🌲   🌲
                     🌲    🌳    🌲
                  🌲   🌲    🌲   🌲

    ════════════════════════════════════════════
    |  CANOPY - directory, see who's here     |
    ════════════════════════════════════════════

         ┌─────────────────────────────┐
         │        M E A D O W          │
         │   the open social space     │
         │                             │
         │  🌸 bloom (full post)       │
         │  🌸 bloom (full post)       │  ← these all look
         │  📝 note (quick thought)    │  ← exactly the same
         │  🌸 bloom (full post)       │  ← right now
         │  📝 note (quick thought)    │
         │  ??? (link share)           │  ← what goes here?
         │  ??? (garden update)        │
         │                             │
         └─────────────────────────────┘

    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ GARDEN   │  │ GARDEN   │  │ GARDEN   │
    │ autumn's │  │ dave's   │  │ alex's   │
    │ blooms   │  │ blooms   │  │ blooms   │
    │ + ???    │  │ + ???    │  │ + ???    │
    └──────────┘  └──────────┘  └──────────┘

    ════════════════════════════════════════════
               ROOTS CONNECT BENEATH
                (mycelium network)
    ════════════════════════════════════════════
```

Where Heartwood lives: deep in the trunk (identity/auth)
Where Ivy climbs: connecting the branches (email)
Where Pantry sits: warm kitchen in the cabin (shop)
Where Meadow opens: the clearing where everyone gathers

---

## Step 4: What IS This Thing?

### What is it, fundamentally?

It's NOT a place. It's not a service. It's a **content type** — a kind
of thing that appears in the feed. Like how blooms are flowers and notes
are birdsong, this is...

It's the *ambient activity* of the meadow. The things that happen between
the big moments. A butterfly passing through. A breeze carrying a seed
from one garden to another. The soft background hum of a living ecosystem.

### What does it DO in the user's life?

- **Signal** — "I did a thing, here's where"
- **Connect** — cross-reference between gardens, external links
- **Breathe** — give the feed rhythm, variety, visual texture
- **Share** — pass along something worth seeing without writing about it

### What emotion should it evoke?

- **Lightness** — not heavy, not demanding attention
- **Aliveness** — the feed feels like a living, breathing place
- **Connection** — threads between gardens, between the grove and the wider web
- **Rhythm** — the feed has a heartbeat, not just a wall of cards

---

## Step 5: Walking Through...

I enter the grove. I walk into the Meadow where others gather.

I see Bloom cards — full posts from people's gardens, with titles and
excerpts and images. Rich, substantial. Someone spent time writing that.

I see Notes — quick thoughts, reactions, a sentence or two. Lighter,
but still... they look the same as the blooms? A note about what
someone had for lunch sits in the same visual container as a 2000-word
essay. That feels wrong.

Now I want to share a link. I found an article about solarpunk
architecture and I want to drop it in the meadow. I don't want to
write a note about it — that would make it about ME. I want to
share the THING. A quick "hey, look at this."

Or: I just published a new bloom in my garden about queer identity
in tech. The RSS poller will eventually syndicate it as a bloom in
Meadow. But what if I also want a lightweight signal — "new bloom
in autumn's garden" — that appears alongside it?

Or: I updated my about page. I reorganized my garden. I added a
new collection. These are small stirrings of activity. Not worth
a full post. Not even worth a note. But they're signs of life.

**What am I looking for?**

Something that sits BETWEEN the blooms. Something lighter. Something
that says "life is happening here" without demanding you stop and read.

In a real meadow, what are the small signs of life between the flowers?

- Butterflies passing through
- Seeds drifting on the wind
- Dewdrops catching light
- Insects humming
- **Rustling** in the grass
- The soft sound of movement
- Pollen carried between flowers
- Small birds darting
- Leaves turning
- **Stirring** in the undergrowth

---

## Step 6: Candidates

### 1. **Rustle**

- *What it means in nature:* The soft sound of movement through grass,
  leaves, wind. You hear it but don't always see the source. Life
  happening just beneath the surface.
- *Why it fits:* Rustles are the ambient activity of a meadow. Not the
  flowers (blooms), not the birdsong (notes), but the constant soft
  evidence that something is alive and moving. You don't stop to examine
  a rustle. You just feel it.
- *The vibe:* Gentle. Background. Alive. Not demanding.
- *Potential issues:* Could feel too ephemeral? "I left a rustle" sounds
  a bit odd. But "there's a rustle in the meadow" works beautifully.

### 2. **Stir**

- *What it means in nature:* A gentle disturbance. Something moves.
  The air shifts. A creature wakes. The meadow stirs at dawn.
- *Why it fits:* A stir is smaller than an event but more intentional
  than background noise. "The meadow is stirring" = things are happening.
  A stir can be user-created (shared a link) or automatic (updated garden).
- *The vibe:* Warm. Quiet. The first sign of morning.
- *Potential issues:* "Stir" might be too generic outside the Grove context.

### 3. **Drift**

- *What it means in nature:* Seeds drift on the wind. Snow drifts.
  Pollen drifts between flowers. Things carried gently from one place
  to another.
- *Why it fits:* Perfect for link shares and cross-references — content
  drifting from one garden to another, or from the wider web into the
  meadow. Captures the "lightweight signal" aspect.
- *The vibe:* Effortless. Floating. Unhurried.
- *Potential issues:* "Aimless" connotation? But in nature, drift is
  purposeful — it's how forests spread.

### 4. **Flutter**

- *What it means in nature:* A butterfly moving through the meadow.
  Quick, colorful, catching your eye for a moment before it's gone.
- *Why it fits:* Visual — a flutter in the feed catches your eye but
  doesn't demand you stop. Butterflies are pollinators — they carry
  things between flowers. Like sharing links.
- *The vibe:* Quick. Bright. Joyful.
- *Potential issues:* Might feel too Twitter-like? Flutter → tweet adjacency.

### 5. **Murmur**

- *What it means in nature:* A murmuration of starlings. The low
  sound of wind through pines. A brook murmuring over stones.
- *Why it fits:* Murmurs are the collective sound of small things
  happening. A feed full of murmurs = a living meadow. Not silence.
  Not shouting. Just the warm background hum.
- *The vibe:* Intimate. Collective. Warm.
- *Potential issues:* Reeds already occupies "whispering" territory.
  "I left a murmur" is a stretch.

### 6. **Trace**

- Already taken in the ecosystem (inline feedback component).

### 7. **Pollen**

- *What it means in nature:* The thing flowers produce to reproduce.
  Carried by wind, bees, butterflies between flowers. Cross-pollination.
- *Why it fits:* Pollen is literally the thing that travels between
  blooms. Sharing a link = carrying pollen from one garden to another.
  "Pollen from autumn's garden." Beautiful.
- *The vibe:* Connecting. Spreading. Alive.
- *Potential issues:* Allergies. 😅 But in the Grove, pollen is good.

---

## The Walk Narrows

Three feel strongest:

**Rustle** — the ambient layer. The sound of life. Visually, a rustle
is something you glimpse in your peripheral vision. In the feed, it
would be a thin, badge-style item — not a full card. Just a soft signal.
"New bloom in autumn's garden." "Autumn shared a link." "Garden updated."

**Drift** — things carried between. Seeds, pollen, snowflakes. In the
feed, a drift is something that floated in from elsewhere. A link from
the wider web. A cross-reference from another garden. Content moving
gently through the meadow.

**Pollen** — the connector. What blooms produce. What gets carried.
What creates new life. In the feed, pollen is a share, a reference,
a "look at this." It literally comes FROM blooms. The metaphor is
almost too perfect.

---

## Step 7: Testing the Tagline

> "**Rustles** are where you **notice life happening.**"
> "A **rustle** is the **softest sign of life in the meadow.**"

> "**Drifts** are where you **find what floated in.**"
> "A **drift** is the **seed carried on the wind.**"

> "**Pollen** is where you **see what's spreading.**"
> "**Pollen** is the **thing that travels between blooms.**"

Hmm. Rustle works as a CONCEPT — the category, the vibe, the experience.
But as a content type name you'd see in a filter tab... "Rustles" next to
"Blooms" and "Notes"? That actually works.

"All | Blooms | Notes | Rustles | Popular | Hot"

Wait.

"All | Blooms | Notes | Rustles"

That's... kind of beautiful? Blooms are the flowers. Notes are birdsong.
Rustles are the sound of movement in the grass between them.

---

## The Moment

I keep coming back to **Rustle**.

Here's why:

The feed is a meadow. Right now it has two things: **blooms** (flowers
growing from the earth) and **notes** (birdsong in the air). But a real
meadow also has the constant gentle rustle — wind through grass, creatures
moving, leaves turning. Not the main event. The ambient life.

Rustles are the connective tissue. They don't demand attention. They
don't take up space. They just let you know: *something is alive here.*

A rustle could be:
- A shared link ("autumn rustled: check out this article")
- A garden update ("new bloom in autumn's garden")
- A cross-reference ("autumn mentioned your bloom")
- An activity signal ("autumn updated their about page")
- A lightweight share from outside the grove

In the UI, a rustle would render as a slim bar — maybe an icon + badge
+ one line of text + a link. Not a card. A whisper of activity between
the bigger moments.

And in a garden, rustles could appear between blooms — "3 links shared
this week" or "garden reorganized" — giving the blog itself rhythm
and texture.

---

## Step 8: The Entry

### Rustle

**The ambient life of the Meadow** · `meadow.grove.place`

In nature, a rustle is the softest evidence of life: wind shifting
through tall grass, a creature moving through the undergrowth, leaves
turning in a breeze you barely feel. You hear it before you see it.
You notice it without stopping. It's the constant, gentle proof that
the meadow is alive — between the blooms, beneath the birdsong.

A Rustle in Meadow is a lightweight activity marker. Where a Bloom
is a full garden flower (a blog post) and a Note is a clear tone in
the canopy (a quick thought), a Rustle is the soft movement between
them. A link shared. A garden updated. A bloom cross-referenced.
Activity that says *something is happening here* without demanding
you stop and read.

Rustles give the feed rhythm. Without them, a timeline is just
posts stacked on posts. With them, the meadow breathes.

> "I rustled a link into the meadow."
> "There's been a lot of rustling in autumn's garden."
> "Check the rustles — some good links today."

_The softest sign of life._

---

## Step 9: Conflict Check

- **Rustle** — not used anywhere in the codebase as a feature/service name
- No subdomain conflict (rustles live within Meadow, not a separate service)
- Doesn't sound like any existing name
- Spoken aloud: "rustle" — warm, soft, onomatopoetic. Natural.
- Verb form works: "to rustle" = to share something lightly
- Plural works: "rustles" = the collection of these in the feed

---

## Visual Weight Hierarchy

```
╔══════════════════════════════════════════╗
║  🌸 BLOOM                               ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║  Title: Why Solarpunk Matters            ║
║  From: autumn's garden                   ║
║                                          ║
║  The relationship between architecture   ║
║  and community has always been...        ║
║                                          ║
║  [featured image]                        ║
║                                          ║
║  ❤️ 🌱 ✨  ·  3 reactions  ·  2h ago    ║
╚══════════════════════════════════════════╝

┌──────────────────────────────────────────┐
│  🎵 NOTE                    — autumn     │
│                                          │
│  listening to hozier's new album and     │
│  thinking about forests. obviously.      │
│                                          │
│  ❤️ 🌱  ·  1 reaction  ·  45m ago       │
└──────────────────────────────────────────┘

╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
  🍃 autumn rustled · "Solarpunk
     Architecture and Queer Space" →
     link.example.com · 20m ago
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌

╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
  🌿 new bloom in autumn's garden →
     "Finding Home in Code" · 1h ago
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
```

Three visual weights:
- **Bloom:** Full card. Rich. Substantial. The main event.
- **Note:** Medium card. Lighter. Personal. A thought.
- **Rustle:** Slim bar. Minimal. A whisper of activity.

---

## Course Correction

**Rustle was the wrong trail.**

Not because the vibe was wrong — but because the QUESTION was wrong.
We were looking for a third content type. That's not what we need.

We need the **small indicator markers** on posts that tell you what
kind of thing you're looking at. The visual badge. The icon. The
system that differentiates a bloom from a note at a glance.

Simon's beats have category badges: "Release", "TIL", "Museum."
We need the same thing — but in Grove language. A name for this
system of small identifying marks.

---

## The Real Walk

### What IS This Thing? (Take Two)

It's not a content type. It's a **marking system.** The little
label or icon that appears on or near a post to identify it.

In nature, what are small identifying marks?

**On trails:**
- **Blazes** — colored marks painted on trees. A rectangle of paint
  that tells hikers: you're on the right trail. Blue blaze, white
  blaze, yellow blaze. Small, visible, purposeful.
- Cairns — stacked stones marking the path
- Waymarks — signs at trail junctions (but Waystone is taken)

**On creatures:**
- Plumage — a bird's distinctive coloring that says what it is
- Markings — the stripes on a bee, the spots on a fawn
- Crests — the raised feathers on a bird's head

**On trees/plants:**
- Bark patterns — how you identify a birch vs an oak
- Leaf shapes — maple, oak, elm, each distinct
- **Rings** — already taken (analytics)
- Burls — distinctive growths
- Thorns — already taken (moderation)

**On the forest floor:**
- Tracks — animal prints that tell you who passed by
- Scat — no
- Spoor — the trail left behind

**In a garden:**
- Stakes — labels stuck in the ground by each plant
- **Tags** — the little labels tied to branches in a nursery
- Markers — identifying labels on seedlings
- **Tabs** — the plastic labels in seed trays

### What does it DO?

- **Identifies** — tells you WHAT something is
- **Differentiates** — makes a bloom look different from a note
- **Signals** — quick visual read of content type
- **Orients** — you know what you're looking at without reading

### What emotion should it evoke?

- **Clarity** — instant recognition
- **Belonging** — each type has its own identity
- **Craft** — the care of someone who labeled their garden

---

## Walking Through... (Take Two)

I enter the meadow. I see posts in the timeline.

But now each one has a small mark on it. A tiny identifier.
Like the blazes on a trail — except instead of telling you
which TRAIL you're on, they tell you which KIND OF THING
you're looking at.

A bloom has a 🌸 and the word "Bloom" — or maybe just the icon.
A note has a 🎵 — one clear tone.
A shared link has... something else. A different mark.

These marks are the visual rhythm of the feed. Without them,
everything blurs together. With them, your eye can skim and
sort: *bloom, note, note, link, bloom, update, note...*

In a real forest, what does this?

A naturalist walking through a meadow identifies what they see
by small distinguishing features. The shape of a petal. The
color of a stem. The pattern on a wing. These aren't labels
someone stuck on — they're PART of the thing. Inherent
identifying marks.

But in a GARDEN — a tended, cultivated space — the gardener
puts small labels in the soil next to each plant. A stake,
a tag, a marker. So visitors know what they're looking at.

The meadow IS a garden. We're the gardeners. The marks are ours.

---

## Candidates (Round Two)

### 1. **Blaze**

- *What it means:* A trail blaze — a painted mark on a tree
  trunk that identifies which trail you're on. Hikers follow
  blazes through dense forest. Each trail has its own color.
- *Why it fits:* Blazes are EXACTLY this — small identifying
  marks in a forest that tell you what you're looking at.
  "Bloom blaze." "Note blaze." Each content type gets its
  own blaze (icon + label).
- *The vibe:* Outdoorsy. Purposeful. Clear.
- *Usage:* "Each post has a blaze showing its type."
  "The bloom blaze is a flower icon."
- *Issues:* "Blaze" carries fire connotations. Also cannabis
  slang. The trail marking meaning might not land for everyone.

### 2. **Sprig**

- *What it means:* A small shoot or twig. A tiny piece of a
  plant — often used decoratively. A sprig of rosemary. A
  sprig of holly. Small, identifying, distinctive.
- *Why it fits:* Sprigs are small, visual, and identifying.
  A sprig of lavender tells you it's lavender. A sprig of
  rosemary tells you it's rosemary. Each content type gets
  a sprig — a small visual identifier.
- *The vibe:* Delicate. Decorative. Botanical. Warm.
- *Usage:* "The bloom sprig is a flower." "Note sprig."
  "Each post wears its sprig."
- *Issues:* Slightly precious? But Grove IS precious in the
  best way. "Sprig" is warm and crafty.

### 3. **Mark**

- *What it means:* The simplest word. A mark on a tree. A
  mark on a trail. A distinguishing mark.
- *Why it fits:* Direct, clear, functional. "Content marks."
  "Post marks." "Each type has its mark."
- *The vibe:* Clean. Honest. Unpretentious.
- *Issues:* Very generic. Doesn't feel Grove-y. "Mark" is
  what you'd call it if you weren't trying to call it anything.

### 4. **Crest**

- *What it means:* The distinctive plumage on a bird's head.
  A cardinal's red crest. A jay's blue crest. The thing that
  identifies a bird at a distance.
- *Why it fits:* Crests are nature's content type indicators.
  They say "I'm a cardinal" before you even see the rest of
  the bird. Quick identification at a glance.
- *The vibe:* Noble. Distinctive. Visible.
- *Usage:* "The bloom crest is a flower." "Each post shows
  its crest." "Crested with a note icon."
- *Issues:* "Crest" also means peak/summit and has heraldic
  associations. Could feel too formal.

### 5. **Tag**

- *What it means:* In a nursery or garden center, each plant
  has a small tag tied to it — species, care instructions,
  a tiny identifier.
- *Why it fits:* Tags are the garden equivalent of content
  type indicators. Simple, small, informative.
- *The vibe:* Practical. Familiar. Gardener-y.
- *Issues:* "Tag" is extremely overloaded in tech (HTML tags,
  hashtags, tagging users). Might not feel distinctive enough.

### 6. **Pip**

- *What it means:* A small seed inside a fruit. Also: a small
  spot on a playing card or die. Also: the short high-pitched
  tone of a time signal.
- *Why it fits:* Pips are TINY. The smallest meaningful mark.
  In a fruit, the pip is what identifies it — an apple pip, an
  orange pip. Small, identifying, essential.
- *The vibe:* Tiny. Bright. Quick.
- *Usage:* "The bloom pip shows a flower." "Note pip."
  "Each post has its pip."
- *Issues:* Might feel too small/trivial? But that might be
  exactly right for a tiny indicator.

---

## Sensing the Trail

I'm drawn to two different vibes here:

**Sprig** is the warm, crafty, botanical option. It feels like
something a gardener would do — pin a little sprig to each post
so you know what kind of plant it is. "A sprig of bloom." "A
sprig of note." It's decorative AND functional.

**Blaze** is the trail-marker option. More rugged, more functional.
"Follow the bloom blazes." "Note blaze." It's about wayfinding
in the forest — which connects to Wayfinder, Waystone, the whole
trail-marking infrastructure.

---

## Testing the Tagline (Round Two)

> "Every post wears its **sprig** — a small mark that says what it is."
> "A **sprig** is the tiny identifier pinned to each post in the meadow."

> "Every post carries its **blaze** — the mark that says what trail it belongs to."
> "A **blaze** is the trail marker painted on each post."

---

## The Moment (Take Two)

**Blaze.**

A trail blaze — the small painted mark on a tree trunk that tells
hikers which trail they're on. Blue blaze, white blaze, yellow blaze.
You don't stop to read a blaze. You glance at it and keep walking.
It orients you instantly.

In the Meadow, every post carries its blaze: a small icon + label
that identifies the content type at a glance. The bloom blaze says
"this is a full post." The note blaze says "this is a quick thought."
Future content types get their own blazes too.

The word connects to the wayfinding language already in Grove:
Wayfinder, Waystone, Wanderer, Trails. Blazes are how you navigate
the forest. Of course they are.

Previous naming journeys considered "blaze" for voice transcription
(chose Scribe) and for roadmaps (chose Trails). It was always waiting
for the right thing. Small identifying marks on trees in the forest.
That's what it always was.

---

## Step 8: The Entry

### Blaze

**The mark that says what it is** · _Part of Meadow_
**Standard:** Content Type Badge
**Waystone:** The small icon and label on each post that tells you
what kind of content it is — a bloom, a note, or something else.

A trail blaze is a painted mark on a tree — a small rectangle of
color that tells hikers which path they're on. You don't read it.
You glance. Blue blaze, white blaze, yellow blaze. Keep walking.
The blaze isn't the destination. It's the mark that keeps you
oriented in the forest.

Blazes in Meadow are the small content type indicators on each post.
An icon and a word — or sometimes just the icon — that tells you
at a glance: this is a Bloom (a full post from someone's garden),
this is a Note (a quick thought), this is something else entirely.
Without blazes, the feed is a wall of identical cards. With them,
your eye finds rhythm. You can skim, sort, and navigate.

The Wayfinder marks the trails. The blazes show you what you're
looking at.

> "Every post wears its blaze."
> "The bloom blaze is a flower."

_A small mark that tells you everything._

---

## Step 9: Conflict Check

- **Blaze** — explored in previous naming journeys (Scribe, Trails)
  but never claimed. Available.
- Not in the ecosystem table. No subdomain needed (part of Meadow).
- Previous journeys noted cannabis slang concern; in the context of
  a visual indicator system within a forest-themed platform, the
  trail-blazing meaning is clear and dominant.
- Connects naturally to existing wayfinding language: Wayfinder,
  Waystone, Wanderer, Trails.
- Spoken aloud: "blaze" — short, clear, memorable.
- Plural works: "blazes" — "the blazes on each post."
- As adjective: "blazed" — "each post is blazed with its type."

---

_Journey completed: February 21, 2026_
_We walked the wrong way, turned around, and found it waiting._
_A small mark on a tree. Of course._
