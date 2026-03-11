---
title: Museum Layout Plan
description: The blueprint for the Grove Museum
category: exhibit
exhibitWing: entrance
icon: layout
lastUpdated: "2026-03-10"
---

# The Grove Museum: Layout Plan

> _A guided tour through how this forest grows._

---

> **Status: Scaffolded**
>
> Museum structure is defined. Entrance (MUSEUM.md), glossary, and all wing introductions (WING.md) are written. Individual exhibit files exist as stubs with frontmatter and navigation. No exhibit content has been written yet.
>
> **Last major update:** March 2026 (added Aspen, Philosophy, AI, and Jungle wings; removed stale file paths; updated ecosystem count from 40+ to 60+)

---

## Why a Museum?

Traditional documentation answers "how does this work?" Museum documentation answers "why does this exist, and why should I care?"

Most codebases hand you a catalog and wish you luck. API references. Method signatures. Configuration options. Useful for people who already understand the system, useless for everyone else.

Grove was built to have texture. The forest on the landing page isn't decoration. The naming system isn't branding. The feature flags aren't just toggles. That texture deserves documentation that preserves it.

**The museum approach:**

- Walks alongside readers instead of listing facts
- Explains _why_ before _how_
- Treats the codebase as exhibits worth exploring
- Acknowledges imperfection and lessons learned
- Connects technical systems to the feelings they create

**What this replaces:**

- Dry API references (those live in specs)
- Implementation details (those live in code comments)
- Troubleshooting guides (those live in the help center)

**What this creates:**

- Understanding that sticks
- Appreciation for design decisions
- Patterns worth stealing
- A welcoming entry point for contributors

---

## Overview

The Grove Museum transforms the codebase into a welcoming experience for Wanderers. Ten wings organized around themes, not file paths. The museum explains _why_ things exist, not just _how_ they work.

**Target Audience:** Wanderers of all experience levels who want to understand Grove's architecture, patterns, and philosophy.

**Not For:** Quick API lookups (use specs), implementation details (use code comments), or troubleshooting (use help center).

---

## Museum Structure

```
                    🌲  THE GROVE MUSEUM  🌲
              ╭──────────────────────────────────────╮
              │                                      │
              │           ╭─────────────╮            │
              │           │  ENTRANCE   │            │
              │           │  MUSEUM.md  │            │
              │           ╰──────┬──────╯            │
              │                  │                   │
              │    ╭─────────────┼─────────────╮     │
              │    │             │             │     │
              │    ▼             ▼             ▼     │
              │ ┌───────┐  ┌───────────┐  ┌───────┐ │
              │ │ ASPEN │  │PHILOSOPHY │  │ARCHIT-│ │
              │ │ (why) │  │  (how we  │  │ECTURE │ │
              │ │       │  │  decide)  │  │(infra)│ │
              │ └───────┘  └───────────┘  └───────┘ │
              │    │             │             │     │
              │    ▼             ▼             ▼     │
              │ ┌───────┐  ┌───────────┐  ┌───────┐ │
              │ │NATURE │  │  TRUST    │  │ DATA  │ │
              │ │(look/ │  │ (auth/    │  │(store/│ │
              │ │ feel) │  │  safety)  │  │ flow) │ │
              │ └───────┘  └───────────┘  └───────┘ │
              │    │             │             │     │
              │    ▼             ▼             ▼     │
              │ ┌───────┐  ┌───────────┐  ┌───────┐ │
              │ │PERSON-│  │ COMMUNITY │  │  AI   │ │
              │ │ALIZE  │  │           │  │(priv- │ │
              │ │       │  │           │  │ acy)  │ │
              │ └───────┘  └───────────┘  └───────┘ │
              │                  │                   │
              │           ╭──────┴──────╮            │
              │           │   JUNGLE    │            │
              │           │  (tooling)  │            │
              │           ╰──────┬──────╯            │
              │                  │                   │
              │           ╭──────┴──────╮            │
              │           │  GLOSSARY   │            │
              │           │   ALCOVE    │            │
              │           ╰─────────────╯            │
              │                                      │
              ╰──────────────────────────────────────╯
```

---

## Wing Definitions

### 1. The Aspen Wing (NEW)

**Theme:** Why this exists, and why it was built this way.

**Location:** `docs/museum/aspen/`

| Exhibit | Focus |
| --- | --- |
| **The Origin Story** | From personal blog to platform, the moment of realization |
| **The Values** | Privacy-first, solarpunk, queer, indie web, content ownership |
| **The Aspen Identity** | Why aspens, clonal colonies, resilience through connection |
| **The Predecessor** | The AutumnsGrove Museum, where this pattern was born |

**Visitor Journey:**

1. Understand the personal story behind the platform
2. Feel the values that shaped every technical decision
3. Discover why "Aspen" names the living deployment
4. Walk through the original museum that inspired this one

**Emotional Goal:** Visitors should feel the authenticity. This isn't a startup. It's a world someone is creating because it matters to them.

---

### 2. The Philosophy Wing (NEW, absorbs Naming Wing)

**Theme:** How Grove names things, makes decisions, and builds with intention.

**Location:** `docs/museum/philosophy/`

| Exhibit | Focus |
| --- | --- |
| **The Naming Ritual** | The walk process, how names are discovered |
| **The Walks Gallery** | 56+ naming journeys with categories |
| **The Ecosystem Map** | 60+ named services, each with its story |
| **The Design Language** | Voice, visual identity, interaction patterns |

**Visitor Journey:**

1. Understand why Grove doesn't use words like "user" or "feature flag"
2. Learn the ritual: visualize the forest, ask what this thing does, let the name emerge
3. Walk through a naming journey (Porch, Lumen, Loom)
4. See how design language serves philosophy

**Note:** The original `naming/` wing content is preserved and linked from here. Philosophy is the broader container; naming is the core practice within it.

---

### 3. The Architecture Wing

**Theme:** How Grove is built at the infrastructure level.

**Location:** `docs/museum/architecture/`

| Exhibit | Focus |
| --- | --- |
| **The Foundation** | Multi-tenant architecture: one deployment, unlimited blogs |
| **The Engine Room** | Engine-first pattern: shared code prevents duplication |
| **The Loom** | Durable Objects coordination layer (7 DOs) |
| **The Cloud Garden** | Cloudflare Workers, D1, KV, R2 composing together |
| **The Infra SDK** | GroveDatabase, GroveStorage, GroveKV, middleware |

**Visitor Journey:**

1. Understand the multi-tenant model
2. Learn why shared components live in the engine
3. See how Durable Objects coordinate real-time state
4. Appreciate how Cloudflare primitives compose
5. See how the Infra SDK abstracts infrastructure

---

### 4. The Nature Wing

**Theme:** The visual and emotional language of Grove.

**Location:** `docs/museum/nature/`

| Exhibit | Focus |
| --- | --- |
| **The Forest** | Mathematically-driven SVG components with customizable props |
| **The Seasons** | Five seasons including the Midnight easter egg |
| **The Glass Garden** | Glassmorphism design system |
| **The Typography Gallery** | Accessible font choices |
| **Gossamer** | ASCII art effects, domain warping, 8 presets |
| **Prism** | Design tokens, colors, icons, seasonal palettes, contrast tools |

**Visitor Journey:**

1. Meet the trees (Cherry, Pine, Aspen, Oak...)
2. Discover creatures and weather effects
3. Experience seasonal transformation
4. Find Midnight (queer aesthetic, deep purple)
5. See glass surfaces layering over organic backgrounds
6. Watch ASCII effects dance through Gossamer
7. Explore how Prism refracts tokens into palettes

---

### 5. The Trust Wing

**Theme:** Authentication, security, and identity.

**Location:** `docs/museum/trust/`

| Exhibit | Focus |
| --- | --- |
| **The Heartwood** | OAuth flow, PKCE, how login actually works |
| **The Session Gallery** | How we remember who you are, halfway refresh |
| **The Security Checkpoint** | Rate limiting, protection patterns |

**Visitor Journey:**

1. Follow a login from "Sign in with Google" to session cookie
2. Understand PKCE flow without a cryptography degree
3. See how sessions refresh silently
4. Appreciate rate limiting that protects without frustrating

---

### 6. The Data Wing

**Theme:** How information flows and persists.

**Location:** `docs/museum/data/`

| Exhibit | Focus |
| --- | --- |
| **The Filing Cabinet** | D1 database patterns, 118+ migrations |
| **The Quick-Lookup Shelf** | KV caching strategies |
| **The Media Vault** | R2 storage for images and files |
| **Amber** | Unified storage management (files, exports, quotas) |
| **The Query Builders** | Type-safe database helpers |

**Visitor Journey:**

1. See how posts flow from editor to D1 to cache to browser
2. Understand tenant isolation (your data stays yours)
3. Learn the caching strategy
4. Explore how Amber manages files, exports, and quotas
5. See typed query helpers that prevent SQL injection

---

### 7. The Personalization Wing

**Theme:** Making each blog feel like home.

**Location:** `docs/museum/personalization/`

| Exhibit | Focus |
| --- | --- |
| **The Grafts Exhibit** | Feature flags with Grove vocabulary |
| **The Curios Collection** | Old-web personalization (guestbooks, shrines) |
| **The Theme Workshop** | Foliage customization, Vineyard showcase |
| **Blazes** | Content markers with icons and meaning |

**Visitor Journey:**

1. Learn Grove vocabulary: Graft, Prune, Blight, Cultivar
2. Discover Curios: guestbooks, hit counters, shrines, custom cursors
3. Understand tier-gated features (Seedling, Sapling)
4. See how Blazes mark content with visual meaning

---

### 8. The Community Wing

**Theme:** The social layer and shared spaces.

**Location:** `docs/museum/community/`

| Exhibit | Focus |
| --- | --- |
| **The Meadow** | Community feed where blogs share posts |
| **The Canopy** | Opt-in wanderer directory, no algorithms, no ranking |
| **The Landing** | How grove.place welcomes visitors |
| **The Clearing** | Status page and transparency |

**Visitor Journey:**

1. See how individual blogs can share to the community feed
2. Walk through the landing page's seasonal showcase
3. Appreciate the transparent status page
4. Understand Grove's philosophy of optional community

---

### 9. The AI Wing (NEW)

**Theme:** Privacy-first AI that serves creators, not surveillance.

**Location:** `docs/museum/ai/`

| Exhibit | Focus |
| --- | --- |
| **Thorn** | Content moderation: behavioral (sub-ms) then AI |
| **Reverie** | AI configuration pipeline, 5-layer architecture |
| **Lumen** | Provider abstraction, tool-calling, zero lock-in |
| **Songbird** | Prompt injection protection |

**Visitor Journey:**

1. Understand the zero-data-retention principle
2. See how behavioral analysis catches abuse before AI is invoked
3. Watch "make my site cozy" become coordinated changes
4. Learn how provider abstraction prevents vendor lock-in
5. Appreciate prompt injection defense

**Key Message:** AI should serve the creator, never the platform. Your words belong to you.

---

### 10. The Jungle (NEW)

**Theme:** The animal skills, the tooling, and the craft of building things that build things.

**Location:** `docs/museum/jungle/`

| Exhibit | Focus |
| --- | --- |
| **The Menagerie** | 72 animal skills organized by role and category |
| **The Conductor** | Orchestration pattern, Gatherings, gate verification |
| **GW: Grove Wrap** | Go CLI for git, CI, secrets, deployments |
| **GF: Grove Find** | Go codebase search with hybrid matching |
| **Glimpse** | Development snapshots, capturing moments during the build |
| **The Craft** | How tooling compounds into development velocity |

**Visitor Journey:**

1. Meet the animals: builders, investigators, architects, protectors, guides
2. See how Gatherings orchestrate multi-skill workflows
3. Understand GW and GF as force multipliers
4. Appreciate how tooling investment compounds over time
5. Feel the difference between 8 commits per issue and 2

**Emotional Goal:** Visitors should feel the joy of good tools. Not just productivity, but the pleasure of a workflow that fits.

---

### 11. The Glossary Alcove

**Theme:** Grove vocabulary demystified.

**Location:** `docs/museum/glossary.md`

_(Already written. May need updates as new terms are added.)_

---

## File Structure

```
docs/museum/
├── MUSEUM.md                    # Main entrance (written)
├── museum-layout-plan.md        # This file
├── glossary.md                  # Grove vocabulary (written)
├── aspen/                       # NEW
│   └── WING.md                  # Values and origin (stub)
├── philosophy/                  # NEW (absorbs naming concepts)
│   └── WING.md                  # Naming ritual, design language (stub)
├── architecture/
│   ├── WING.md                  # Wing introduction (stub)
│   ├── foundation.md            # Multi-tenant (stub)
│   ├── engine-room.md           # Engine-first pattern (stub)
│   ├── loom.md                  # Durable Objects (stub)
│   └── cloud-garden.md          # Cloudflare primitives (stub)
├── nature/
│   ├── WING.md                  # Wing introduction (stub)
│   ├── forest.md                # Nature components (stub)
│   ├── seasons.md               # Seasonal theming (stub)
│   ├── glass-garden.md          # Glassmorphism (stub)
│   └── typography.md            # Fonts and accessibility (stub)
├── trust/
│   ├── WING.md                  # Wing introduction (stub)
│   ├── heartwood.md             # Authentication (stub)
│   ├── sessions.md              # Session management (stub)
│   └── security.md              # Protection patterns (stub)
├── data/
│   ├── WING.md                  # Wing introduction (stub)
│   ├── filing-cabinet.md        # D1 patterns (stub)
│   ├── quick-lookup.md          # KV caching (stub)
│   ├── media-vault.md           # R2 storage (stub)
│   └── query-builders.md        # Type-safe helpers (stub)
├── personalization/
│   ├── WING.md                  # Wing introduction (stub)
│   ├── grafts.md                # Feature flags (stub)
│   ├── curios.md                # Old-web features (stub)
│   └── themes.md                # Customization (stub)
├── community/
│   ├── WING.md                  # Wing introduction (stub)
│   ├── meadow.md                # Community feed (stub)
│   ├── landing.md               # Welcome experience (stub)
│   └── clearing.md              # Status transparency (stub)
├── ai/                          # NEW
│   └── WING.md                  # Privacy-first AI (stub)
├── jungle/                      # NEW
│   └── WING.md                  # Animal skills and tooling (stub)
└── naming/                      # LEGACY (content migrating to philosophy/)
    ├── WING.md
    ├── the-walk.md
    ├── walks-gallery.md
    ├── ecosystem.md
    └── journeys/
        ├── porch.md
        ├── lumen.md
        └── loom.md
```

---

## Writing Guidelines

Each exhibit should follow the museum-documentation skill structure:

1. **Title with tagline** — Evocative, not descriptive
2. **"What You're Looking At"** — Orient before explaining
3. **Galleries/sections** — Organized tour structure
4. **Code with context** — Never code in isolation
5. **"Patterns Worth Stealing"** — Transferable lessons
6. **"Lessons Learned"** — Honest reflection
7. **"Continue Your Tour"** — Links to related exhibits
8. **Meaningful closing** — Signature or poetic line

**Voice:** Warm, conversational, explains "why" before "how." No corporate jargon. Write like you're helping someone speak, not perform.

**Important:** Do not hardcode file paths in exhibits. The monorepo structure evolves. Reference systems by name and concept, not by directory. If a specific file is relevant, describe what it does and where to find it generally, not with an absolute path that will rot.

---

## Agent Orchestration

The museum will be written by a swarm of agents, each responsible for one exhibit. An orchestrating agent guides the swarm, keeping threads from tangling.

### Required Reading

**Before drafting any exhibit, every agent MUST read:**

- `docs/philosophy/why-i-built-the-grove.md` — Why texture matters
- `docs/philosophy/grove-naming.md` — The vocabulary and naming philosophy
- `.claude/skills/museum-documentation/SKILL.md` — The exhibit writing guide

### Principles

1. **One exhibit, one agent.** Each agent owns exactly one exhibit file.
2. **Explore broadly before writing.** Wander the codebase. Understand connections.
3. **The orchestrator doesn't write.** It coordinates, tracks, resolves conflicts.
4. **Texture over thoroughness.** Capture _why_ something matters, not every implementation detail.
5. **No stale paths.** Reference systems by name, not by file path.

### Agent Checklist

Before writing, each agent should:

- [ ] Read the required reading (above)
- [ ] Explore the code/specs relevant to their exhibit
- [ ] Understand how their exhibit connects to at least two others
- [ ] Identify what makes their subject _textured_, not just functional
- [ ] Verify any referenced systems still exist and work as described

---

## Priority Order

**Phase 1: The Heart**

1. The Aspen Wing (origin, values, identity)
2. The Philosophy Wing (naming ritual, design language)

**Phase 2: Core Understanding**

3. Architecture Wing (foundation, engine-room, infra SDK)
4. Nature Wing (seasons, forest, gossamer, prism)

**Phase 3: Trust & Data**

5. Trust Wing (heartwood, sessions)
6. Data Wing (filing-cabinet, amber, query-builders)

**Phase 4: Features**

7. Personalization Wing (grafts, curios, blazes)
8. AI Wing (thorn, reverie, lumen, songbird)

**Phase 5: Community & Craft**

9. Community Wing (meadow, landing, clearing)
10. The Jungle (menagerie, conductor, GW, GF)

---

## Success Criteria

A Wanderer who completes the museum tour should:

- [ ] Understand why Grove exists and what values drive it
- [ ] Feel the authenticity behind every naming choice
- [ ] Know how multi-tenant architecture works
- [ ] Appreciate the nature-themed visual system
- [ ] Grasp how authentication flows without fear
- [ ] See how privacy-first AI serves creators
- [ ] Understand the caching strategy's elegance
- [ ] Want to personalize their own blog
- [ ] Feel the joy of good tooling
- [ ] Feel welcomed into the Grove community

---

_This plan transforms technical documentation into hospitality._

_Planned January 2026. Updated March 2026._
