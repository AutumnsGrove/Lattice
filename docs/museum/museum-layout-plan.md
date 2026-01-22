# The Lattice Museum: Layout Plan

> *A guided tour through how this forest grows.*

---

> **Status: Planning**
>
> This document outlines the museum structure, exhibits, and agent orchestration model. The museum itself has not been written yet. Currently complete: MUSEUM.md (entrance), glossary.md. All wing exhibits are pending.

---

## Why a Museum?

Traditional documentation answers "how does this work?" Museum documentation answers "why does this exist, and why should I care?"

Most codebases hand you a catalog and wish you luck. API references. Method signatures. Configuration options. Useful for people who already understand the system, useless for everyone else.

Grove was built to have texture. The forest on the landing page isn't decoration—it's a backyard rebuilt in code. The naming system isn't branding—it's world-building. The feature flags aren't just toggles—they're grafts on a living tree.

That texture deserves documentation that preserves it.

**The museum approach:**
- Walks alongside readers instead of listing facts
- Explains *why* before *how*
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

The museum exists because Grove's architecture is elegant enough to deserve a guided tour, and because the person who built it cried in a parking lot when she realized she'd made something real.

---

## Overview

The Lattice Museum transforms Grove's codebase into a welcoming experience for Wanderers. Rather than dry API references, we offer curated exhibits that explain *why* things work the way they do.

**Target Audience:** Wanderers of all experience levels who want to understand Grove's architecture, patterns, and philosophy.

**Not For:** Quick API lookups (use specs), implementation details (use code comments), or troubleshooting (use help center).

---

## Museum Structure

```
                    🌲  THE LATTICE MUSEUM  🌲
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
              │ │ARCHIT-│  │  NATURE   │  │ TRUST │ │
              │ │ECTURE │  │   WING    │  │ WING  │ │
              │ │ WING  │  │           │  │       │ │
              │ └───────┘  └───────────┘  └───────┘ │
              │    │             │             │     │
              │    ▼             ▼             ▼     │
              │ ┌───────┐  ┌───────────┐  ┌───────┐ │
              │ │ DATA  │  │PERSONALI- │  │COMMUN-│ │
              │ │ WING  │  │  ZATION   │  │  ITY  │ │
              │ │       │  │   WING    │  │ WING  │ │
              │ └───────┘  └───────────┘  └───────┘ │
              │                  │                   │
              │           ╭──────┴──────╮            │
              │           │   NAMING    │            │
              │           │    WING     │            │
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

### 1. The Architecture Wing

**Theme:** How Grove is built at the infrastructure level.

**Location:** `docs/museum/architecture/`

| Exhibit | Focus | Key Files |
|---------|-------|-----------|
| **The Foundation** | Multi-tenant architecture: one deployment, unlimited blogs | `docs/developer/architecture/` |
| **The Engine Room** | Engine-first pattern: how we prevent 11,925 lines of duplication | `packages/engine/` |
| **The Loom** | Durable Objects coordination layer | `docs/patterns/loom-*` |
| **The Cloud Garden** | Cloudflare Workers, D1, KV, R2 working together | `wrangler.toml` files |

**Visitor Journey:**
1. Understand the multi-tenant model (one Pages app serves all blogs)
2. Learn why shared components live in the engine
3. See how Durable Objects coordinate real-time state
4. Appreciate how Cloudflare primitives compose together

**ASCII Diagram to Include:**
```
  Request arrives at grove.place
           │
           ▼
    ╭─────────────╮
    │grove-router │  "Which blog is this?"
    │   Worker    │
    ╰──────┬──────╯
           │ subdomain extracted
           ▼
    ╭─────────────╮
    │ groveengine │  Single SvelteKit app
    │    Pages    │  serves all tenants
    ╰──────┬──────╯
           │
    ┌──────┼──────┐
    ▼      ▼      ▼
   D1     KV     R2
 (data) (cache) (media)
```

---

### 2. The Nature Wing

**Theme:** The visual and emotional language of Grove.

**Location:** `docs/museum/nature/`

| Exhibit | Focus | Key Files |
|---------|-------|-----------|
| **The Forest** | 64 SVG components with customizable Svelte props | `ui/components/nature/` |
| **The Seasons** | Five seasons including Midnight easter egg | `ui/stores/season.ts` |
| **The Glass Garden** | Glassmorphism design system | `ui/components/ui/Glass*` |
| **The Typography Gallery** | 10 fonts including accessible options | `ui/components/typography/` |

**Visitor Journey:**
1. Meet the mathematically-driven trees (Cherry, Pine, Aspen, Oak...)
2. Discover creatures that bring the forest alive (Bee, Butterfly, Deer...)
3. Experience seasons changing (Spring → Summer → Autumn → Winter)
4. Find the Midnight easter egg (queer aesthetic, deep purple)
5. See how glass surfaces layer over nature backgrounds
6. Explore accessible font choices (OpenDyslexic, Atkinson Hyperlegible)

**What Makes It Delightful:** The nature system harnesses mathematically-driven SVGs with customizable Svelte props. Each tree, creature, and weather effect can be tuned through component properties, creating organic variety from precise parameters.

**Emotional Goal:** Visitors should feel the warmth and intentionality behind every visual choice.

---

### 3. The Trust Wing

**Theme:** Authentication, security, and identity.

**Location:** `docs/museum/trust/`

| Exhibit | Focus | Key Files |
|---------|-------|-----------|
| **The Heartwood** | OAuth flow, how login actually works | `docs/specs/heartwood-spec.md` |
| **The Session Gallery** | How we remember who you are | `lib/groveauth/` |
| **The Security Checkpoint** | Rate limiting, CAPTCHA, protection | `lib/server/services/` |

**Visitor Journey:**
1. Follow a login from "Sign in with Google" to session cookie
2. Understand PKCE flow without cryptography degree required
3. See how sessions refresh silently (halfway pattern)
4. Learn about device fingerprinting and multi-tab coordination
5. Appreciate rate limiting that protects without frustrating

**Key Lesson:** Security doesn't have to feel hostile. We protect without making visitors feel surveilled.

---

### 4. The Data Wing

**Theme:** How information flows and persists.

**Location:** `docs/museum/data/`

| Exhibit | Focus | Key Files |
|---------|-------|-----------|
| **The Filing Cabinet** | D1 database patterns | `lib/server/services/database.ts` |
| **The Quick-Lookup Shelf** | KV caching strategies | `lib/server/services/cache.ts` |
| **The Media Vault** | R2 storage for images and files | `lib/server/services/storage.ts` |
| **The Query Builders** | Type-safe database helpers | `database.ts` exports |

**Visitor Journey:**
1. See how posts flow from editor → D1 → cache → browser
2. Understand tenant isolation (your data stays yours)
3. Learn the caching strategy (why some pages load instantly)
4. Explore typed query helpers that prevent SQL injection
5. See how images are validated and stored

**Key Pattern to Highlight:** The "isolated try/catch" lesson (one failing query shouldn't block others).

---

### 5. The Personalization Wing

**Theme:** Making each blog feel like home.

**Location:** `docs/museum/personalization/`

| Exhibit | Focus | Key Files |
|---------|-------|-----------|
| **The Grafts Exhibit** | Feature flags with Grove vocabulary | `docs/specs/grafts-spec.md` |
| **The Curios Collection** | Old-web personalization | `docs/specs/curios-spec.md` |
| **The Theme Workshop** | How blogs get customized | Settings system |

**Visitor Journey:**
1. Learn Grove vocabulary: Graft (enable), Prune (disable), Blight (kill switch)
2. Discover Curios: guestbooks, hit counters, shrines, custom cursors
3. Understand tier-gated features (Seedling → Sapling → Oak → Evergreen)
4. See how A/B testing works with "cultivars"
5. Appreciate the old-web energy meeting modern standards

**Emotional Goal:** Visitors should feel inspired to personalize their own spaces.

---

### 6. The Community Wing

**Theme:** The social layer and shared spaces.

**Location:** `docs/museum/community/`

| Exhibit | Focus | Key Files |
|---------|-------|-----------|
| **The Meadow** | Community feed where blogs share posts | `packages/meadow/` |
| **The Landing** | How grove.place welcomes visitors | `packages/landing/` |
| **The Clearing** | Status page and transparency | `packages/clearing/` |

**Visitor Journey:**
1. See how individual blogs can share to the community feed
2. Explore voting, reactions, and discovery
3. Walk through the landing page's seasonal showcase
4. Appreciate the transparent status page (Clearing)
5. Understand Grove's philosophy of optional community

**Key Message:** Community is opt-in. Your blog is yours first.

---

### 7. The Naming Wing

**Theme:** How Grove names things, and why it matters.

**Location:** `docs/museum/naming/`

| Exhibit | Focus | Key Files |
|---------|-------|-----------|
| **The Philosophy** | Why names aren't branding, they're world-building | `docs/philosophy/grove-naming.md` |
| **The Walk** | The ritual: how names are discovered, not invented | `docs/philosophy/walking-through-the-grove.md` |
| **The Journeys Gallery** | 50+ naming journeys with ASCII art, rejected ideas, realizations | `docs/philosophy/naming-research/` |
| **The Ecosystem Map** | 40+ services, each with nature metaphors that fit | `grove-naming.md` ecosystem table |

**Visitor Journey:**
1. Understand why Grove doesn't use words like "user" or "feature flag"
2. Learn the philosophy: "The Grove is the place. These are the things you find there."
3. Walk through a naming journey (Loom, Heartwood, Porch)
4. See how a name is tested: "Does it complete the tagline naturally?"
5. Appreciate that rejected names teach as much as chosen ones

**Featured Journeys:**
- **Porch** - The origin story. Support isn't a ticket system. It's a porch conversation. This journey created the naming ritual.
- **Lumen** - A difficult journey. Light vs. dark. The hollow center where everything flows, yet also illumination. Close between Lumen and Umbra—decided by trying names in sentences.
- **Loom** - A walk that returned home. "Sometimes you walk through the forest looking for something new... and realize the name you started with was right all along."

**Emotional Goal:** Visitors should feel how naming shapes the entire experience. Words create worlds.

---

### 8. The Glossary Alcove

**Theme:** Grove vocabulary demystified.

**Location:** `docs/museum/glossary.md`

| Term | Meaning | Why This Word |
|------|---------|---------------|
| **Wanderer** | Any visitor to Grove | Everyone is welcome, exploring |
| **Rooted** | Paid subscriber | Taking root, committed |
| **Pathfinder** | Trusted community guide | Helps others find their way |
| **Wayfinder** | Autumn (singular) | Shows the way forward |
| **Grafts** | Feature flags | Attaching new growth |
| **Curios** | Personalization features | Collected treasures |
| **Loom** | Durable Objects layer | Weaving coordination |
| **Heartwood** | Auth system | The core of trust |
| **Lattice** | The engine itself | Framework for growth |

---

## File Structure

```
docs/museum/
├── MUSEUM.md                    # Main entrance
├── architecture/
│   ├── WING.md                  # Wing introduction
│   ├── foundation.md            # Multi-tenant exhibit
│   ├── engine-room.md           # Engine-first pattern
│   ├── loom.md                  # Durable Objects
│   └── cloud-garden.md          # Cloudflare primitives
├── nature/
│   ├── WING.md
│   ├── forest.md                # Nature components
│   ├── seasons.md               # Seasonal theming
│   ├── glass-garden.md          # Glassmorphism
│   └── typography.md            # Fonts and accessibility
├── trust/
│   ├── WING.md
│   ├── heartwood.md             # Authentication
│   ├── sessions.md              # Session management
│   └── security.md              # Protection patterns
├── data/
│   ├── WING.md
│   ├── filing-cabinet.md        # D1 patterns
│   ├── quick-lookup.md          # KV caching
│   ├── media-vault.md           # R2 storage
│   └── query-builders.md        # Type-safe helpers
├── personalization/
│   ├── WING.md
│   ├── grafts.md                # Feature flags
│   ├── curios.md                # Old-web features
│   └── themes.md                # Customization
├── community/
│   ├── WING.md
│   ├── meadow.md                # Community feed
│   ├── landing.md               # Welcome experience
│   └── clearing.md              # Status transparency
├── naming/
│   ├── WING.md                  # The philosophy of naming
│   ├── the-walk.md              # The naming ritual
│   ├── journeys/                # Individual naming journeys
│   │   ├── porch.md             # Featured: Origin story
│   │   ├── lumen.md             # Featured: A difficult journey
│   │   └── loom.md              # Featured: Returning home
│   └── ecosystem.md             # The full naming map
└── glossary.md                  # Grove vocabulary
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

**Voice:** Warm, conversational, explains "why" before "how." No em-dashes. No corporate jargon.

---

## Agent Orchestration

The museum will be written by a swarm of agents, each responsible for one exhibit. An orchestrating agent guides the swarm, keeping threads from tangling.

### Required Reading

**Before drafting any exhibit, every agent MUST read:**

```
docs/philosophy/why-i-built-the-grove.md
```

This document explains why texture matters. Grove isn't just a platform—it's a reconstruction of a sanctuary that was lost. The forest is a backyard. Songbird is the robins at dawn. Wander mode is the freedom to pick a direction and walk. Every feature maps to something real.

Without understanding this, agents will write documentation. With it, they'll preserve texture.

### The Model

```
                    ┌─────────────────┐
                    │  ORCHESTRATOR   │
                    │                 │
                    │  Guides the     │
                    │  swarm, tracks  │
                    │  progress,      │
                    │  resolves       │
                    │  conflicts      │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
    ┌─────────┐        ┌─────────┐        ┌─────────┐
    │ Agent A │        │ Agent B │        │ Agent C │
    │         │        │         │        │         │
    │ Owns:   │        │ Owns:   │        │ Owns:   │
    │ seasons │        │ loom    │        │ grafts  │
    │ .md     │        │ .md     │        │ .md     │
    └─────────┘        └─────────┘        └─────────┘
         │                   │                   │
         └───────────────────┴───────────────────┘
                             │
                    Explore elsewhere to
                    understand connections
```

### Principles

1. **One exhibit, one agent.** Each agent owns exactly one exhibit file. This reduces context drift and keeps focus sharp.

2. **Explore broadly before writing.** Agents are strongly encouraged to wander the codebase, read related specs, understand how their exhibit connects to others. The goal is complete narrative understanding before writing a single line.

3. **The orchestrator doesn't write.** It coordinates. It tracks which exhibits are complete, identifies conflicts or overlaps, and ensures the museum tells a coherent story.

4. **Texture over thoroughness.** An exhibit that captures *why* something matters is better than one that explains every implementation detail. We're preserving the feeling of building something you're proud of.

### Agent Checklist

Before writing, each agent should:

- [ ] Read `docs/philosophy/why-i-built-the-grove.md`
- [ ] Read `docs/philosophy/grove-naming.md` (understand the vocabulary)
- [ ] Read the museum-documentation skill (`.claude/skills/museum-documentation/SKILL.md`)
- [ ] Explore the code/specs relevant to their exhibit
- [ ] Understand how their exhibit connects to at least two others
- [ ] Identify what makes their subject *textured*, not just functional

### Exhibit Assignments

| Exhibit | Wing | Key Sources |
|---------|------|-------------|
| foundation.md | Architecture | `docs/developer/architecture/multi-tenant-architecture.md` |
| engine-room.md | Architecture | `packages/engine/`, engine-first pattern |
| loom.md | Architecture | `docs/patterns/loom-durable-objects-pattern.md` |
| cloud-garden.md | Architecture | `wrangler.toml` files, Cloudflare docs |
| forest.md | Nature | `packages/engine/src/lib/ui/components/nature/` |
| seasons.md | Nature | `packages/engine/src/lib/ui/stores/season.ts` |
| glass-garden.md | Nature | `packages/engine/src/lib/ui/components/ui/Glass*` |
| typography.md | Nature | `packages/engine/src/lib/ui/components/typography/` |
| heartwood.md | Trust | `docs/specs/heartwood-spec.md` |
| sessions.md | Trust | `packages/engine/src/lib/groveauth/` |
| security.md | Trust | `packages/engine/src/lib/server/services/` |
| filing-cabinet.md | Data | `packages/engine/src/lib/server/services/database.ts` |
| quick-lookup.md | Data | `packages/engine/src/lib/server/services/cache.ts` |
| media-vault.md | Data | `packages/engine/src/lib/server/services/storage.ts` |
| query-builders.md | Data | Database helpers, typed queries |
| grafts.md | Personalization | `docs/specs/grafts-spec.md` |
| curios.md | Personalization | `docs/specs/curios-spec.md` |
| themes.md | Personalization | Settings system, Foliage |
| meadow.md | Community | `packages/meadow/` |
| landing.md | Community | `packages/landing/` |
| clearing.md | Community | `packages/clearing/` |
| WING.md (naming) | Naming | `docs/philosophy/grove-naming.md` |
| the-walk.md | Naming | `docs/philosophy/walking-through-the-grove.md` |
| porch.md | Naming | `docs/philosophy/naming-research/grove-journey.md` |
| lumen.md | Naming | `docs/philosophy/naming-research/ai-gateway-naming-journey.md` |
| loom.md (naming) | Naming | `docs/philosophy/naming-research/loom-grove-journey.md` |
| ecosystem.md | Naming | `docs/philosophy/grove-naming.md` ecosystem table |

---

## Priority Order

**Phase 1: Core Understanding**
1. MUSEUM.md (entrance)
2. Architecture Wing (foundation, engine-room)
3. Nature Wing (seasons, forest)
4. Naming Wing (philosophy, the-walk, featured journeys)
5. Glossary

**Phase 2: Trust & Data**
6. Trust Wing (heartwood, sessions)
7. Data Wing (filing-cabinet, query-builders)

**Phase 3: Personalization & Community**
8. Personalization Wing (grafts, curios)
9. Community Wing (meadow, landing)

---

## Success Criteria

A Wanderer who completes the museum tour should:

- [ ] Understand how multi-tenant architecture works
- [ ] Know why the engine-first pattern matters
- [ ] Feel the warmth behind nature component choices
- [ ] Grasp how authentication flows without fear
- [ ] Appreciate the caching strategy's elegance
- [ ] Understand why naming matters (words create worlds)
- [ ] Want to personalize their own blog
- [ ] Feel welcomed into the Grove community

---

*This plan transforms technical documentation into hospitality.*

*— Planned January 2026*
