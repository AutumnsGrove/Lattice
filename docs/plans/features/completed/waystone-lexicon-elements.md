---
title: Waystone Lexicon Elements
description: Making Grove terms clickable, living elements that teach the lexicon
status: idea
created: '2026-02-02'
---
# Waystone Lexicon Elements

> *A lexicon that teaches itself.*

---

## The Idea

Every Grove term becomes a **living element**—clickable, styled with a unique color, instantly recognizable. When a Wanderer encounters an unfamiliar word, they click it, and Waystone lights up with the definition.

No hunting through docs. No confusion about jargon. The language teaches itself as you explore.

---

## How It Works

### The Element

```svelte
<GroveTerm term="bloom">bloom</GroveTerm>
```

Renders as a styled inline element:
- Unique color per term (or per category?)
- Subtle visual indicator it's interactive (underline? glow? icon?)
- Accessible—screen readers announce "Grove term: bloom"

### The Interaction

Click/tap → Waystone panel slides in with:
- The term's definition (from grove-naming.md)
- The poetic one-liner
- Maybe: "See also" links to related terms
- Maybe: Quick link to full Waystone article

### Where It Appears

Everywhere Grove terms are used:
- Marketing pages
- Arbor (admin panel)
- Onboarding flows
- Help documentation
- Error messages
- Even in blooms themselves (if authors want)

---

## Visual Language

Options to explore:

1. **Color by category**
   - Foundational (grove, garden, bloom) → warm gold
   - Platform services → grove green
   - Content & community → soft purple
   - Tools → amber
   - Operations → muted blue

2. **Consistent accent**
   - All terms use one "lexicon color"
   - Simpler, but less information at a glance

3. **Subtle glow/shimmer**
   - Terms have a barely-there animation
   - Like words that are alive, waiting to be discovered

---

## Technical Considerations

- Terms sourced from grove-naming.md (single source of truth)
- Waystone component needs to be lightweight (lazy-load definitions?)
- Works in markdown content (remark plugin?)
- Works in Svelte components (direct usage)
- Respects reduced motion preferences

---

## The Poetry

> "The grove speaks its own language. Every glowing word is an invitation to understand."

---

## Related

- Waystone (help center) - where definitions live
- grove-naming.md - the source of truth
- Accessibility - aria labels, screen reader support

---

*For later. But this is the way.*
