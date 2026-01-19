# Project Instructions

> **IMPORTANT**: This project uses `AGENT.md` for agent instructions.

## Instructions for Claude Code

**You MUST read `AGENT.md` before doing anything else.**

The `AGENT.md` file contains all project-specific instructions, workflows, and guidelines. Read it first to keep the full context in memory for this session.

## Codebase Navigation (grove-find)

**After reading AGENT.md**, run this command to load the codebase search toolkit:

```bash
GF_AGENT=1 source scripts/repo/grove-find.sh && gfagent
```

The `GF_AGENT=1` flag enables agent mode: no colors, no emoji, no box-drawing characters—just clean output.

This gives you 45+ blazing-fast search commands for navigating the codebase. Key commands:
- `gf "pattern"` — Search entire codebase
- `gfused "Name"` — Find where a component is used
- `gfrecent 1` — Files changed today
- `gfchanged` — Files changed on current branch
- `gfengine` — Verify engine-first pattern compliance

Run `gfhelp` for full documentation or `gfagent` for a compact reference.

---

All project instructions, tech stack details, architecture notes, and workflow guidelines are in:
- **`AGENT.md`** - Main project instructions (read this first)
- **`AgentUsage/`** - Detailed workflow guides and best practices
- Special Reminder from the user:
> This site is my authentic voice—warm, introspective, queer, unapologetically building something meaningful; write like you're helping me speak, not perform.
- Reminder from the User for when we Work:
> Write with the warmth of a midnight tea shop and the clarity of good documentation—this is my space, make it feel like home.

---

## Design Context

### Users
Grove serves friends, queer creators, independent writers, and indie web enthusiasts who want their own space online—away from big tech algorithms and extractive platforms. Users arrive seeking refuge: a cozy, authentic place to write, share, and belong. They value ownership, community, and spaces that feel *genuinely* theirs.

### Brand Personality
**Warm, introspective, queer.** Grove speaks like a trusted friend who runs a midnight tea shop—never performative, always sincere. The voice is:
- **Welcoming** — Every visitor should feel they've found somewhere safe
- **Grounded** — Confident without being loud, capable without being corporate
- **Authentic** — This is your space; we help you speak, not perform

### Emotional Goals
When someone lands on Grove, they should feel:
1. **Safe refuge** — A cozy shelter from the hostile internet
2. **Creative sanctuary** — An inspiring space to express freely
3. **Community belonging** — Part of something bigger, not alone

### Aesthetic Direction
**Nature-themed glassmorphism with seasonal depth.** The visual language evokes a forest clearing where digital and organic coexist peacefully.

**Core palette:** Grove greens, warm bark browns, soft cream neutrals
**Signature elements:** Randomized forests, falling petals/leaves/snow, glass surfaces over nature
**Seasons:** Spring (renewal), Summer (growth), Autumn (harvest/default), Winter (rest), Midnight (dreams)

**Reference feel:** Studio Ghibli's lived-in warmth meets a well-organized indie bookshop
**Anti-references:** Corporate SaaS sterility, social media engagement-bait, generic website builders

### Design Principles

1. **Content-first, decoration-second** — Nature elements enhance readability, never obstruct it. Glass surfaces create hierarchy while hinting at beauty beneath.

2. **Alive but not distracting** — Subtle animations, seasonal changes, and randomization create a living world. Everything respects `prefers-reduced-motion`.

3. **Accessible by design** — WCAG AA minimum, with special attention to reduced motion (all animation optional), screen reader excellence, and low vision support. Touch targets 44×44px minimum.

4. **Organic over rigid** — Soft corners (grove border radius), natural color progressions, hand-drawn-feeling nature components. Never sharp or corporate.

5. **Warm in dark mode too** — Dark mode isn't just inverted colors; it's "nature at night" with maintained warmth and character.

---

*This structure aligns with industry-standard agentic coding practices.*
