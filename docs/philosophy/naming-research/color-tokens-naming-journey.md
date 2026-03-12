---
title: "Color Tokens"
description: "Finding a Grove name for the color token system powering the design system"
category: philosophy
subcategory: naming-research
lastUpdated: "2026-03-12"
---

# Naming Journey: Color Tokens

> Finding a Grove name for our color token system — the raw palette that everything visual grows from.

---

## What Are We Naming?

The color tokens live in `libs/foliage/src/lib/tokens/colors.ts`. They are:

```
grove    — the green scale (50–950), primary: grove[600]
cream    — warm off-whites (50–500), backgrounds
bark     — earthy browns (50–950), text and structure
semantic — purpose-mapped: primary, secondary, muted, accent, border
status   — success (green), warning (amber), error (red), info (blue)
```

Together they form the **color vocabulary** of the entire design system. Every theme
in Foliage (grove, cozy-cabin, night-garden, ocean, etc.) composes from these tokens.
They're the raw pigments, the fundamental hues, the DNA of every visual surface in Grove.

The token names themselves are already forest-language: `grove`, `cream`, `bark`.
What we need is a NAME for the collection — the system itself.

---

## Visualizing the Grove

```
                        ☀ ─── sunlight enters
                       / | \
                   🌿  🌿  🌿  🌿     ← FOLIAGE (themes — what you see)
                  /    |    |    \
                ·  · ·  ···  · ·  ·    ← ??? (color tokens — how it looks)
               ─────────────────────
              🪵  bark   cream   grove   ← the named scales
             ─────────────────────────
                    LATTICE
              (the framework beneath)
```

The tokens sit BETWEEN the themes and the framework. Foliage is the canopy —
the visible personality. Lattice is the trellis — the structure. The tokens are
the **color** that makes the canopy look the way it does.

What is the natural word for "the colors that appear when light hits foliage"?

---

## What IS This Thing?

**What is it, fundamentally?**
- It's a palette — a set of raw colors
- It's a vocabulary — named scales that everything references
- It's an object? A feature of the tree? A process?

It's closest to a **feature of the tree** — like how bark has texture, leaves have
color. The tokens are the pigmentation of the grove itself.

**What does it DO in a developer's life?**
- Defines the foundational colors
- Gets referenced by themes, components, utilities
- Ensures visual consistency across everything

**What does it DO in the user's life?**
- They never see it directly
- It's the reason their grove "feels" warm
- It's why the greens are THIS green and the creams are THIS cream

**What emotion should it evoke?**
- Warmth (the palette IS warm — creams, earthy browns, forest greens)
- Consistency (everything draws from the same well)
- Natural beauty (the colors of a real forest)

---

## Walking Through...

I enter the grove. I see...

The first thing I notice isn't any one color. It's the QUALITY of color.
The warm green of the canopy above. The soft cream of light filtering through.
The deep brown of bark on ancient trees. Everything feels cohesive — not because
someone designed it, but because it all grew from the same soil.

I look up. Sunlight breaks through the leaves and creates patches of color
on the forest floor. Some warm, some cool, some bright where the light hits
directly, some muted where the canopy is thick.

This is what I'm naming. Not the light. Not the leaves. The COLORS that emerge
when light and forest interact.

---

## Candidates

### 1. Dapple

**The patches of color where light breaks through foliage**

- In nature: Dappled light is sunlight filtered through a canopy — patches of
  warm color scattered across the forest floor. No two patterns are the same.
- Why it fits: The tokens are the specific colors that emerge when Foliage
  (themes) shapes the visual experience. Foliage IS the canopy. Dapple IS
  the color it creates.
- The vibe: Warm, specific, visual. You can SEE dappled light.
- "Reference the Dapple colors" ✓
- "What's in our Dapple?" ✓
- "Update the Dapple" ✓
- Concern: Dapple implies scattered/varied, which fits the multi-scale nature
  of the tokens. But does it feel too "light-specific" vs "color-specific"?

### 2. Lichen

**The prolific natural colorist of the forest**

- In nature: Lichen produces an incredible range of colors — vivid greens,
  warm oranges, rust reds, cool grays, bright yellows. It grows on bark,
  stone, fallen branches. Historically, lichens were THE source of natural dyes.
- Why it fits: Lichen is the thing in the forest that IS color. It's the
  artist. It produces the palette.
- The vibe: Subtle, ancient, ubiquitous. You don't notice lichen until you
  look closely, and then it's everywhere.
- "Reference the Lichen colors" — hmm, not as immediately intuitive
- "Update the Lichen" — could work but feels odd
- Concern: Lichen isn't intuitively "color" to most people. You'd have to
  explain the connection. A good Grove name shouldn't need explaining.

### 3. Prism

**Light split into its component colors**

- In nature: Sunlight through water droplets, rainbows in forest mist
- Why it fits: A prism reveals the hidden spectrum — it takes unified light
  and shows you what it's made of. That's what tokens do: they reveal the
  component colors that compose the visual experience.
- The vibe: Clean, recognizable, immediately says "colors"
- "Reference the Prism colors" ✓ (user's original instinct!)
- "Check the Prism" ✓
- "Our Prism defines the palette" ✓
- Concern: Prism is more scientific than forest. Glass object, optics lab.
  Though rainbow mist in a forest IS a prism effect...

### 4. Tincture

**Concentrated plant essence; also the heraldic term for colors**

- In nature: Herbal tinctures are concentrated extracts — the essential color
  and properties of a plant distilled into drops
- In heraldry: A "tincture" IS a color in a coat of arms (or, argent, gules...)
- Why it fits: The tokens are the concentrated essence of the grove's color.
  Distilled, potent, fundamental.
- "Reference the Tincture" — elegant but maybe too precious
- Concern: Too obscure. Most people don't know the heraldic meaning.

### 5. Pigment

**The substance that gives things color in nature**

- In nature: Chlorophyll (green), anthocyanin (red), carotenoid (orange),
  tannin (brown). The actual molecules that create color.
- Why it fits: The tokens literally ARE the pigments of the design system.
  The fundamental color substances.
- "Reference the Pigment" — clear but clinical
- Concern: Feels like a science textbook, not a forest walk.

---

## The Tagline Test

> "Dapple is where light becomes color."
> "Dapple is the color that Foliage casts."

> "Lichen is the palette the forest paints with."

> "Prism is where light finds its names."
> "Prism is the spectrum beneath every theme."

> "Tincture is the concentrated essence of the grove's palette."

> "Pigment is what gives the grove its color."

---

## The Moment

I keep coming back to two:

**Dapple** — because it's the most SPECIFIC forest-color word. It describes
exactly the phenomenon: color emerging from the interaction of light and foliage.
Foliage creates the Dapple. The metaphor is structurally correct.

**Prism** — because it's IMMEDIATELY understood. "The Prism colors" = "the color
system." Zero explanation needed. And the user reached for it first, which means
it already lives in the right part of the brain.

The tension: Dapple is more Grove. Prism is more clear.

But wait — let me reconsider Prism through the forest lens. When morning mist
hangs in the canopy and sunlight hits just right, the whole forest becomes a
prism. Water droplets in spider webs throw tiny rainbows. Dew on leaves splits
light. The forest IS a prism — it takes the white light of possibility and
reveals the spectrum of color that was always there.

And the tokens do exactly this: they take the abstract idea of "grove colors"
and split it into named, specific scales. grove[600]. bark[900]. cream[50].
The spectrum, revealed.

Prism also has a secondary meaning that's beautiful: "a prism through which to
see the world." A lens. A way of seeing. The Foliage Prism is the lens through
which the grove sees color.

...and there's a forest called "The Prism" already in the naming doc (the
LGBTQ+ community). That's a FEATURE, not a conflict — color, spectrum,
pride, community. The word carries all of that.

---

## Decision

**Prism.**

Not because it's the most traditionally "grove" name. But because:

1. It's immediately understood as "the color system"
2. It has a beautiful forest interpretation (mist, dew, light through water)
3. It connects to "spectrum" — the full range of colors available
4. The user's instinct found it first, and good instincts mean the name was already there
5. "Reference the Prism" rolls off the tongue naturally
6. Its connection to The Prism (LGBTQ+ forest) adds depth rather than conflict

> Prism is where light finds its names.

Sunlight enters the grove as one thing. It hits the mist, the dew, the water
clinging to leaves — and separates into everything it always was. Green. Cream.
Bark. The colors were always there. The Prism just reveals them.

_Every color was already in the light._
