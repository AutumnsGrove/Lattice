# The Lattice Museum: Layout Plan

> *A guided tour through how this forest grows.*

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
| **The Forest** | 64 nature SVG components: trees, creatures, weather | `ui/components/nature/` |
| **The Seasons** | Five seasons including Midnight easter egg | `ui/stores/season.ts` |
| **The Glass Garden** | Glassmorphism design system | `ui/components/ui/Glass*` |
| **The Typography Gallery** | 10 fonts including accessible options | `ui/components/typography/` |

**Visitor Journey:**
1. Meet the hand-drawn trees (Cherry, Pine, Aspen, Oak...)
2. Discover creatures that bring the forest alive (Bee, Butterfly, Deer...)
3. Experience seasons changing (Spring → Summer → Autumn → Winter)
4. Find the Midnight easter egg (queer aesthetic, deep purple)
5. See how glass surfaces layer over nature backgrounds
6. Explore accessible font choices (OpenDyslexic, Atkinson Hyperlegible)

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

### 7. The Glossary Alcove

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

## Priority Order

**Phase 1: Core Understanding**
1. MUSEUM.md (entrance)
2. Architecture Wing (foundation, engine-room)
3. Nature Wing (seasons, forest)
4. Glossary

**Phase 2: Trust & Data**
5. Trust Wing (heartwood, sessions)
6. Data Wing (filing-cabinet, query-builders)

**Phase 3: Personalization & Community**
7. Personalization Wing (grafts, curios)
8. Community Wing (meadow, landing)

---

## Success Criteria

A Wanderer who completes the museum tour should:

- [ ] Understand how multi-tenant architecture works
- [ ] Know why the engine-first pattern matters
- [ ] Feel the warmth behind nature component choices
- [ ] Grasp how authentication flows without fear
- [ ] Appreciate the caching strategy's elegance
- [ ] Want to personalize their own blog
- [ ] Feel welcomed into the Grove community

---

*This plan transforms technical documentation into hospitality.*

*— Planned January 2026*
