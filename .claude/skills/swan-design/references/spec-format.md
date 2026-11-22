# Swan Design: Spec Format

> Loaded by swan-design when structuring a spec. See SKILL.md for the design process.

# Grove Spec Writing

A comprehensive guide for writing technical specifications in the Grove ecosystem. Use this skill to create new specs that feel like storybook entries, or to validate and standardize existing specs.

## When to Activate

- Creating a new technical specification
- Reviewing an existing spec for completeness
- Adding ASCII art headers to specs missing them
- Adding diagrams, mockups, or visual elements to text-heavy specs
- Standardizing frontmatter across spec files
- Validating a spec against Grove standards before finalizing

---

## The Spec as Storybook Entry

Grove specs aren't just technical documents. They're **storybook entries** in a larger narrative. Each spec should feel like opening a page in a beautifully illustrated field guide to the forest.

**The formula:**
1. **Cover page** (frontmatter + ASCII art + tagline)
2. **Introduction** (what is this, in nature and in Grove)
3. **The journey** (architecture, flows, implementation)
4. **The details** (API, schema, security)
5. **The path forward** (implementation checklist)

---

## Required Structure

### 1. Frontmatter (REQUIRED)

Every spec MUST have this exact frontmatter format:

```yaml
---
aliases: []
date created: [Day], [Month] [Ordinal] [Year]
date modified: [Day], [Month] [Ordinal] [Year]
tags:
  - primary-domain
  - tech-stack
  - category
type: tech-spec
---
```

**Date format examples:**
- `Monday, December 29th 2025`
- `Saturday, January 4th 2026`

**Type options:**
- `tech-spec` — Technical specification (most common)
- `implementation-plan` — Step-by-step implementation guide
- `index` — Index/navigation document

### 2. ASCII Art Header (REQUIRED)

Immediately after frontmatter, include a code block with ASCII art that visually represents the concept:

```
# [Name] — [Short Description]

```
         ASCII ART HERE
         representing the concept
         in a visual way
```

> *Poetic tagline in italics*
```

**Good ASCII art:**
- Relates to the nature metaphor (forest, garden, etc.)
- Represents the concept visually (layers for backup, rings for analytics)
- Uses box-drawing characters: `─│┌┐└┘├┤┬┴┼╭╮╰╯`
- Uses nature emoji sparingly: `🌲🌿🍂✨🌸`
- Includes a poetic tagline or motto

**Examples from excellent specs:**

**Wisp (will-o'-the-wisp light):**
```
         🌲  🌲  🌲
          \   |   /
           \  |  /
             ✨
            ╱ ╲
           ╱   ╲
          ╱  ·  ╲
         ╱   ·   ╲
        ╱    ·    ╲
       ·     ·     ·
         gentle
         guiding
          light
```

**Patina (layered backups):**
```
                     ╭───────────────────╮
                    ╭┤  ┌─────────────┐  ├╮
                   ╭┤│  │  2026-01-05 │  │├╮
                   │││  │  ▓▓▓▓▓▓▓▓▓▓ │  │││
                   │││  │  ▒▒▒▒▒▒▒▒▒▒ │  │││
                   │││  │  ░░░░░░░░░░ │  │││
                   │││  │  ·········· │  │││
                   ╰┴┴──└─────────────┘──┴┴╯
                  ╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱
               ──────────────────────────────
              ~~~~~~~~ oxidation layer ~~~~~~~~
              Age as armor. Time as protection.
```

**Heartwood (tree rings):**
```
                      ╭──────────╮
                   ╭──│ ╭──────╮ │──╮
                 ╭─│  │ │ ╭──╮ │ │  │─╮
                │  │  │ │ │♥ │ │ │  │  │
                 ╰─│  │ │ ╰──╯ │ │  │─╯
                   ╰──│ ╰──────╯ │──╯
                      ╰──────────╯

       every ring: a year, a story, a layer of growth

               The center that holds it all.
```

### 3. Introduction Section

After the ASCII art header:

```markdown
> *Poetic tagline repeated*

[2-3 sentence description of what this is in the Grove ecosystem]

**Public Name:** [Name]
**Internal Name:** Grove[Name]
**Domain:** `name.grove.place`
**Repository:** [Link if applicable]
**Last Updated:** [Month Year]

[1-2 paragraphs explaining the nature metaphor and how it applies]

---
```

### 4. Body Sections

Organize content with clear headers. Include:

- **Overview/Goals** — What this system does
- **Architecture** — How it's built (with diagrams!)
- **Tech Stack** — Dependencies, frameworks
- **API/Schema** — Technical details
- **Security** — Important considerations
- **Implementation Checklist** — Clear action items

---

## Required Visual Elements

### Flow Diagrams

Every spec describing a process MUST include at least one ASCII flow diagram:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Sites                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   Site A     │  │   Site B     │  │   Site C     │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
└─────────┼─────────────────┼─────────────────┼───────────────────────┘
          │                 │                 │
          │    1. Request   │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Central Service                              │
│                                                                     │
│  ┌─────────────────────────┐  ┌─────────────────────────┐           │
│  │      Handler A          │  │      Handler B          │           │
│  └─────────────────────────┘  └─────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

**Box drawing reference:**
- Corners: `┌ ┐ └ ┘` (square) or `╭ ╮ ╰ ╯` (rounded)
- Lines: `─ │ ═ ║`
- Joins: `├ ┤ ┬ ┴ ┼`
- Arrows: `→ ← ↑ ↓ ▶ ◀ ▲ ▼`

### UI Mockups

Specs describing user interfaces MUST include ASCII mockups:

```
┌─────────────────────────────────────────────────────────────────┐
│  ✧ Panel Title                                          [×]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ Label ────────────────────────────────────────────────┐     │
│  │ Content here with proper spacing                       │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Input field...                                     [↵]  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ───────────────────────────────────────────────────────────    │
│  [ Action A ]                              [ Action B ✦ ]       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### State Diagrams

For features with multiple states:

```
   Idle:                    Analyzing:               Success:
   .  *  .    .  *         . * . analyzing . *           *
  .    _    .      .         \  |  /             .    *  /|\   .
     /   \    *  .         -- (o.o) --  thinking    *   / | \    *
    / ~ ~ \  .    .          /  |  \                   /__|__\
   /       \______        ~~~~~~~~~~~~~~~~~       ~~~~/       \~~~~
  ~~~~~~~~~~~~~~~~~~~       words flowing...        all clear
```

### Comparison Tables

Use tables to compare options, states, or configurations:

```markdown
| Feature | Seedling | Sapling | Oak | Evergreen |
|---------|----------|---------|-----|-----------|
| Posts   | 50       | 250     | ∞   | ∞         |
| Storage | 1 GB     | 5 GB    | 20 GB | 100 GB  |
| Themes  | 3        | 10      | All | All + custom |
```

### Timeline/Retention Diagrams

For anything involving time:

```
  TODAY                                              12 WEEKS AGO
    │                                                      │
    ▼                                                      ▼
   ┌─┬─┬─┬─┬─┬─┬─┐                                        ┌─┐
   │█│█│█│█│█│█│█│ ◀── Daily backups (7 days)             │░│
   └─┴─┴─┴─┴─┴─┴─┘                                        └─┘
   S M T W T F S
```

---

## Validation Checklist

Before finalizing any spec, verify:

### Structure
- [ ] Frontmatter present with all required fields
- [ ] `aliases: []` included (even if empty)
- [ ] Date format correct (Day, Month Ordinal Year)
- [ ] `type: tech-spec` or appropriate type
- [ ] ASCII art header present after frontmatter
- [ ] Poetic tagline in italics
- [ ] Public/Internal names listed
- [ ] Domain specified (if applicable)

### Visual Content
- [ ] At least one ASCII flow diagram (if process-based)
- [ ] UI mockups included (if describing interface)
- [ ] Tables for comparisons where appropriate
- [ ] Code blocks for technical details
- [ ] No walls of text without visual breaks

### Voice (refer to `owl-archive/references/anti-patterns.md` for the full list)
- [ ] No em-dashes (use periods or commas)
- [ ] No "not X, but Y" patterns or variants ("Not X. Not Y. Just Z.", "The X? A Y.")
- [ ] No AI-coded words (robust, seamless, leverage, delve, utilize, streamline, etc.)
- [ ] No "serves as" / "stands as" / "marks a". Use simple verbs
- [ ] No filler transitions (Furthermore, Moreover, It's worth noting, Notably)
- [ ] No gerund fragment litanies or bold-first bullet patterns
- [ ] No false suspense ("Here's the kicker", "Here's the thing")
- [ ] No dead metaphors (same metaphor repeated in every section)
- [ ] Short paragraphs
- [ ] Poetic closers earned, not forced

### Completeness
- [ ] Overview/Goals section
- [ ] Architecture diagram
- [ ] Technical details (API, schema)
- [ ] Security considerations
- [ ] Implementation checklist

---

## Creating ASCII Art

### The Process

1. **Identify the core metaphor** — What natural thing does this represent?
2. **Sketch the concept** — What visual would convey this at a glance?
3. **Choose your characters** — Box drawing, emoji, or creative ASCII
4. **Build in layers** — Start with outline, add detail, add flourishes
5. **Add the tagline** — Poetic one-liner that captures the essence

### Character Palette

**Box Drawing (safe, consistent):**
```
┌─────┬─────┐    ╭─────╮
│     │     │    │     │
├─────┼─────┤    ╰─────╯
│     │     │
└─────┴─────┘
```

**Lines and Arrows:**
```
→ ← ↑ ↓ ↔ ↕
▶ ◀ ▲ ▼
⟿ ⟸ ⟹
```

**Nature Emoji (use sparingly):**
```
🌲 🌳 🌿 🍂 🍃 🌸 🌺 🌻 🌷 🌱 🍄
☀️ 🌤️ ⭐ ✨ 💧 🔥
🦋 🐛 🐌
```

**Decorative:**
```
· ∙ • ° ˚ ∘
~ ≈ ∿
═ ║ ╔ ╗ ╚ ╝
░ ▒ ▓ █
```

### Tips

- Keep ASCII art under 20 lines tall
- Center the art within its code block
- Include breathing room (empty lines above/below)
- Test in a monospace font
- Consider mobile rendering (simpler is better)

---

## Example: Complete Spec Header

```markdown
---
aliases: []
date created: Monday, January 6th 2026
date modified: Monday, January 13th 2026
tags:
  - support
  - user-communication
  - cloudflare-workers
type: tech-spec
---

# Porch — Support System

```
                              🏠
                           ___│___
                          │       │
                    ~~~~~~│ PORCH │~~~~~~
                         ╱│_______│╲
                        ╱           ╲
                       ╱  ┌───┐      ╲
                      ╱   │ ☕ │       ╲
                     ╱    └───┘ 👤     ╲
                    ════════════════════════
                           steps

              Have a seat. We'll figure it out.
```

> *Have a seat on the porch. We'll figure it out together.*

Grove's front porch: a warm, accessible space where users sit down and have a conversation. Not a corporate help desk with ticket numbers. A porch where you chat with the grove keeper about what's going on.

**Public Name:** Porch
**Internal Name:** GrovePorch
**Domain:** `porch.grove.place`
**Status:** Planned (Launch Priority)

A porch is where you sit and talk. You come up the steps, have a seat, and the grove keeper comes out to chat. It's not a ticket counter. It's two people on a porch, figuring things out together.

---
```

---

## Integration with Other Skills

### Before Writing a Spec

1. **walking-through-the-grove** — If naming a new feature, complete the naming journey first
2. **chameleon-adapt** — If the spec involves UI, understand the design patterns

### While Writing

3. **grove-documentation** — Apply Grove voice throughout, avoid AI patterns

### After Writing

4. **This checklist** — Run it before the spec is considered done
5. Review with fresh eyes: Does it feel like a storybook entry?

### When to Use museum-documentation Instead

This guide is for **internal technical specifications**: architecture decisions, system design, implementation plans. Documentation for developers.

Use **museum-documentation** when writing for **Wanderers who want to understand**:

| Use this guide | Use museum-documentation |
|-----------------------|-------------------------|
| Technical specifications | "How it works" for curious visitors |
| Architecture decisions | Codebase guided tours |
| Implementation plans | Knowledge base exhibits |
| Internal system docs | Narrative technical explanations |

If the reader is a **developer implementing something**, use this skill.
If the reader is a **Wanderer exploring the forest**, use museum-documentation.

---

## Quick Reference

| Element | Required | Location |
|---------|----------|----------|
| Frontmatter | Yes | Top of file |
| ASCII art header | Yes | After frontmatter |
| Poetic tagline | Yes | After ASCII art |
| Public/Internal names | Yes | Introduction |
| Architecture diagram | If applicable | Body |
| UI mockups | If has UI | Body |
| Implementation checklist | Yes | End of spec |

---

*A good spec is one you'd want to read at 2 AM. Make it beautiful.*
