---
title: "Reverie — Natural Language Grove Configuration"
description: "The layer between dreams and form. Wanderers speak, and the grove reshapes itself."
category: specs
specCategory: "customization"
icon: sparkles
lastUpdated: "2026-03-01"
aliases: []
date created: Sunday, February 2nd 2026
date modified: Saturday, March 1st 2026
tags:
  - composition
  - ai
  - malleable-software
  - natural-language
  - configuration
type: tech-spec
---

# Reverie — Natural Language Grove Configuration

```
                           ☁
                    ·  ·       ·  ·
                ·                     ·
             ·    "make it cozy"         ·
           ·           │                   ·
          ·            ▼                    ·
         ·    ┌─────────────────┐           ·
        ·     │     REVERIE     │            ·
         ·    └────────┬────────┘           ·
          ·       ╱    │    ╲              ·
           ·    ╱      │      ╲          ·
            · ╱        │        ╲      ·
             ▼         ▼         ▼   ·
          🎨         🔤         🎵
         theme       font      ambient
         amber     calistoga   rain

              Half-dream, half-real.
              Yours.
```

> *Half-dream, half-real. Yours.*

Reverie is the natural language configuration layer for the entire Grove ecosystem. A Wanderer says "make my site feel like a midnight library" and Reverie knows which levers to pull across themes, fonts, colors, curios, and content. It bridges the gap between clicking buttons and writing code with something better: just saying what you want.

**Public Name:** Reverie
**Internal Name:** GroveReverie
**Domain:** `reverie.grove.place`
**Package:** `@autumnsgrove/reverie`
**Status:** Planning (Architecture Phase)
**Last Updated:** March 2026

A reverie is that state between waking and dreaming, when you're gazing at sunlight through branches and something forms in your mind's eye. Not a plan. A vision. Reverie takes your half-formed dreams and gives them shape across every surface of your grove.

---

## Overview

### What This Is

Reverie is a natural language interface for configuring every aspect of a Grove site. It turns plain English into coordinated API calls across 32 configuration domains, from theme selection to curio settings to content management. Wanderers at any skill level can reshape their grove by describing what they want.

### The Problem

Grove has 32 configuration domains with 150+ individually configurable fields spread across 3 databases and 53+ API endpoints. The admin panel (Arbor) organizes these into pages and forms, but:

| Level | What It Is | Skill Required |
|-------|------------|----------------|
| 1 | Pick a theme, toggle comments | None |
| 2 | Configure 22 curios, customize fonts, set up blazes | Moderate (find the right page) |
| 3 | ??? | ??? |
| 4 | Custom CSS, layout JSON, API calls | Developer skills |

The jump from Level 2 to Level 4 is a cliff. And even Level 2 is overwhelming. 32 domains means 32 different admin pages. A Wanderer who wants their site to "feel cozy" has to manually coordinate theme + accent color + font + cursor + ambient sound + guestbook style + mood ring. That's 7 separate pages for one feeling.

### The Solution

Reverie creates **Level 3**: describe what you want in natural language, and an AI agent coordinates the changes across all relevant domains.

```
"Make my site feel like a midnight library"
                    │
                    ▼
            ┌───────────────┐
            │    REVERIE     │
            │                │
            │  1. Route      │  Detect: theme + font + color + ambient + mood
            │  2. Load       │  Pull in 5 domain schemas (not all 32)
            │  3. Compose    │  Map "midnight library" to coordinated settings
            │  4. Preview    │  Show changes before applying
            │  5. Execute    │  Batch API calls to 5 endpoints
            │                │
            └───────────────┘
                    │
                    ▼
    Theme: Night Garden    Accent: Deep Plum
    Font: IBM Plex Mono    Ambient: rain, 20%
    Mood Ring: cool scheme
```

### Goals

- Any Wanderer can configure their grove through natural language
- Single requests can coordinate changes across multiple domains
- The AI agent sees only what it needs (progressive discovery, not schema overload)
- Changes are always previewed before applying
- Every action Reverie takes maps to a real API call a Wanderer could make manually

### Non-Goals

- Reverie does not replace the Arbor admin panel. It complements it.
- Reverie does not generate custom code (HTML, JS, Svelte components).
- Reverie does not modify billing or make payments. Billing is read-only.
- Reverie is not a chatbot. It is a configuration agent with a conversational interface.

---

## Design Philosophy

### Dreams, Not Specifications

Wanderers don't think in field names and JSON structures. They think in feelings:
- "Something cozy"
- "A hacker aesthetic"
- "Like a forest at dusk"

Reverie translates feelings into coordinated technical changes. The translation is invisible.

### Progressive Discovery, Not Schema Dump

The agent never sees all 32 domains at once. The router is small (~80 lines of keywords). It loads only the 1-5 domain schemas relevant to the current request. A request about fonts loads the typography schema. A request about "cozy" loads the atmosphere manifold. The agent's context stays lean.

### Batch, Not Stream

Reverie uses batch tool-calling (like Anthropic's programmatic tool use), not MCP server protocol. One request can fan out to 10+ domain schemas simultaneously. One execution step can call 5+ API endpoints in parallel. MCP's per-tool schema overhead makes the model do more work per step. Batch calling keeps it fast and focused.

### Guardrails, Not Walls

Every change Reverie makes is something a Wanderer could do manually in Arbor. Reverie respects tier limits, rate limits, and content policies. It previews changes before applying them. It never modifies billing, deletes content, or touches infrastructure settings without explicit confirmation.

---

## Architecture

```
                            WANDERER
                               │
                      "make it feel cozy"
                               │
                               ▼
┌──────────────────────────────────────────────────────────┐
│                       REVERIE                             │
│                                                          │
│   ┌──────────────┐                                       │
│   │   ROUTER     │  Intent detection, keyword matching   │
│   │   ~80 lines  │  Detects: domains, actions, moods     │
│   └──────┬───────┘                                       │
│          │                                               │
│          │  Matched domains: [theme, color, font,        │
│          │   cursor, ambient, guestbook, moodring]       │
│          ▼                                               │
│   ┌──────────────┐                                       │
│   │   LOADER     │  Batch-loads matched domain schemas   │
│   │              │  Only 1-7 of 32 domains per request   │
│   └──────┬───────┘                                       │
│          │                                               │
│          │  + Atmosphere Manifold (for mood keywords)     │
│          ▼                                               │
│   ┌──────────────┐                                       │
│   │   COMPOSER   │  Maps intent to concrete field values │
│   │              │  Generates change preview             │
│   └──────┬───────┘                                       │
│          │                                               │
│          │  Preview: "Here's what I'd change..."         │
│          ▼                                               │
│   ┌──────────────┐                                       │
│   │   EXECUTOR   │  Batch API calls to Grove endpoints   │
│   │              │  Validates, executes, reports          │
│   └──────────────┘                                       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### The Four Layers

**1. Router.** Intent detection and domain matching. Takes natural language input, extracts keywords, identifies which of the 32 domains are relevant. Detects mood/atmosphere keywords that trigger cross-domain composition. ~80 lines. Always loaded.

**2. Loader.** Schema retrieval. Fetches domain schemas for the matched domains. Each schema is ~30-50 lines of JSON describing the domain's fields, types, constraints, API endpoint, and natural language examples. Loads 1-7 schemas per request instead of all 32.

**3. Composer.** Change generation. Uses loaded schemas + atmosphere manifold entries to map the Wanderer's intent to concrete field values. Generates a change preview showing exactly what will change and why.

**4. Executor.** API dispatch. Takes the composed changes, validates against tier limits and constraints, calls Grove API endpoints in batch. Reports success/failure per domain.

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Router | TypeScript (Cloudflare Worker) | Edge execution, low latency |
| Domain Schemas | JSON catalog (static) | No runtime cost, versionable |
| Composer | Claude API (tool use) | Natural language understanding |
| Executor | Grove API (existing endpoints) | No new backend surface |
| Storage | D1 (existing tables) | Reuses existing schema |
| Auth | Heartwood session | Same auth as Arbor |

---

## The Router

The router is the entry point. It's small, fast, and always loaded.

### Intent Detection

The router classifies every input into one or more categories:

```typescript
interface RouterResult {
  // Which domains are relevant
  domains: DomainId[];

  // What kind of action is requested
  action: 'configure' | 'query' | 'create' | 'compose';

  // Did we detect mood/atmosphere keywords?
  atmosphere: string | null;

  // Raw extracted keywords for the composer
  keywords: string[];
}
```

### Keyword Mapping

```typescript
const DOMAIN_KEYWORDS: Record<string, DomainId[]> = {
  // Appearance
  'theme':       ['foliage.theme'],
  'dark mode':   ['foliage.theme'],
  'color':       ['foliage.accent', 'foliage.colors'],
  'accent':      ['foliage.accent'],
  'font':        ['foliage.typography'],
  'typography':  ['foliage.typography'],
  'css':         ['foliage.css'],
  'layout':      ['foliage.layout'],
  'cursor':      ['curios.cursor'],

  // Content
  'post':        ['content.posts'],
  'blog':        ['content.posts'],
  'page':        ['content.pages'],
  'blaze':       ['content.blazes'],
  'tag':         ['content.blazes'],
  'category':    ['content.blazes'],
  'draft':       ['content.posts'],
  'publish':     ['content.posts'],

  // Social
  'comment':     ['social.comments'],
  'meadow':      ['social.meadow'],
  'feed':        ['social.meadow'],
  'directory':   ['social.canopy'],
  'guestbook':   ['curios.guestbook'],
  'webring':     ['curios.webring'],
  'blogroll':    ['curios.blogroll'],

  // Curios
  'music':       ['curios.nowplaying'],
  'playing':     ['curios.nowplaying'],
  'mood':        ['curios.moodring'],
  'gallery':     ['curios.gallery'],
  'timeline':    ['curios.timeline'],
  'pulse':       ['curios.pulse'],
  'counter':     ['curios.hitcounter'],
  'ambient':     ['curios.ambient'],
  'sound':       ['curios.ambient'],
  'poll':        ['curios.polls'],
  'bookmark':    ['curios.bookmarks'],
  'shrine':      ['curios.shrines'],
  'badge':       ['curios.badges'],
  'status':      ['identity.activitystatus'],
  'links':       ['curios.linkgarden'],

  // Identity
  'name':        ['identity.profile'],
  'username':    ['identity.profile'],
  'profile':     ['identity.profile'],

  // Infra (read-only)
  'plan':        ['infra.billing'],
  'storage':     ['infra.billing'],
  'billing':     ['infra.billing'],
};
```

### Atmosphere Detection

When the router detects mood/feeling keywords, it flags them for the atmosphere manifold:

```typescript
const ATMOSPHERE_KEYWORDS: string[] = [
  'cozy', 'warm', 'midnight', 'dark', 'minimal', 'clean',
  'retro', 'pixel', 'hacker', 'dreamy', 'elegant', 'garden',
  'forest', 'ocean', 'sunset', 'professional', 'playful',
  'gothic', 'cottagecore', 'solarpunk', 'cyberpunk',
];
```

When an atmosphere keyword is detected, the router returns `atmosphere: 'cozy'` and loads the atmosphere manifold alongside the relevant domain schemas.

---

## The Atmosphere Manifold

The atmosphere manifold is the cross-domain composition layer. It maps aesthetic keywords to coordinated settings across multiple domains. When a Wanderer says "make it feel cozy," the manifold knows which 7 domains to touch and what values to set.

### Why "Atmosphere"

In a grove, the atmosphere is what you feel when you step inside. Morning light, evening mist, summer warmth, autumn chill. It's not one thing. It's everything working together. When the atmosphere shifts, every surface changes at once. That's exactly what cross-domain composition does.

### Manifold Structure

```typescript
interface AtmosphereEntry {
  /** Keyword that triggers this atmosphere */
  keyword: string;

  /** Human description for preview */
  description: string;

  /** Coordinated settings across domains */
  settings: {
    'foliage.theme'?: string;
    'foliage.accent'?: string;
    'foliage.typography'?: string;
    'curios.cursor.preset'?: string;
    'curios.cursor.trail'?: boolean;
    'curios.cursor.trailEffect'?: string;
    'curios.ambient.soundSet'?: string;
    'curios.ambient.volume'?: number;
    'curios.guestbook.style'?: string;
    'curios.moodring.colorScheme'?: string;
    [key: string]: string | number | boolean | undefined;
  };
}
```

### Manifold Entries

| Keyword | Theme | Accent | Font | Cursor | Ambient | Guestbook | Mood Ring |
|---------|-------|--------|------|--------|---------|-----------|-----------|
| **cozy** | Cozy Cabin | Golden Amber | Calistoga | leaf + sparkle | forest-rain, 20% | cozy | warm |
| **midnight** | Night Garden | Deep Plum | IBM Plex Mono | star + stardust | night-crickets, 15% | modern | cool |
| **garden** | Grove | Grove Green | Quicksand | leaf | — | classic | forest |
| **retro** | Typewriter | Cardinal Red | Cozette | — | — | pixel | default |
| **elegant** | Minimal | Lavender | Plus Jakarta Sans | — | — | modern | cool |
| **dreamy** | Solarpunk | Violet Purple | Caveat | sparkle + glow | ocean-waves, 15% | cozy | sunset |
| **hacker** | Night Garden | Grove Green | IBM Plex Mono | — | — | pixel | cool |
| **cottagecore** | Cozy Cabin | Tulip Pink | Caveat | leaf + sparkle | forest-rain, 25% | cozy | warm |
| **ocean** | Minimal | Ocean Blue | Quicksand | — | ocean-waves, 20% | modern | cool |
| **sunset** | Grove | Sunset Ember | Calistoga | — | — | classic | warm |
| **forest** | Grove | Meadow Green | Lexend | leaf | forest-rain, 15% | classic | forest |
| **solarpunk** | Solarpunk | Meadow Green | Plus Jakarta Sans | leaf | — | modern | forest |

The manifold is ~50-80 lines of static configuration. It ships with Reverie and can be expanded over time without code changes.

### Atmosphere Composition Flow

```
"Make my site feel like a midnight library"
                    │
     Router detects: "midnight" (atmosphere)
                    + "library" (no direct domain match)
                    │
                    ▼
     Load atmosphere manifold entry: "midnight"
                    │
     Manifold returns coordinated settings:
       theme → Night Garden
       accent → Deep Plum
       font → IBM Plex Mono
       cursor → star + stardust trail
       ambient → night crickets at 15%
       guestbook → modern style
       mood ring → cool scheme
                    │
     Composer refines: "library" modifier
       → keeps IBM Plex Mono (fits)
       → adjusts ambient → quiet (10% volume)
                    │
     Preview generated, Wanderer confirms
                    │
     Executor: 6 parallel API calls
```

### Partial Atmospheres

Not every atmosphere entry fills every field. If a Wanderer already has a cursor they love, the manifold won't override it unless they explicitly ask. The composer respects existing configuration:

- **Full apply**: "Make my site cozy" → apply all manifold settings
- **Partial apply**: "Make my colors cozy" → only apply theme + accent from manifold
- **Additive**: "Add a cozy vibe to my ambient" → only touch ambient settings

---

## Domain Schema Standard

Each of the 32 configuration domains exposes a schema that tells Reverie what it can configure. Schemas are static JSON. They never change at runtime.

### Schema Structure

```typescript
interface DomainSchema {
  /** Unique domain identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** What this domain controls, in one sentence */
  description: string;

  /** Territory group for organization */
  group: 'identity' | 'appearance' | 'content' | 'social' | 'curios' | 'infra';

  /** API endpoint for reading current state */
  readEndpoint: string;

  /** API endpoint for writing changes (null = read-only) */
  writeEndpoint: string | null;

  /** HTTP method for writes */
  writeMethod: 'PUT' | 'POST' | 'PATCH';

  /** Configurable fields */
  fields: Record<string, FieldDefinition>;

  /** Natural language examples for the composer */
  examples: string[];
}

interface FieldDefinition {
  /** Field type */
  type: 'string' | 'boolean' | 'integer' | 'enum' | 'color' | 'json' | 'url';

  /** Human description */
  description: string;

  /** Allowed values for enums */
  options?: string[];

  /** Default value */
  default?: string | number | boolean;

  /** Validation constraints */
  constraints?: {
    min?: number;
    max?: number;
    maxLength?: number;
    pattern?: string;
  };

  /** Is this field writable? */
  readonly?: boolean;
}
```

### Example Domain Schema

```json
{
  "id": "foliage.accent",
  "name": "Accent Color",
  "description": "The primary accent color used across links, buttons, and interactive elements.",
  "group": "appearance",
  "readEndpoint": "GET /api/admin/settings?key=accent_color",
  "writeEndpoint": "PUT /api/admin/settings",
  "writeMethod": "PUT",
  "fields": {
    "accentColor": {
      "type": "color",
      "description": "Hex color value for the site accent",
      "default": "#16a34a",
      "constraints": {
        "pattern": "^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$"
      }
    }
  },
  "examples": [
    "Change my accent color to lavender",
    "Make my links purple",
    "Use a warm amber color"
  ]
}
```

### Schema Size Budget

Each schema is 30-50 lines of JSON. The full catalog of 32 schemas totals ~1,200 lines. But the agent never sees more than 5-7 schemas per request (~150-350 lines). Combined with the router (~80 lines), the total context per request stays under 500 lines. That's lean enough for fast, focused responses.

---

## Domain Catalog

32 domains organized into 6 territory groups. Each domain has a unique ID, its database home, and a complexity rating.

### Group 1: Identity (3 domains)

| Domain ID | Name | DB | Complexity | Fields |
|-----------|------|-----|-----------|--------|
| `identity.profile` | Profile & Identity | engine | Simple | 4 |
| `identity.activitystatus` | Activity Status | curios | Simple | 6 |
| `identity.badges` | Badges & Achievements | curios | Medium | 3+ CRUD |

### Group 2: Appearance (6 domains)

| Domain ID | Name | DB | Complexity | Fields |
|-----------|------|-----|-----------|--------|
| `foliage.theme` | Theme Selection | engine | Medium | 3 |
| `foliage.accent` | Accent Color | engine | Simple | 1 |
| `foliage.typography` | Typography & Fonts | engine | Medium | 3 |
| `foliage.colors` | Custom Color Palette | engine | Deep | 1 (JSON) |
| `foliage.css` | Custom CSS | engine | Deep | 1 (string) |
| `curios.cursor` | Cursor & Trails | curios | Simple | 6 |

### Group 3: Content (3 domains)

| Domain ID | Name | DB | Complexity | Fields |
|-----------|------|-----|-----------|--------|
| `content.posts` | Posts / Blooms | engine | Deep | 12 |
| `content.pages` | Pages | engine | Medium | 7 |
| `content.blazes` | Blazes (Categories) | engine | Medium | 5 + CRUD |

### Group 4: Social (6 domains)

| Domain ID | Name | DB | Complexity | Fields |
|-----------|------|-----|-----------|--------|
| `social.comments` | Comment Settings | engine | Simple | 7 |
| `social.meadow` | Meadow (Community Feed) | engine | Simple | 2 |
| `social.canopy` | Canopy Directory | engine | Simple | 4 |
| `curios.guestbook` | Guestbook | curios | Medium | 7+ |
| `curios.webring` | Webring | curios | Simple | 7 |
| `curios.blogroll` | Blogroll | curios | Medium | 5 + CRUD |

### Group 5: Curios (11 domains)

| Domain ID | Name | DB | Complexity | Fields |
|-----------|------|-----|-----------|--------|
| `curios.moodring` | Mood Ring | curios | Medium | 6 |
| `curios.gallery` | Gallery | curios | Deep | 14 |
| `curios.nowplaying` | Now Playing | curios | Medium | 6 |
| `curios.timeline` | Timeline | curios | Deep | 10 |
| `curios.journey` | Journey | curios | Medium | 7 |
| `curios.pulse` | Pulse | curios | Medium | 9 |
| `curios.hitcounter` | Hit Counter | curios | Simple | 6 |
| `curios.linkgarden` | Link Garden | curios | Medium | 3 + CRUD |
| `curios.polls` | Polls | curios | Medium | 6 + CRUD |
| `curios.ambient` | Ambient Sounds | curios | Simple | 4 |
| `curios.bookmarks` | Bookmark Shelf | curios | Medium | 6 + CRUD |

### Group 6: Infrastructure (2 domains, read-only)

| Domain ID | Name | DB | Complexity | Fields |
|-----------|------|-----|-----------|--------|
| `infra.billing` | Billing & Plan | engine | Read-only | 5 |
| `infra.flags` | Feature Flags | engine | Read-only | 2 |

### Excluded from Reverie

These domains exist in Grove but are explicitly outside Reverie's scope:

- **Shrines.** Content composition, better handled by a dedicated editor.
- **Clipart Placements.** Spatial positioning, better handled by Terrarium.
- **Artifacts.** Complex JSON config, better handled by dedicated UI.
- **Custom Fonts.** File upload workflow, requires manual interaction.
- **Moderation.** Safety-critical, must remain admin-only.
- **Secrets/Credentials.** Security-critical, must remain manual.

---

## The Executor

The executor translates composed changes into real API calls.

### Batch Execution

```typescript
interface ExecutionPlan {
  /** Changes grouped by API endpoint */
  changes: ExecutionStep[];

  /** Preview text for the Wanderer */
  preview: string;

  /** Estimated impact */
  domainsAffected: number;
  fieldsChanged: number;
}

interface ExecutionStep {
  domain: DomainId;
  endpoint: string;
  method: 'GET' | 'PUT' | 'POST' | 'PATCH' | 'DELETE';
  payload: Record<string, unknown>;
  description: string;
}
```

### Execution Flow

```
Composed changes
       │
       ▼
┌─────────────┐
│  VALIDATE   │  Check tier limits, constraints, permissions
│             │  Reject if any step would fail
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  PREVIEW    │  Generate human-readable change summary
│             │  "I'll change your theme to Night Garden,
│             │   accent to Deep Plum, and font to IBM Plex Mono"
└──────┬──────┘
       │
       ▼
  Wanderer confirms
       │
       ▼
┌─────────────┐
│  EXECUTE    │  Parallel API calls via Promise.allSettled()
│             │  Each call is independent
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  REPORT     │  "Done! Changed 3 settings across 2 domains.
│             │   Theme: Night Garden ✓
│             │   Accent: Deep Plum ✓
│             │   Font: IBM Plex Mono ✓"
└─────────────┘
```

### Error Handling

Each API call in the batch is independent. If one fails, the others still succeed. The report shows per-domain status:

```
Theme: Night Garden       ✓
Accent: Deep Plum         ✓
Font: IBM Plex Mono       ✗ (requires Sapling tier)
Ambient: night crickets   ✓
```

Reverie never silently fails. Every change is reported.

---

## Tier Access

| Tier | Reverie Capabilities |
|------|---------------------|
| **Free** | No Reverie access (manual Arbor only) |
| **Seedling** | Pre-made atmosphere templates, basic domain queries |
| **Sapling** | Full natural language configuration, atmosphere composition |
| **Oak** | Everything + save custom atmosphere entries |
| **Evergreen** | Everything + priority processing, extended rate limits |

### Rate Limits

| Tier | Requests/Hour | Domains/Request |
|------|-------------|-----------------|
| Seedling | 10 | 3 |
| Sapling | 30 | 7 |
| Oak | 60 | 15 |
| Evergreen | 120 | 32 (all) |

---

## Security Considerations

### Authentication

Reverie uses the same Heartwood session as Arbor. No separate auth flow. The Wanderer must be logged in and have an active session with a valid tenant.

### Tenant Isolation

Every API call Reverie makes includes the tenant ID from the session. Reverie cannot configure another Wanderer's grove. The existing API layer handles tenant scoping.

### Read-Only Domains

Billing and feature flags are read-only in Reverie. The domain schemas for these domains have `writeEndpoint: null`. The executor refuses to write to read-only domains.

### Destructive Actions

Reverie requires explicit confirmation before:
- Deleting content (posts, pages, blazes)
- Disabling major features (comments, meadow, curios)
- Overriding custom CSS or theme settings

The preview step is mandatory for all writes. There is no "just do it" mode.

### Input Validation

All values Reverie generates are validated against domain schema constraints before execution. A color must match the hex pattern. An enum must be in the options list. An integer must be within min/max bounds. Invalid values are rejected at the composer level, before the executor runs.

### Content Safety

Natural language input passes through the existing Thorn text moderation layer before processing. Reverie refuses to set display names, status text, or blaze labels that violate content policies.

---

## User Experience Flows

### Flow 1: Simple Configuration

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  👤 "Change my accent color to lavender"               │
│                                                        │
│  🌙 I'll change your accent color to Lavender          │
│     (#a78bfa). This affects links, buttons,            │
│     and interactive elements across your grove.        │
│                                                        │
│     [ Apply ]           [ Pick Different Color ]       │
│                                                        │
│  👤 clicks Apply                                       │
│                                                        │
│  🌙 Done! Accent color updated to Lavender. ✓         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Flow 2: Atmosphere Composition

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  👤 "Make my site feel like a cozy bookshop"           │
│                                                        │
│  🌙 I found a "cozy" atmosphere that would work        │
│     well for a bookshop feeling. Here's what           │
│     I'd change:                                        │
│                                                        │
│     Theme ............ Cozy Cabin                      │
│     Accent color ..... Golden Amber (#d97706)          │
│     Font ............. Calistoga                        │
│     Cursor ........... leaf with sparkle trail          │
│     Ambient .......... forest rain at 20%              │
│     Guestbook ........ cozy style                      │
│     Mood ring ........ warm color scheme               │
│                                                        │
│     This changes 7 settings across 6 domains.          │
│                                                        │
│     [ Apply All ]   [ Pick & Choose ]   [ Cancel ]     │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Flow 3: Content Management

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  👤 "Create a blaze called 'Tea Reviews' with a        │
│      cup icon in amber"                                │
│                                                        │
│  🌙 I'll create a new blaze:                           │
│                                                        │
│     Label .... Tea Reviews                             │
│     Icon ..... Coffee (closest cup icon in Lucide)     │
│     Color .... amber                                   │
│     Slug ..... tea-reviews                              │
│                                                        │
│     [ Create ]           [ Change Icon ]               │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Flow 4: Query (Read-Only)

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  👤 "What plan am I on? How much storage have I used?" │
│                                                        │
│  🌙 You're on the Sapling plan.                        │
│                                                        │
│     Plan ............. Sapling                          │
│     Status ........... Active                           │
│     Storage used ..... 1.2 GB of 5 GB (24%)           │
│     Billing cycle .... Renews March 15                 │
│                                                        │
│     To change your plan, visit grove.place/pricing.    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Data Storage

Reverie reuses existing Grove tables for all configuration. It does not create new tables for domain settings. The only new storage is for saved atmospheres and interaction history.

### Saved Atmospheres

For Oak+ tier Wanderers who create custom atmosphere entries:

```sql
CREATE TABLE reverie_atmospheres (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  description TEXT,
  settings TEXT NOT NULL,          -- JSON: { "foliage.theme": "...", ... }
  is_public INTEGER DEFAULT 0,    -- Shareable (Oak+)
  use_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_reverie_atm_tenant_kw
  ON reverie_atmospheres(tenant_id, keyword);
```

### Interaction Log

For improving Reverie over time:

```sql
CREATE TABLE reverie_interactions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  input_text TEXT NOT NULL,
  domains_matched TEXT NOT NULL,   -- JSON array of domain IDs
  atmosphere_used TEXT,            -- Atmosphere keyword if used
  changes_applied TEXT,            -- JSON: fields that were changed
  success INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_reverie_interactions_tenant
  ON reverie_interactions(tenant_id, created_at);
```

---

## Integration Points

### With Foliage (Theme System)

Reverie is the primary consumer of Foliage configuration APIs. Theme selection, accent color, custom colors, typography, custom CSS, and layout all flow through Foliage's existing endpoints. Reverie adds natural language on top. It does not bypass Foliage.

Related spec: [Foliage Project Spec](foliage-project-spec.md)

### With Curios (Widget System)

Reverie can configure any curio that has an admin API. This covers 18 curio types from mood rings to galleries. Curio configuration is always tenant-scoped and follows existing rate limits.

Related spec: [Curios Spec](curios-spec.md)

### With Arbor (Admin Panel)

Reverie and Arbor are complementary interfaces to the same configuration. Every change Reverie makes is visible in Arbor. Every setting in Arbor can be changed through Reverie. They share API endpoints and data models.

Related spec: [Arbor Spec](arbor-spec.md)

### With Terrarium (Creative Canvas)

Terrarium handles spatial composition (drag-drop component placement). Reverie handles configuration (settings, toggles, values). They're separate concerns. A future integration could let Reverie generate Terrarium scenes from natural language, but that's Phase 5.

Related spec: [Terrarium Spec](terrarium-spec.md)

### With Meadow (Community)

Reverie can toggle meadow participation and configure per-post visibility. Community-wide settings remain admin-only.

Related spec: [Meadow Spec](meadow-spec.md)

### With Mycelium (MCP Server)

Reverie does NOT use MCP protocol for its core interface. However, Mycelium could expose a `reverie_configure` tool that delegates to Reverie's batch API. This gives Claude Code users access to Reverie through the MCP bridge.

Related spec: [Mycelium Spec](mycelium-spec.md)

### With Heartwood (Auth)

Reverie inherits Heartwood sessions. No separate auth. The tenant ID and tier information come from the existing session context.

Related spec: [Heartwood Spec](heartwood-spec.md)

---

## Implementation Phases

### Phase 1: Foundation (Router + Schemas + Executor)

Build the core pipeline that can handle single-domain, direct requests.

- [ ] Define domain schema JSON format
- [ ] Write schemas for Phase 1 domains: `foliage.accent`, `foliage.typography`, `identity.profile`, `social.comments`, `social.meadow`
- [ ] Build the router with keyword matching
- [ ] Build the executor with batch API calling
- [ ] Build the preview/confirmation flow
- [ ] Wire up Heartwood auth
- [ ] Deploy as Cloudflare Worker

### Phase 2: Appearance Trifecta

Add the high-value appearance domains and the atmosphere manifold.

- [ ] Write schemas: `foliage.theme`, `foliage.colors`, `foliage.css`, `foliage.layout`
- [ ] Build the atmosphere manifold with 12 initial entries
- [ ] Implement cross-domain composition in the composer
- [ ] Add "Pick & Choose" partial application
- [ ] Write schemas: `curios.cursor`, `curios.ambient`

### Phase 3: Content & Social

Add content management and the social layer.

- [ ] Write schemas: `content.posts`, `content.pages`, `content.blazes`
- [ ] Implement CRUD actions (create/update/delete) in the executor
- [ ] Write schemas: `curios.guestbook`, `curios.blogroll`, `social.canopy`
- [ ] Add confirmation gates for destructive actions (delete)

### Phase 4: Full Curio Coverage

Add all remaining curio domains.

- [ ] Write schemas: `curios.moodring`, `curios.nowplaying`, `curios.gallery`
- [ ] Write schemas: `curios.timeline`, `curios.journey`, `curios.pulse`
- [ ] Write schemas: `curios.hitcounter`, `curios.linkgarden`, `curios.polls`
- [ ] Write schemas: `curios.bookmarks`, `curios.badges`
- [ ] Write schemas: `identity.activitystatus`
- [ ] Add read-only schemas: `infra.billing`, `infra.flags`

### Phase 5: Polish & Expansion

- [ ] Custom atmosphere creation (Oak+ tier)
- [ ] Atmosphere sharing marketplace
- [ ] Interaction logging and analytics
- [ ] Mycelium bridge (MCP tool)
- [ ] Terrarium scene generation from natural language
- [ ] Reverie chat UI in Arbor

---

## Success Criteria

1. **Natural language works.** "Change my font to something handwritten" results in Caveat being applied.
2. **Cross-domain composition works.** "Make my site cozy" touches 5+ domains in one request.
3. **Progressive discovery works.** The agent's context stays under 500 lines per request.
4. **Batch execution works.** 5+ API calls complete in under 2 seconds total.
5. **Preview is always shown.** No changes apply without Wanderer confirmation.
6. **Existing APIs are reused.** Zero new backend endpoints (Reverie calls existing Grove APIs).
7. **Tier limits are respected.** A Seedling cannot access Oak features through Reverie.

---

## References

- [Reverie Expansion Safari](../safaris/active/reverie-expansion-safari.md), full territory survey of all 32 domains
- [Foliage Project Spec](foliage-project-spec.md), theme system
- [Curios Spec](curios-spec.md), widget system
- [Terrarium Spec](terrarium-spec.md), creative canvas
- [Mycelium Spec](mycelium-spec.md), MCP server
- [Heartwood Spec](heartwood-spec.md), authentication
- [Blazes Spec](blazes-spec.md), content categories
- [Meadow Spec](meadow-spec.md), community feed
- [Arbor Spec](arbor-spec.md), admin panel
- [Canopy Spec](canopy-spec.md), directory
- [Ink & Switch: Malleable Software](https://www.inkandswitch.com/essay/malleable-software/)

---

*The morning light shifts. The grove reshapes itself. You didn't write a single line of code. You just said what you wanted, and the forest listened.*

*Half-dream, half-real. Yours.*
